'use client'
import { useState, useRef, useEffect, CSSProperties } from 'react'
import { upsertAction, deleteRecord, newId, today } from '@/lib/db'
import type { Action, Background, AppState } from '@/types'
import { Picker } from './Picker'

function getTeamNames(bg?: Background): string[] {
  if (!bg) return []
  const names: string[] = []
  if (bg.account_director) names.push(bg.account_director)
  if (bg.account_manager) names.push(bg.account_manager)
  if (bg.account_team) bg.account_team.split(';').forEach(n => { const t = n.trim(); if (t) names.push(t) })
  return [...new Set(names)]
}

function dayAge(dateStr: string): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)
}

const STATUS_OPTIONS = ['Open', 'In Progress', 'Done'] as const
const statusBadgeClass = (s: string) => {
  if (s === 'Done') return 'app-badge app-badge-complete app-badge--clickable'
  if (s === 'In Progress') return 'app-badge app-badge-progress app-badge--clickable'
  return 'app-badge app-badge-open app-badge--clickable'
}

type SortCol = 'description' | 'owner' | 'status' | 'created_date'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

type StatusFilter = 'open-progress' | 'all' | 'Open' | 'Done'

export default function ActionsSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [sortCol, setSortCol] = useState<SortCol>('created_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [adding, setAdding] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open-progress')

  const acctProjs = data.projects.filter(p => p.account_id === accountId)
  const acctOpps = data.opportunities.filter(o => o.account_id === accountId)

  const actions = data.actions.filter(a => {
    if (a.account_id !== accountId) return false
    if (statusFilter === 'open-progress') return a.status === 'Open' || a.status === 'In Progress'
    if (statusFilter === 'all') return true
    return a.status === statusFilter
  })

  const engLabel = (id: string) => {
    if (!id) return 'Account-wide'
    const p = acctProjs.find(x => x.project_id === id)
    if (p) return p.project_name || 'Account-wide'
    const o = acctOpps.find(x => x.opportunity_id === id)
    return o ? (o.description || 'Account-wide') : 'Account-wide'
  }

  const engOptions = (): Array<{ value: string; label: string; isHeader?: boolean }> => {
    const items: Array<{ value: string; label: string; isHeader?: boolean }> = [{ value: '', label: 'Account-wide' }]
    const activeProjs = [...acctProjs].filter(p => p.status === 'Active').sort((a, b) => a.project_name.localeCompare(b.project_name))
    if (activeProjs.length) {
      items.push({ value: '__h_proj', label: 'PROJECTS', isHeader: true })
      activeProjs.forEach(p => items.push({ value: p.project_id, label: p.project_name }))
    }
    const sortedOpps = [...acctOpps].sort((a, b) => (a.description || '').localeCompare(b.description || ''))
    if (sortedOpps.length) {
      items.push({ value: '__h_opp', label: 'OPPORTUNITIES', isHeader: true })
      sortedOpps.forEach(o => items.push({ value: o.opportunity_id, label: o.description || o.opportunity_id }))
    }
    return items
  }

  const sorted = [...actions].sort((a, b) => {
    const av = a[sortCol] || '', bv = b[sortCol] || ''
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const save = async (action: Action) => {
    setData(prev => ({ ...prev, actions: prev.actions.map(a => a.action_id === action.action_id ? action : a) }))
    await upsertAction(action)
  }

  const remove = async (a: Action) => {
    if (!window.confirm('Delete this action?')) return
    setData(prev => ({ ...prev, actions: prev.actions.filter(x => x.action_id !== a.action_id) }))
    await deleteRecord('actions', 'action_id', a.action_id)
  }

  const thCls = (col: SortCol) => sortCol === col ? 'sorted' : ''
  const arrow = (col: SortCol) => sortCol === col
    ? <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
    : <span className="sort-arrow">▼</span>

  const allActs = data.actions.filter(a => a.account_id === accountId)
  const openCount = allActs.filter(a => a.status === 'Open').length
  const inProgCount = allActs.filter(a => a.status === 'In Progress').length
  const actParts: string[] = []
  if (openCount) actParts.push(openCount + ' open')
  if (inProgCount) actParts.push(inProgCount + ' in progress')

  return (
    <div>
      <div className="app-section-header">
        <div className="app-section-title">Actions</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-link" id="btn-add-action" onClick={() => setAdding(true)}>+ Add action</button>
          </div>
          <div className="section-actions">
            <select
              className="sort-select"
              id="filter-action-status"
              aria-label="Filter by action status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="open-progress">Open + In Progress</option>
              <option value="all">All statuses</option>
              <option value="Open">Open only</option>
              <option value="Done">Done only</option>
            </select>
          </div>
        </div>
      </div>
      <div id="actions-body">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className={thCls('description')} onClick={() => toggleSort('description')}>Action {arrow('description')}</th>
              <th className={thCls('owner')} onClick={() => toggleSort('owner')}>Owner {arrow('owner')}</th>
              <th>Project</th>
              <th className={thCls('status')} onClick={() => toggleSort('status')}>Status {arrow('status')}</th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <InlineAddRow
                accountId={accountId}
                owners={owners}
                engOptions={engOptions()}
                engLabel={engLabel}
                onSaved={a => {
                  setData(prev => ({ ...prev, actions: [a, ...prev.actions] }))
                  setAdding(false)
                }}
                onDiscard={() => setAdding(false)}
              />
            )}
            {sorted.length === 0 && !adding && (
              <tr><td colSpan={5}><div className="empty-state">No actions yet</div></td></tr>
            )}
            {sorted.map(a => (
              <ActionRow
                key={a.action_id}
                action={a}
                owners={owners}
                engOptions={engOptions()}
                engLabel={engLabel}
                onSave={save}
                onDelete={remove}
              />
            ))}
          </tbody>
        </table>
      </div>
      </div>
      <div className="section-count-footer" id="actions-count-footer">{actParts.join(' \u00b7 ')}</div>
    </div>
  )
}

