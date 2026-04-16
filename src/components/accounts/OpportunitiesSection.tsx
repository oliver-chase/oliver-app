'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertOpportunity, deleteRecord, newId, today } from '@/lib/db'
import type { Opportunity, Background, AppState } from '@/types'
import { Picker, MultiPicker } from './Picker'

function getTeamNames(bg?: Background): string[] {
  if (!bg) return []
  const names: string[] = []
  if (bg.account_director) names.push(bg.account_director)
  if (bg.account_manager) names.push(bg.account_manager)
  if (bg.account_team) bg.account_team.split(';').forEach(n => { const t = n.trim(); if (t) names.push(t) })
  return [...new Set(names)]
}

const OPP_STATUS = ['Identified', 'Pursuing', 'Won', 'Lost'] as const
const statusBadgeClass = (s: string) => {
  const map: Record<string, string> = { Identified: 'identified', Pursuing: 'pursuing', Won: 'won', Lost: 'lost' }
  return 'app-badge app-badge--clickable app-badge-' + (map[s] || 'identified')
}

const PH_NOTES = 'Add notes…'

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

  const opps = data.opportunities
    .filter(o => o.account_id === accountId)
    .filter(o => showLost || o.status !== 'Lost')
    .sort((a, b) => b.created_date.localeCompare(a.created_date))

  const save = async (o: Opportunity) => {
    setData(prev => ({ ...prev, opportunities: prev.opportunities.map(x => x.opportunity_id === o.opportunity_id ? o : x) }))
    await upsertOpportunity(o)
  }

  const add = (o: Opportunity) => {
    setData(prev => ({ ...prev, opportunities: [o, ...prev.opportunities] }))
    setAdding(false)
  }

  const remove = async (o: Opportunity) => {
    if (!window.confirm('Delete this opportunity?')) return
    setData(prev => ({ ...prev, opportunities: prev.opportunities.filter(x => x.opportunity_id !== o.opportunity_id) }))
    await deleteRecord('opportunities', 'opportunity_id', o.opportunity_id)
  }

  const promote = async (o: Opportunity) => {
    const { upsertProject } = await import('@/lib/db')
    const proj = {
      project_id: newId('PROJ'), account_id: accountId, engagement_id: o.engagement_id,
      project_name: o.description || '', status: 'Active' as const, client_stakeholder_ids: [],
      notes: o.notes, year: o.year, created_date: today(), last_updated: today(),
    }
    setData(prev => ({
      ...prev,
      projects: [proj, ...prev.projects],
      opportunities: prev.opportunities.filter(x => x.opportunity_id !== o.opportunity_id),
    }))
    await upsertProject(proj)
    await upsertOpportunity({ ...o })
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={'btn-acct-action' + (showLost ? '' : '')}
            onClick={() => setShowLost(s => !s)}
          >
            {showLost ? 'Hide Lost' : 'Show Lost'}
          </button>
          <button className="btn-acct-action" onClick={() => setAdding(true)}>+ Add Opportunity</button>
        </div>
      </div>

      {opps.length === 0 && !adding && <div className="empty-state">No results</div>}

      <div className="project-grid">
        {adding && (
          <InlineOppCard
            accountId={accountId}
            owners={owners}
            onSaved={add}
            onDiscard={() => setAdding(false)}
          />
        )}
        {opps.map(o => (
          <OppCard
            key={o.opportunity_id}
            opp={o}
            owners={owners}
            onSave={save}
            onDelete={remove}
            onPromote={promote}
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
  const yearRef = useRef<HTMLSpanElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)

  return (
    <div className="project-card" title={'Last updated: ' + (opp.last_updated || '')}>
      {/* Title row */}
      <div className="card-title-row">
        <div
          ref={descRef}
          className="card-title"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Opportunity description"
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
            options={[...OPP_STATUS] as unknown as string[]}
            triggerClass={statusBadgeClass(opp.status)}
            triggerStyle={{ border: 'none', minHeight: 0, cursor: 'pointer' }}
            onChange={v => onSave({ ...opp, status: v as Opportunity['status'], last_updated: today() })}
          />
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
            if (v !== opp.year) onSave({ ...opp, year: v || String(new Date().getFullYear()), last_updated: today() })
            if (!v && yearRef.current) yearRef.current.textContent = String(new Date().getFullYear())
          }}
        >
          {opp.year || String(new Date().getFullYear())}
        </span>
      </div>

      {/* Owners */}
      <div className="card-meta-row">
        <span className="card-meta-label">Owner(s):</span>
        <MultiPicker
          values={opp.owners}
          options={owners}
          placeholder="Select people"
          onChange={v => onSave({ ...opp, owners: v, last_updated: today() })}
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
        style={!opp.notes ? { fontStyle: 'italic' } : undefined}
        onFocus={() => { if (!opp.notes && notesRef.current && notesRef.current.textContent === PH_NOTES) { notesRef.current.textContent = ''; notesRef.current.style.fontStyle = '' } }}
        onBlur={() => {
          const v = notesRef.current?.textContent?.trim() || ''
          if (!v || v === PH_NOTES) {
            if (notesRef.current) { notesRef.current.textContent = PH_NOTES; notesRef.current.style.fontStyle = 'italic' }
            if (opp.notes) onSave({ ...opp, notes: '', last_updated: today() })
          } else if (v !== opp.notes) {
            if (notesRef.current) notesRef.current.style.fontStyle = ''
            onSave({ ...opp, notes: v, last_updated: today() })
          }
        }}
      >
        {opp.notes || PH_NOTES}
      </div>

      <button className="card-action-link" onClick={() => onPromote(opp)}>→ Promote to Project</button>
      <button className="project-delete" title="Delete opportunity" aria-label="Delete opportunity" onClick={e => { e.stopPropagation(); onDelete(opp) }}>×</button>
    </div>
  )
}

