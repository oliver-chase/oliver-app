'use client'
import { useState, useRef } from 'react'
import { upsertProject, deleteRecord, newId, today } from '@/lib/db'
import type { Project, AppState } from '@/types'
import { Picker, MultiPicker } from './Picker'

const STATUS_OPTIONS: Project['status'][] = ['Active', 'Complete', 'On Hold']

function statusClass(status: Project['status']) {
  const map: Record<string, string> = {
    Active: 'app-badge app-badge-active',
    Complete: 'app-badge app-badge-complete',
    'On Hold': 'app-badge app-badge-hold',
  }
  return (map[status] || 'app-badge') + ' app-badge--clickable'
}

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function ProjectsSection({ accountId, data, setData }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const projects = data.projects
    .filter(p => p.account_id === accountId)
    .sort((a, b) => b.created_date.localeCompare(a.created_date))

  const stakeholderOptions = data.stakeholders
    .filter(s => s.account_id === accountId)
    .map(s => s.stakeholder_id)

  const stakeholderName = (id: string) => {
    const s = data.stakeholders.find(x => x.stakeholder_id === id)
    return s ? s.name : id
  }

  const save = async (p: Project) => {
    setData(prev => ({ ...prev, projects: prev.projects.map(x => x.project_id === p.project_id ? p : x) }))
    await upsertProject(p)
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) { nameInputRef.current?.focus(); return }
    const p: Project = {
      project_id: newId('PROJ'), account_id: accountId, engagement_id: '',
      project_name: name, status: 'Active', client_stakeholder_ids: [],
      notes: '', year: String(new Date().getFullYear()), created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, projects: [p, ...prev.projects] }))
    await upsertProject(p)
    setNewName(''); setAdding(false)
  }

  const remove = async (p: Project) => {
    if (!window.confirm('Delete this project?')) return
    setData(prev => ({ ...prev, projects: prev.projects.filter(x => x.project_id !== p.project_id) }))
    await deleteRecord('projects', 'project_id', p.project_id)
  }

  const moveToOpp = async (p: Project) => {
    const { upsertOpportunity } = await import('@/lib/db')
    const opp = {
      opportunity_id: newId('OPP'), account_id: accountId, engagement_id: p.engagement_id,
      description: p.project_name, status: 'Identified' as const, owners: [],
      value: '', close_date: '', year: p.year, notes: p.notes,
      created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, opportunities: [opp, ...prev.opportunities] }))
    await upsertOpportunity(opp)
    await remove(p)
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <button className="btn-acct-action" onClick={() => { setAdding(true); setTimeout(() => nameInputRef.current?.focus(), 50) }}>
          + Add Project
        </button>
      </div>

      {adding && (
        <div className="inline-form" style={{ marginBottom: 12 }}>
          <div className="inline-form-title">New Project</div>
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              ref={nameInputRef}
              className="form-input field-required-highlight"
              placeholder="Project name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
            />
          </div>
          <div className="inline-form-actions">
            <button className="btn-acct-action" onClick={add}>Save</button>
            <button className="btn-acct-action" onClick={() => { setAdding(false); setNewName('') }}>Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !adding && <div className="empty-state">No projects yet</div>}

      <div className="project-grid">
        {projects.map(p => (
          <ProjectCard
            key={p.project_id}
            project={p}
            stakeholderOptions={stakeholderOptions}
            stakeholderName={stakeholderName}
            onSave={save}
            onDelete={remove}
            onMoveToOpp={moveToOpp}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, stakeholderOptions, stakeholderName, onSave, onDelete, onMoveToOpp }: {
  project: Project
  stakeholderOptions: string[]
  stakeholderName: (id: string) => string
  onSave: (p: Project) => Promise<void>
  onDelete: (p: Project) => Promise<void>
  onMoveToOpp: (p: Project) => Promise<void>
}) {
  const nameRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)

  const stakeholderLabels = project.client_stakeholder_ids.map(stakeholderName)
  const stakeholderLabelToId = (label: string) => {
    const match = stakeholderOptions.find(id => stakeholderName(id) === label)
    return match || label
  }

  return (
    <div className="project-card">
      <div className="card-title-row">
        <div
          ref={nameRef}
          className="card-title proj-name"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const v = nameRef.current?.textContent?.trim() || ''
            if (v !== project.project_name) onSave({ ...project, project_name: v || project.project_name, last_updated: today() })
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
        >
          {project.project_name}
        </div>
        <div className="card-status-wrap">
          <Picker
            value={project.status}
            options={STATUS_OPTIONS as unknown as string[]}
            triggerClass={statusClass(project.status)}
            onChange={v => onSave({ ...project, status: v as Project['status'], last_updated: today() })}
          />
        </div>
      </div>

      <div className="proj-meta">
        <MultiPicker
          values={stakeholderLabels}
          options={stakeholderOptions.map(stakeholderName)}
          placeholder="No stakeholders"
          onChange={labels => onSave({ ...project, client_stakeholder_ids: labels.map(stakeholderLabelToId), last_updated: today() })}
        />
        {' · '}
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray)' }}>{project.year || '—'}</span>
      </div>

      <div
        ref={notesRef}
        className="notes-text"
        contentEditable
        suppressContentEditableWarning
        onBlur={() => {
          const v = notesRef.current?.textContent?.trim() || ''
          if (v !== project.notes) onSave({ ...project, notes: v, last_updated: today() })
        }}
      >
        {project.notes || <span style={{ color: 'var(--gray)', fontStyle: 'italic' }}>Notes…</span>}
      </div>

      <button className="card-action-link" onClick={() => onMoveToOpp(project)}>Move back to Opportunities</button>

      <button className="project-delete" onClick={() => onDelete(project)}>×</button>
    </div>
  )
}