function InlineAddRow({ accountId, owners, engOptions, engLabel, onSaved, onDiscard }: {
  accountId: string
  owners: string[]
  engOptions: Array<{ value: string; label: string; isHeader?: boolean }>
  engLabel: (id: string) => string
  onSaved: (a: Action) => void
  onDiscard: () => void
}) {
  const rec = useRef<Action>({
    action_id: newId('ACT'), account_id: accountId, engagement_id: '',
    description: '', owner: '', status: 'Open',
    closed_date: '', created_date: today(), last_updated: today(),
  })
  const descRef = useRef<HTMLSpanElement>(null)
  const [ownerVal, setOwnerVal] = useState('')
  const [engVal, setEngVal] = useState('')
  const [statusVal, setStatusVal] = useState<Action['status']>('Open')
  const saved = useRef(false)

  useEffect(() => { descRef.current?.focus() }, [])

  const saveIfReady = async () => {
    if (saved.current || !rec.current.description.trim()) return
    saved.current = true
    rec.current.owner = ownerVal
    rec.current.engagement_id = engVal
    rec.current.status = statusVal
    rec.current.last_updated = today()
    await upsertAction(rec.current)
    onSaved({ ...rec.current })
  }

  return (
    <tr className="new-row">
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', lineHeight: 1.4 }}>
        <span
          ref={descRef}
          className="action-text field-required-highlight"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Action description"
          data-placeholder="What needs to happen?"
          onInput={() => { rec.current.description = descRef.current?.textContent?.trim() || '' }}
          onBlur={() => { rec.current.description = descRef.current?.textContent?.trim() || ''; if (rec.current.description && !saved.current) saveIfReady() }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveIfReady() } if (e.key === 'Escape') onDiscard() }}
        />
      </td>
      <td style={{ whiteSpace: 'nowrap', padding: '12px 14px', verticalAlign: 'middle' }}>
        <EngPickerBtn
          value={ownerVal}
          options={owners.map(n => ({ value: n, label: n }))}
          placeholder="Select person"
          onChange={v => { setOwnerVal(v); rec.current.owner = v }}
        />
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <EngPickerBtn
          value={engVal}
          options={engOptions}
          placeholder="Account-wide"
          displayLabel={engLabel(engVal)}
          onChange={v => { setEngVal(v); rec.current.engagement_id = v }}
        />
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <Picker
          value={statusVal}
          options={[...STATUS_OPTIONS] as unknown as string[]}
          triggerClass={statusBadgeClass(statusVal)}
          triggerStyle={{ border: 'none', cursor: 'pointer' }}
          onChange={v => { setStatusVal(v as Action['status']); rec.current.status = v as Action['status'] }}
        />
      </td>
      <td style={{ width: 40, textAlign: 'center', padding: 4, verticalAlign: 'middle' }}>
        <button
          className="project-delete"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'static', width: 20, height: 20 }}
          onClick={onDiscard}
        >×</button>
      </td>
    </tr>
  )
}

