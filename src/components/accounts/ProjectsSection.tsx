'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertProject, upsertOpportunity, deleteRecord, newId, today, toArray } from '@/lib/db'
import type { Project, AppState } from '@/types'
import { MultiPicker } from './Picker'

const PROJ_STATUS: Project['status'][] = ['Active', 'Complete', 'On Hold']
const statusBadgeClass = (s: string) => {
  const map: Record<string, string> = { Active: 'active', Complete: 'complete', 'On Hold': 'hold' }
  return 'app-badge app-badge--clickable proj-status app-badge-' + (map[s] || 'active')
}

const PH_NOTES = 'Add notes…'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function ProjectsSection({ accountId, data, setData }: Props) {
  const [adding, setAdding] = useState(false)
  const [hideComplete, setHideComplete] = useState(false)
  const [sortBy, setSortBy] = useState('created_date')

  const projects = data.projects
    .filter(p => p.account_id === accountId)
    .filter(p => !hideComplete || p.status !== 'Complete')
    .sort((a, b) => {
      if (sortBy === 'project_name') return a.project_name.localeCompare(b.project_name)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return b.created_date.localeCompare(a.created_date)
    })

  const clientStakeholders = data.stakeholders.filter(
    s => s.account_id === accountId && (s.organization || '').toLowerCase() !== 'v.two'
  )

  const save = async (p: Project) => {
    setData(prev => ({ ...prev, projects: prev.projects.map(x => x.project_id === p.project_id ? p : x) }))
    await upsertProject(p)
  }

  const add = (p: Project) => {
    setData(prev => ({ ...prev, projects: [p, ...prev.projects] }))
    setAdding(false)
  }

  const remove = async (p: Project) => {
    if (!window.confirm('Delete this project?')) return
    setData(prev => ({ ...prev, projects: prev.projects.filter(x => x.project_id !== p.project_id) }))
    await deleteRecord('projects', 'project_id', p.project_id)
  }

  const moveToOpp = async (p: Project) => {
    const statusMap: Record<string, string> = { Active: 'Pursuing', 'On Hold': 'Identified', Complete: 'Won' }
    const opp = {
      opportunity_id: newId('OPP'), account_id: accountId, engagement_id: p.engagement_id,
      description: p.project_name, status: (statusMap[p.status] || 'Identified') as 'Identified' | 'Pursuing' | 'Won' | 'Lost',
      owners: [], value: '', close_date: '', year: p.year, notes: p.notes,
      created_date: today(), last_updated: today(),
    }
    setData(prev => ({
      ...prev,
      opportunities: [opp, ...prev.opportunities],
      projects: prev.projects.filter(x => x.project_id !== p.project_id),
    }))
    await upsertOpportunity(opp)
    await deleteRecord('projects', 'project_id', p.project_id)
  }

  return (
    <div>
      <div className="app-section-header">
        <div className="app-section-title">Projects</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-link" onClick={() => setAdding(true)}>+ Add project</button>
          </div>
          <div className="section-actions">
            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort projects"
            >
              <option value="created_date">Newest first</option>
              <option value="project_name">Name A–Z</option>
              <option value="status">By status</option>
            </select>
            <button
              className={'filter-chip' + (hideComplete ? ' on' : '')}
              onClick={() => setHideComplete(s => !s)}
            >
              {hideComplete ? 'Show Complete' : 'Hide Complete'}
            </button>
          </div>
        </div>
      </div>

      {projects.length === 0 && !adding && <div className="empty-state">No results</div>}

      <div className="project-grid">
        {adding && (
          <InlineProjCard
            accountId={accountId}
            clientStakeholders={clientStakeholders}
            onSaved={add}
            onDiscard={() => setAdding(false)}
          />
        )}
        {projects.map(p => (
          <ProjCard
            key={p.project_id}
            project={p}
            clientStakeholders={clientStakeholders}
            onSave={save}
            onDelete={remove}
            onMoveToOpp={moveToOpp}
          />
        ))}
      </div>
    </div>
  )
}

