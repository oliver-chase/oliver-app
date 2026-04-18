'use client'
import { useState, useRef, useEffect, CSSProperties } from 'react'
import { upsertAction, upsertBackground, deleteRecord, newId, today } from '@/lib/db'
import { useAppModal } from '@/components/shared/AppModal'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import { useSyncReport } from '@/lib/sync-context'
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
const ACT_FILTER_OPTS: [string, string][] = [['open-progress', 'Open + In Progress'], ['all', 'All statuses'], ['Open', 'Open only'], ['Done', 'Done only']]
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
  filterSearch: string
  statusFilter: string
  onStatusFilterChange: (v: string) => void
}

type StatusFilter = 'open-progress' | 'all' | 'Open' | 'Done'

export default function ActionsSection({ accountId, data, setData, filterSearch, statusFilter, onStatusFilterChange }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [sortCol, setSortCol] = useState<SortCol>('created_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [adding, setAdding] = useState(false)
  const { modal, showModal } = useAppModal()
  const { softDelete, toastEl } = useSoftDelete<Action>()
  const reportSync = useSyncReport()

  const acctProjs = data.projects.filter(p => p.account_id === accountId)
  const acctOpps = data.opportunities.filter(o => o.account_id === accountId)

  const actions = data.actions.filter(a => {
    if (a.account_id !== accountId) return false
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      if (!(a.description || '').toLowerCase().includes(q)) return false
    }
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
    reportSync('syncing')
    try { await upsertAction(action); reportSync('ok') } catch { reportSync('error') }
  }

  const remove = (a: Action) => {
    softDelete(a, {
      displayName: a.description || 'Action',
      onLocalRemove: () => setData(prev => ({ ...prev, actions: prev.actions.filter(x => x.action_id !== a.action_id) })),
      onLocalRestore: () => setData(prev => ({ ...prev, actions: [...prev.actions, a] })),
      onDeleteRecord: async () => { reportSync('syncing'); try { await deleteRecord('actions', 'action_id', a.action_id); reportSync('ok') } catch { reportSync('error') } },
    })
  }

  const handleAddPerson = async (): Promise<string | null> => {
    const { buttonValue, inputValue } = await showModal({ title: 'Add person', inputPlaceholder: 'Name', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return null
    const nm = inputValue.trim()
    if (bg) {
      const cur = (bg.account_team || '').split(';').map(s => s.trim()).filter(Boolean)
      if (!cur.includes(nm)) {
        cur.push(nm)
        const updated = { ...bg, account_team: cur.join('; ') }
        setData(prev => ({ ...prev, background: prev.background.map(b => b.account_id === accountId && !b.engagement_id ? updated : b) }))
        await upsertBackground(updated)
      }
    }
    return nm
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
      {modal}
      {toastEl}
      <div className="app-section-header">
        <div className="app-section-title">Actions</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-link" id="btn-add-action" onClick={() => setAdding(true)}>+ Add action</button>
          </div>
          <div className="section-actions">
            <Picker
              value={ACT_FILTER_OPTS.find(([v]) => v === statusFilter)?.[1] ?? ACT_FILTER_OPTS[0][1]}
              options={ACT_FILTER_OPTS.map(([, l]) => l)}
              triggerClass="sort-select"
              showUnassigned={false}
              onChange={val => onStatusFilterChange(ACT_FILTER_OPTS.find(([, l]) => l === val)?.[0] ?? 'open-progress')}
            />
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
                onAddPerson={handleAddPerson}
                onSaved={a => {
                  setData(prev => ({ ...prev, actions: [a, ...prev.actions] }))
                  setAdding(false)
                }}
                onDiscard={() => setAdding(false)}
              />
            )}
            {sorted.length === 0 && !adding && (
              <tr><td colSpan={5}><div className="empty-state">No results</div></td></tr>
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
                onAddPerson={handleAddPerson}
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

function InlineAddRow({ accountId, owners, engOptions, engLabel, onAddPerson, onSaved, onDiscard }: {
  accountId: string
  owners: string[]
  engOptions: Array<{ value: string; label: string; isHeader?: boolean }>
  engLabel: (id: string) => string
  onAddPerson: () => Promise<string | null>
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
      <td className="action-cell">
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
      <td className="action-cell" style={{ whiteSpace: 'nowrap' }}>
        <EngPickerBtn
          value={ownerVal}
          options={owners.map(n => ({ value: n, label: n }))}
          placeholder="Select person"
          onChange={v => { setOwnerVal(v); rec.current.owner = v }}
          addNew={async () => { const nm = await onAddPerson(); if (nm) { setOwnerVal(nm); rec.current.owner = nm } }}
        />
      </td>
      <td className="action-cell">
        <EngPickerBtn
          value={engVal}
          options={engOptions}
          placeholder="Account-wide"
          displayLabel={engLabel(engVal)}
          onChange={v => { setEngVal(v); rec.current.engagement_id = v }}
        />
      </td>
      <td className="action-cell">
        <Picker
          value={statusVal}
          options={[...STATUS_OPTIONS] as unknown as string[]}
          triggerClass={statusBadgeClass(statusVal)}
          triggerStyle={{ border: 'none', cursor: 'pointer' }}
          showUnassigned={false}
          onChange={v => { setStatusVal(v as Action['status']); rec.current.status = v as Action['status'] }}
        />
      </td>
      <td style={{ width: 40, textAlign: 'center', padding: 'var(--spacing-xs)', verticalAlign: 'middle' }}>
        <button
          className="project-delete"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'static' }}
          onClick={onDiscard}
        >×</button>
      </td>
    </tr>
  )
}

function ActionRow({ action, owners, engOptions, engLabel, onSave, onDelete, onAddPerson }: {
  action: Action
  owners: string[]
  engOptions: Array<{ value: string; label: string; isHeader?: boolean }>
  engLabel: (id: string) => string
  onSave: (a: Action) => Promise<void>
  onDelete: (a: Action) => void
  onAddPerson: () => Promise<string | null>
}) {
  const descRef = useRef<HTMLSpanElement>(null)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const age = (action.status === 'Open' || action.status === 'In Progress') ? dayAge(action.created_date) : 0
  const rowStyle: CSSProperties = age > 14 ? { background: 'var(--color-bg-overdue)' } : {}

  return (
    <tr className={action.status === 'Done' ? 'done-row' : ''} style={rowStyle}>
      <td className="action-cell">
        <span
          ref={descRef}
          className="action-text"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const v = descRef.current?.textContent?.trim() || ''
            if (descTimer.current) clearTimeout(descTimer.current)
            descTimer.current = setTimeout(() => {
              if (v !== action.description) onSave({ ...action, description: v || action.description, last_updated: today() })
            }, 500)
          }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); descRef.current?.blur() } }}
        >
          {action.description}
        </span>
        {age >= 7 && (
          <span style={{ fontSize: 'var(--font-size-xs)', fontStyle: 'italic', marginLeft: 'var(--spacing-xs)', color: age > 14 ? 'var(--pink)' : 'var(--gray)' }}>
            ({age}d)
          </span>
        )}
      </td>
      <td className="action-cell" style={{ whiteSpace: 'nowrap' }}>
        <EngPickerBtn
          value={action.owner}
          options={owners.map(n => ({ value: n, label: n }))}
          placeholder="Select person"
          onChange={v => onSave({ ...action, owner: v, last_updated: today() })}
          addNew={async () => { const nm = await onAddPerson(); if (nm) onSave({ ...action, owner: nm, last_updated: today() }) }}
        />
      </td>
      <td className="action-cell">
        <EngPickerBtn
          value={action.engagement_id}
          options={engOptions}
          placeholder="Account-wide"
          displayLabel={engLabel(action.engagement_id)}
          onChange={v => onSave({ ...action, engagement_id: v, last_updated: today() })}
        />
      </td>
      <td className="action-cell">
        <Picker
          value={action.status}
          options={[...STATUS_OPTIONS] as unknown as string[]}
          triggerClass={statusBadgeClass(action.status)}
          triggerStyle={{ border: 'none', cursor: 'pointer' }}
          showUnassigned={false}
          onChange={v => onSave({ ...action, status: v as Action['status'], closed_date: v === 'Done' ? today() : '', last_updated: today() })}
        />
      </td>
      <td style={{ width: 40, textAlign: 'center', padding: 'var(--spacing-xs)', verticalAlign: 'middle' }}>
        <button
          className="project-delete"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'static' }}
          onClick={() => onDelete(action)}
        >×</button>
      </td>
    </tr>
  )
}