function ActionRow({ action, owners, engOptions, engLabel, onSave, onDelete }: {
  action: Action
  owners: string[]
  engOptions: Array<{ value: string; label: string; isHeader?: boolean }>
  engLabel: (id: string) => string
  onSave: (a: Action) => Promise<void>
  onDelete: (a: Action) => Promise<void>
}) {
  const descRef = useRef<HTMLSpanElement>(null)
  const age = (action.status === 'Open' || action.status === 'In Progress') ? dayAge(action.created_date) : 0
  const rowStyle: CSSProperties = age > 14 ? { background: 'var(--color-bg-overdue)' } : {}

  return (
    <tr className={action.status === 'Done' ? 'done-row' : ''} style={rowStyle}>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle', lineHeight: 1.4 }}>
        <span
          ref={descRef}
          className="action-text"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const v = descRef.current?.textContent?.trim() || ''
            if (v !== action.description) onSave({ ...action, description: v || action.description, last_updated: today() })
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); descRef.current?.blur() } }}
        >
          {action.description}
        </span>
        {age >= 7 && (
          <span style={{ fontSize: 'var(--font-size-xs)', fontStyle: 'italic', marginLeft: 4, color: age > 14 ? 'var(--pink)' : 'var(--gray)' }}>
            ({age}d)
          </span>
        )}
      </td>
      <td style={{ whiteSpace: 'nowrap', padding: '12px 14px', verticalAlign: 'middle' }}>
        <EngPickerBtn
          value={action.owner}
          options={owners.map(n => ({ value: n, label: n }))}
          placeholder="Select person"
          onChange={v => onSave({ ...action, owner: v, last_updated: today() })}
        />
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <EngPickerBtn
          value={action.engagement_id}
          options={engOptions}
          placeholder="Account-wide"
          displayLabel={engLabel(action.engagement_id)}
          onChange={v => onSave({ ...action, engagement_id: v, last_updated: today() })}
        />
      </td>
      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
        <Picker
          value={action.status}
          options={[...STATUS_OPTIONS] as unknown as string[]}
          triggerClass={statusBadgeClass(action.status)}
          triggerStyle={{ border: 'none', cursor: 'pointer' }}
          onChange={v => onSave({ ...action, status: v as Action['status'], closed_date: v === 'Done' ? today() : '', last_updated: today() })}
        />
      </td>
      <td style={{ width: 40, textAlign: 'center', padding: 4, verticalAlign: 'middle' }}>
        <button
          className="project-delete"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'static', width: 20, height: 20 }}
          onClick={() => onDelete(action)}
        >×</button>
      </td>
    </tr>
  )
}

// Pill-style picker button for owner + project columns in the actions table
function EngPickerBtn({ value, options, placeholder, displayLabel, onChange }: {
  value: string
  options: Array<{ value: string; label: string; isHeader?: boolean }>
  placeholder: string
  displayLabel?: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = displayLabel !== undefined ? displayLabel : (value || placeholder)
  const isEmpty = !value

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className={'picker-btn-pill' + (isEmpty ? ' picker-placeholder' : '')}
        onClick={() => setOpen(o => !o)}
      >
        {label}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <div className="app-popover-list">
            {options.map((opt, i) =>
              opt.isHeader ? (
                <div key={i} className="app-popover-section-label">{opt.label}</div>
              ) : (
                <div
                  key={opt.value}
                  className={'app-popover-item' + (opt.value === value ? ' selected' : '')}
                  onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false) }}
                >
                  {opt.label}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