function ProjCard({ project, clientStakeholders, onSave, onDelete, onMoveToOpp }: {
  project: Project
  clientStakeholders: Array<{ stakeholder_id: string; name: string }>
  onSave: (p: Project) => Promise<void>
  onDelete: (p: Project) => Promise<void>
  onMoveToOpp: (p: Project) => Promise<void>
}) {
  const nameRef = useRef<HTMLDivElement>(null)
  const yearRef = useRef<HTMLSpanElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState(project.status)

  const cycleStatus = async () => {
    const next = PROJ_STATUS[(PROJ_STATUS.indexOf(status) + 1) % PROJ_STATUS.length]
    setStatus(next)
    await onSave({ ...project, status: next, last_updated: today() })
  }

  const stkLabel = (ids: string[]) => {
    if (!ids.length) return 'Select people'
    return ids.map(id => clientStakeholders.find(s => s.stakeholder_id === id)?.name || id).join(', ')
  }

  const stkOptions = clientStakeholders.map(s => s.name)
  const stkNameToId = (name: string) => clientStakeholders.find(s => s.name === name)?.stakeholder_id || name
  const stkIdToName = (id: string) => clientStakeholders.find(s => s.stakeholder_id === id)?.name || id

  return (
    <div className="project-card" title={'Last updated: ' + (project.last_updated || '')}>
      <div className="card-title-row">
        <div
          ref={nameRef}
          className="card-title"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Project name"
          onBlur={() => {
            const v = nameRef.current?.textContent?.trim() || ''
            if (v !== project.project_name) onSave({ ...project, project_name: v || project.project_name, last_updated: today() })
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
        >
          {project.project_name}
        </div>
        <div className="card-status-wrap">
          <span
            className={statusBadgeClass(status)}
            role="button"
            tabIndex={0}
            onClick={cycleStatus}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleStatus() } }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Year */}
      <div className="card-meta-row">
        <span className="card-meta-label">Year:</span>
        <span
          ref={yearRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Year"
          data-placeholder="e.g. 2026"
          onBlur={() => {
            const v = yearRef.current?.textContent?.trim() || ''
            if (v !== project.year) onSave({ ...project, year: v || String(new Date().getFullYear()), last_updated: today() })
            if (!v && yearRef.current) yearRef.current.textContent = String(new Date().getFullYear())
          }}
        >
          {project.year || String(new Date().getFullYear())}
        </span>
      </div>

      {/* Client stakeholders */}
      <div className="card-meta-row">
        <span className="card-meta-label">Client stakeholder(s):</span>
        <MultiPicker
          values={toArray(project.client_stakeholder_ids).map(stkIdToName)}
          options={stkOptions}
          placeholder="Select people"
          triggerClass="picker-btn"
          triggerStyle={{ border: 'none', background: 'transparent', fontSize: 'var(--font-size-xs)', padding: '2px 4px', minHeight: 18, color: 'var(--gray)', borderRadius: 3, cursor: 'pointer', textAlign: 'left', fontStyle: toArray(project.client_stakeholder_ids).length ? undefined : 'italic' }}
          onChange={names => onSave({ ...project, client_stakeholder_ids: names.map(stkNameToId), last_updated: today() })}
        />
      </div>

      {/* Notes */}
      <div className="card-section-label">NOTES</div>
      <div
        ref={notesRef}
        className="card-body-text"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Notes"
        style={!project.notes ? { fontStyle: 'italic' } : undefined}
        onFocus={() => { if (!project.notes && notesRef.current && notesRef.current.textContent === PH_NOTES) { notesRef.current.textContent = ''; notesRef.current.style.fontStyle = '' } }}
        onBlur={() => {
          const v = notesRef.current?.textContent?.trim() || ''
          if (!v || v === PH_NOTES) {
            if (notesRef.current) { notesRef.current.textContent = PH_NOTES; notesRef.current.style.fontStyle = 'italic' }
            if (project.notes) onSave({ ...project, notes: '', last_updated: today() })
          } else if (v !== project.notes) {
            if (notesRef.current) notesRef.current.style.fontStyle = ''
            onSave({ ...project, notes: v, last_updated: today() })
          }
        }}
      >
        {project.notes || PH_NOTES}
      </div>

      <button className="card-action-link" onClick={e => { e.stopPropagation(); onMoveToOpp(project) }}>← Move back to Opportunities</button>
      <button className="project-delete" title="Delete project" aria-label="Delete project" onClick={e => { e.stopPropagation(); onDelete(project) }}>×</button>
    </div>
  )
}

function InlineProjCard({ accountId, clientStakeholders, onSaved, onDiscard }: {
  accountId: string
  clientStakeholders: Array<{ stakeholder_id: string; name: string }>
  onSaved: (p: Project) => void
  onDiscard: () => void
}) {
  const rec = useRef<Project>({
    project_id: newId('PROJ'), account_id: accountId, engagement_id: '',
    project_name: '', status: 'Active', client_stakeholder_ids: [],
    notes: '', year: String(new Date().getFullYear()), created_date: today(), last_updated: today(),
  })
  const nameRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Project['status']>('Active')
  const saved = useRef(false)

  useEffect(() => { nameRef.current?.focus() }, [])

  const saveIfReady = async () => {
    if (saved.current || !rec.current.project_name.trim()) return
    saved.current = true
    rec.current.last_updated = today()
    await upsertProject(rec.current)
    onSaved({ ...rec.current })
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const card = nameRef.current?.closest('.project-card')
      if (!card) return
      if (card.contains(e.target as Node)) return
      if ((e.target as Element).closest('.app-popover,.app-modal-overlay')) return
      if (!saved.current) {
        if (rec.current.project_name.trim()) saveIfReady()
        else onDiscard()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cycleStatus = () => {
    const next = PROJ_STATUS[(PROJ_STATUS.indexOf(status) + 1) % PROJ_STATUS.length]
    setStatus(next); rec.current.status = next
  }

  return (
    <div className="project-card new-card">
      <button
        className="project-delete"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        title="Discard"
        onClick={onDiscard}
      >×</button>

      <div className="card-title-row">
        <div
          ref={nameRef}
          className="card-title field-required-highlight"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Project name"
          data-placeholder="Project name…"
          style={{ color: 'var(--text)' }}
          onInput={() => { rec.current.project_name = nameRef.current?.textContent?.trim() || '' }}
          onBlur={() => {
            rec.current.project_name = nameRef.current?.textContent?.trim() || ''
            if (rec.current.project_name && !saved.current) saveIfReady()
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveIfReady() } if (e.key === 'Escape') onDiscard() }}
        />
        <div className="card-status-wrap">
          <span
            className={statusBadgeClass(status)}
            role="button"
            tabIndex={0}
            onClick={cycleStatus}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleStatus() } }}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="card-meta-row">
        <span className="card-meta-label">Year:</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)' }}>{rec.current.year}</span>
      </div>

      <div className="card-meta-row">
        <span className="card-meta-label">Client stakeholder(s):</span>
        <MultiPicker
          values={[]}
          options={clientStakeholders.map(s => s.name)}
          placeholder="Select people"
          triggerClass="picker-btn"
          triggerStyle={{ border: 'none', background: 'transparent', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--gray)', borderRadius: 3, cursor: 'pointer', fontStyle: 'italic' }}
          onChange={names => { rec.current.client_stakeholder_ids = names.map(n => clientStakeholders.find(s => s.name === n)?.stakeholder_id || n) }}
        />
      </div>
    </div>
  )
}
