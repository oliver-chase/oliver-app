'use client'
import { useState, useRef } from 'react'
import { upsertOpportunity, deleteRecord, newId, today } from '@/lib/db'
import type { Opportunity, Background, AppState } from '@/types'
import { Picker, MultiPicker } from './Picker'

function getTeamNames(bg?: Background): string[] {
  if (!bg) return []
  const names: string[] = []
  if (bg.account_director) names.push(bg.account_director)
  if (bg.account_manager) names.push(bg.account_manager)
  if (bg.account_team) {
    bg.account_team.split(';').forEach(n => { const t = n.trim(); if (t) names.push(t) })
  }
  return [...new Set(names)]
}

const STATUS_OPTIONS: Opportunity['status'][] = ['Identified', 'Pursuing', 'Won', 'Lost']

function statusClass(status: Opportunity['status']) {
  const map: Record<string, string> = {
    Identified: 'app-badge app-badge-identified',
    Pursuing: 'app-badge app-badge-pursuing',
    Won: 'app-badge app-badge-won',
    Lost: 'app-badge app-badge-lost',
  }
  return (map[status] || 'app-badge') + ' app-badge--clickable'
}

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function OpportunitiesSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [showLost, setShowLost] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const descInputRef = useRef<HTMLInputElement>(null)

  const opps = data.opportunities
    .filter(o => o.account_id === accountId)
    .filter(o => showLost || o.status !== 'Lost')
    .sort((a, b) => b.created_date.localeCompare(a.created_date))

  const save = async (o: Opportunity) => {
    setData(prev => ({ ...prev, opportunities: prev.opportunities.map(x => x.opportunity_id === o.opportunity_id ? o : x) }))
    await upsertOpportunity(o)
  }

  const add = async () => {
    const desc = newDesc.trim()
    if (!desc) { descInputRef.current?.focus(); return }
    const o: Opportunity = {
      opportunity_id: newId('OPP'), account_id: accountId, engagement_id: '',
      description: desc, status: 'Identified', owners: [], value: '', close_date: '',
      year: String(new Date().getFullYear()), notes: '', created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, opportunities: [o, ...prev.opportunities] }))
    await upsertOpportunity(o)
    setNewDesc(''); setAdding(false)
  }

  const remove = async (o: Opportunity) => {
    if (!window.confirm('Delete this opportunity?')) return
    setData(prev => ({ ...prev, opportunities: prev.opportunities.filter(x => x.opportunity_id !== o.opportunity_id) }))
    await deleteRecord('opportunities', 'opportunity_id', o.opportunity_id)
  }

  const promoteToProject = async (o: Opportunity) => {
    const { upsertProject } = await import('@/lib/db')
    const proj = {
      project_id: newId('PROJ'), account_id: accountId, engagement_id: o.engagement_id,
      project_name: o.description, status: 'Active' as const, client_stakeholder_ids: [],
      notes: o.notes, year: o.year, created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, projects: [proj, ...prev.projects] }))
    await upsertProject(proj)
    await save({ ...o, status: 'Won', last_updated: today() })
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className={'btn-acct-action' + (showLost ? ' active' : '')} onClick={() => setShowLost(s => !s)}>
            {showLost ? 'Hide Lost' : 'Show Lost'}
          </button>
          <button className="btn-acct-action" onClick={() => { setAdding(true); setTimeout(() => descInputRef.current?.focus(), 50) }}>
            + Add Opportunity
          </button>
        </div>
      </div>

      {adding && (
        <div className="inline-form" style={{ marginBottom: 12 }}>
          <div className="inline-form-title">New Opportunity</div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <input
              ref={descInputRef}
              className="form-input field-required-highlight"
              placeholder="Opportunity description"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
            />
          </div>
          <div className="inline-form-actions">
            <button className="btn-acct-action" onClick={add}>Save</button>
            <button className="btn-acct-action" onClick={() => { setAdding(false); setNewDesc('') }}>Cancel</button>
          </div>
        </div>
      )}

      {opps.length === 0 && !adding && <div className="empty-state">No opportunities yet</div>}

      <div className="project-grid">
        {opps.map(o => (
          <OppCard
            key={o.opportunity_id}
            opp={o}
            owners={owners}
            onSave={save}
            onDelete={remove}
            onPromote={promoteToProject}
          />
        ))}
      </div>
    </div>
  )
}

function OppCard({ opp, owners, onSave, onDelete, onPromote }: {
  opp: Opportunity
  owners: string[]
  onSave: (o: Opportunity) => Promise<void>
  onDelete: (o: Opportunity) => Promise<void>
  onPromote: (o: Opportunity) => Promise<void>
}) {
  const descRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)

  return (
    <div className="project-card">
      <div className="card-title-row">
        <div
          ref={descRef}
          className="card-title proj-name"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const v = descRef.current?.textContent?.trim() || ''
            if (v !== opp.description) onSave({ ...opp, description: v || opp.description, last_updated: today() })
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); descRef.current?.blur() } }}
        >
          {opp.description}
        </div>
        <div className="card-status-wrap">
          <Picker
            value={opp.status}
            options={STATUS_OPTIONS as unknown as string[]}
            triggerClass={statusClass(opp.status)}
            onChange={v => onSave({ ...opp, status: v as Opportunity['status'], last_updated: today() })}
          />
        </div>
      </div>

      <div className="proj-meta">
        <MultiPicker
          values={opp.owners}
          options={owners}
          placeholder="No owners"
          onChange={v => onSave({ ...opp, owners: v, last_updated: today() })}
        />
        {' · '}
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray)' }}>{opp.year || '—'}</span>
      </div>

      <div
        ref={notesRef}
        className="notes-text"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Notes…"
        style={{ color: notesRef.current?.textContent?.trim() ? undefined : 'var(--gray)', fontStyle: notesRef.current?.textContent?.trim() ? undefined : 'italic' }}
        onBlur={() => {
          const v = notesRef.current?.textContent?.trim() || ''
          if (v !== opp.notes) onSave({ ...opp, notes: v, last_updated: today() })
        }}
      >
        {opp.notes || 'Notes…'}
      </div>

      {opp.status !== 'Won' && opp.status !== 'Lost' && (
        <button className="card-action-link" onClick={() => onPromote(opp)}>Promote to Project →</button>
      )}

      <button className="project-delete" onClick={() => onDelete(opp)}>×</button>
    </div>
  )
}