// Pill-style picker button for owner + project columns in the actions table
function EngPickerBtn({ value, options, placeholder, displayLabel, onChange, addNew }: {
  value: string
  options: Array<{ value: string; label: string; isHeader?: boolean }>
  placeholder: string
  displayLabel?: string
  onChange: (v: string) => void
  addNew?: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(o => !o); setQuery('')
    setTimeout(() => searchRef.current?.focus(), 0)
  }

  const filtered = query
    ? options.filter(o => o.isHeader || o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const label = displayLabel !== undefined ? displayLabel : (value || placeholder)
  const isEmpty = !value

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className={'picker-btn-pill' + (isEmpty ? ' picker-placeholder' : '')}
        onClick={handleOpen}
      >
        {label}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 180 }}>
          <input
            ref={searchRef}
            className="app-popover-search"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          />
          <div className="app-popover-list">
            {filtered.map((opt, i) =>
              opt.isHeader ? (
                <div key={i} className="app-popover-section-label">{opt.label}</div>
              ) : (
                <div
                  key={opt.value}
                  className={'app-popover-item' + (opt.value === value ? ' selected' : '')}
                  onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); setQuery('') }}
                >
                  {opt.label}
                </div>
              )
            )}
            {filtered.filter(o => !o.isHeader).length === 0 && (
              <div className="app-popover-empty">No matches</div>
            )}
          </div>
          {addNew && (
            <div
              className="app-popover-add-new"
              onMouseDown={e => { e.preventDefault(); setOpen(false); setQuery(''); void addNew() }}
            >
              + Add person…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