function InlineOppCard({ accountId, owners, onSaved, onDiscard }: {
  accountId: string
  owners: string[]
  onSaved: (o: Opportunity) => void
  onDiscard: () => void
}) {
  const rec = useRef<Opportunity>({
    opportunity_id: newId('OPP'), account_id: accountId, engagement_id: '',
    description: '', status: 'Identified', owners: [], value: '', close_date: '',
    year: String(new Date().getFullYear()), notes: '', created_date: today(), last_updated: today(),
  })
  const descRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Opportunity['status']>('Identified')
  const saved = useRef(false)

  useEffect(() => { descRef.current?.focus() }, [])

  const saveIfReady = async () => {
    if (saved.current || !rec.current.description.trim()) return
    saved.current = true
    rec.current.last_updated = today()
    await upsertOpportunity(rec.current)
    onSaved({ ...rec.current })
  }

  // Click-away: if description filled, save; else discard
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const card = descRef.current?.closest('.project-card')
      if (!card) return
      if (card.contains(e.target as Node)) return
      if ((e.target as Element).closest('.app-popover,.app-modal-overlay')) return
      if (!saved.current) {
        if (rec.current.description.trim()) saveIfReady()
        else onDiscard()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          ref={descRef}
          className="card-title field-required-highlight"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Opportunity description"
          data-placeholder="Describe the opportunity…"
          style={{ color: 'var(--text)' }}
          onInput={() => { rec.current.description = descRef.current?.textContent?.trim() || '' }}
          onBlur={() => {
            rec.current.description = descRef.current?.textContent?.trim() || ''
            if (rec.current.description && !saved.current) saveIfReady()
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveIfReady() } if (e.key === 'Escape') onDiscard() }}
        />
        <div className="card-status-wrap">
          <Picker
            value={status}
            options={[...OPP_STATUS] as unknown as string[]}
            triggerClass={statusBadgeClass(status)}
            triggerStyle={{ border: 'none', minHeight: 0, cursor: 'pointer' }}
            onChange={v => { setStatus(v as Opportunity['status']); rec.current.status = v as Opportunity['status'] }}
          />
        </div>
      </div>

      <div className="card-meta-row">
        <span className="card-meta-label">Year:</span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)' }}>{rec.current.year}</span>
      </div>

      <div className="card-meta-row">
        <span className="card-meta-label">Owner(s):</span>
        <MultiPicker
          values={rec.current.owners}
          options={owners}
          placeholder="Select people"
          onChange={v => { rec.current.owners = v }}
        />
      </div>
    </div>
  )
}
