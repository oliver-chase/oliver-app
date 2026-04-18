'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertStakeholder, deleteRecord, newId, today } from '@/lib/db'
import { useSyncReport } from '@/lib/sync-context'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { Stakeholder, Background, AppState } from '@/types'
import { Picker } from './Picker'
import OrgChart from './OrgChart'

const PAGE_SIZE = 6

function getTeamNames(bg?: Background): string[] {
  if (!bg) return []
  const names: string[] = []
  if (bg.account_director) names.push(bg.account_director)
  if (bg.account_manager) names.push(bg.account_manager)
  if (bg.account_team) bg.account_team.split(';').forEach(n => { const t = n.trim(); if (t) names.push(t) })
  return [...new Set(names)]
}

function initials(name: string) {
  return name.split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2) || '?'
}

function buildEngItems(projs: AppState['projects'], opps: AppState['opportunities']) {
  const items: Array<{ value: string; label: string; isHeader?: boolean }> = [{ value: '', label: 'Account-wide' }]
  const sp = [...projs].sort((a, b) => a.project_name.localeCompare(b.project_name))
  if (sp.length) { items.push({ value: '__h_proj', label: 'PROJECTS', isHeader: true }); sp.forEach(p => items.push({ value: p.project_id, label: p.project_name })) }
  const so = [...opps].sort((a, b) => (a.description || '').localeCompare(b.description || ''))
  if (so.length) { items.push({ value: '__h_opp', label: 'OPPORTUNITIES', isHeader: true }); so.forEach(o => items.push({ value: o.opportunity_id, label: o.description || o.opportunity_id })) }
  return items
}

function engDisplay(ids: string[], projs: AppState['projects'], opps: AppState['opportunities']): string {
  if (!ids.length) return 'Account-wide'
  const resolved = ids.map(id => {
    const p = projs.find(x => x.project_id === id)
    if (p) return p.project_name
    const o = opps.find(x => x.opportunity_id === id)
    return o ? (o.description || null) : null
  }).filter(Boolean) as string[]
  return resolved.length ? resolved.join(', ') : 'Account-wide'
}

function isDescendantOf(potDesc: string, potAnc: string, stks: Stakeholder[]): boolean {
  let current: string | undefined = potDesc
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current)) break
    visited.add(current)
    const stk = stks.find(s => s.stakeholder_id === current)
    if (!stk || !stk.reports_to) return false
    if (stk.reports_to === potAnc) return true
    current = stk.reports_to
  }
  return false
}

const PH_PERSON = 'Select person\u2026'
const PEOPLE_SORT_OPTS: [string, string][] = [['name', 'Name A\u2013Z'], ['seniority', 'Seniority'], ['department', 'Department']]

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
  filterSearch: string
  filterExec: boolean
  onFilterExecChange: (v: boolean) => void
  filterIncomplete: boolean
  onFilterIncompleteChange: (v: boolean) => void
  filterVTwoOwner: string
  onFilterVTwoOwnerChange: (v: string) => void
}

export default function PeopleSection({ accountId, data, setData, filterSearch, filterExec, onFilterExecChange, filterIncomplete, onFilterIncompleteChange, filterVTwoOwner, onFilterVTwoOwnerChange }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [adding, setAdding] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [view, setView] = useState<'cards' | 'orgchart'>('cards')
  const [page, setPage] = useState(0)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const { softDelete, toastEl } = useSoftDelete<Stakeholder>()

  const acctProjs = data.projects.filter(p => p.account_id === accountId)
  const acctOpps = data.opportunities.filter(o => o.account_id === accountId)

  useEffect(() => {
    if (!filterPanelOpen) return
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.closest('.people-filter-wrapper')?.contains(e.target as Node)) {
        setFilterPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterPanelOpen])

  let people = data.stakeholders.filter(s => s.account_id === accountId && (s.organization || '').toLowerCase() !== 'v.two')
  if (filterSearch) {
    const q = filterSearch.toLowerCase()
    people = people.filter(s => (s.name || '').toLowerCase().includes(q))
  }
  if (filterExec) people = people.filter(s => s.is_executive === 'true' || s.is_executive === 'TRUE')
  if (filterIncomplete) {
    people = people.filter(s => !s.department || !s.primary_owner || !s.secondary_owner || !s.reports_to)
  }
  if (filterVTwoOwner) people = people.filter(s => s.primary_owner === filterVTwoOwner || s.secondary_owner === filterVTwoOwner)

  people = [...people].sort((a, b) => {
    if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '')
    if (sortBy === 'seniority') return (a.title || '').localeCompare(b.title || '')
    return a.name.localeCompare(b.name)
  })

  const totalPages = Math.ceil(people.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pagedPeople = people.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const filtersOn = filterExec || filterIncomplete || !!filterVTwoOwner

  const reportSync = useSyncReport()

  const save = async (s: Stakeholder) => {
    setData(prev => ({ ...prev, stakeholders: prev.stakeholders.map(x => x.stakeholder_id === s.stakeholder_id ? s : x) }))
    reportSync('syncing')
    try { await upsertStakeholder(s); reportSync('ok') } catch { reportSync('error') }
  }

  const add = (s: Stakeholder) => {
    setData(prev => ({ ...prev, stakeholders: [...prev.stakeholders, s] }))
    setAdding(false)
    setPage(0)
  }

  const remove = (s: Stakeholder) => {
    softDelete(s, {
      displayName: s.name || 'Person',
      onLocalRemove: () => { setData(prev => ({ ...prev, stakeholders: prev.stakeholders.filter(x => x.stakeholder_id !== s.stakeholder_id) })); setPage(0) },
      onLocalRestore: () => setData(prev => ({ ...prev, stakeholders: [...prev.stakeholders, s] })),
      onDeleteRecord: async () => { reportSync('syncing'); try { await deleteRecord('stakeholders', 'stakeholder_id', s.stakeholder_id); reportSync('ok') } catch { reportSync('error') } },
    })
  }

  return (
    <div>
      {toastEl}
      <div className="app-section-header">
        <div className="app-section-title">People</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-link" id="btn-add-person" onClick={() => { setView('cards'); setAdding(true) }}>+ Add person</button>
          </div>
          <div className="section-actions">
            <div className="people-filter-wrapper">
              <button
                className={'filter-chip' + (filtersOn ? ' on' : '')}
                id="people-filter-btn"
                aria-label="Open people filters"
                aria-expanded={filterPanelOpen}
                aria-haspopup="dialog"
                onClick={() => setFilterPanelOpen(o => !o)}
              >Filters</button>
              {filterPanelOpen && (
                <div ref={filterPanelRef} className="people-filter-panel app-popover" id="people-filter-panel" role="dialog">
                  <div className="filter-checkbox-group">
                    <label><input type="checkbox" id="filter-exec-check" checked={filterExec} onChange={e => { onFilterExecChange(e.target.checked); setPage(0) }} /> Executive</label>
                    <label><input type="checkbox" id="filter-incomplete-check" checked={filterIncomplete} onChange={e => { onFilterIncompleteChange(e.target.checked); setPage(0) }} /> Incomplete</label>
                  </div>
                  {owners.length > 0 && (
                    <div className="filter-radio-group" style={{ marginTop: 10 }}>
                      <div className="filter-radio-divider">V.Two Owner</div>
                      <label><input type="radio" name="vtwo-owner" value="" checked={filterVTwoOwner === ''} onChange={() => { onFilterVTwoOwnerChange(''); setPage(0) }} /> All</label>
                      {owners.map(name => (
                        <label key={name}><input type="radio" name="vtwo-owner" value={name} checked={filterVTwoOwner === name} onChange={() => { onFilterVTwoOwnerChange(name); setPage(0) }} /> {name}</label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Picker
              value={PEOPLE_SORT_OPTS.find(([v]) => v === sortBy)?.[1] ?? PEOPLE_SORT_OPTS[0][1]}
              options={PEOPLE_SORT_OPTS.map(([, l]) => l)}
              triggerClass="sort-select"
              showUnassigned={false}
              onChange={val => { setSortBy(PEOPLE_SORT_OPTS.find(([, l]) => l === val)?.[0] ?? 'name'); setPage(0) }}
            />
            <div className="app-view-toggle" id="people-toggle">
              <button className={'app-view-toggle-btn' + (view === 'cards' ? ' active' : '')} data-view="cards" onClick={() => setView('cards')}>Cards</button>
              <button className={'app-view-toggle-btn' + (view === 'orgchart' ? ' active' : '')} data-view="orgchart" onClick={() => setView('orgchart')}>Org</button>
            </div>
          </div>
        </div>
      </div>

      <div id="people-body">
        {view === 'orgchart' ? (
          <OrgChart
            accountId={accountId}
            stakeholders={data.stakeholders.filter(s => s.account_id === accountId)}
            owners={owners}
            acctProjs={acctProjs}
            acctOpps={acctOpps}
            onUpdate={save}
            onDelete={remove}
          />
        ) : (
          <>
            {people.length === 0 && !adding && <div className="empty-state">No results</div>}
            <div className="people-grid">
              {adding && (
                <InlinePersonCard
                  accountId={accountId}
                  owners={owners}
                  acctProjs={acctProjs}
                  acctOpps={acctOpps}
                  onSaved={add}
                  onDiscard={() => setAdding(false)}
                />
              )}
              {pagedPeople.map(p => (
                <PersonCard
                  key={p.stakeholder_id}
                  person={p}
                  owners={owners}
                  otherPeople={people.filter(x => x.stakeholder_id !== p.stakeholder_id)}
                  allStakeholders={data.stakeholders.filter(s => s.account_id === accountId)}
                  acctProjs={acctProjs}
                  acctOpps={acctOpps}
                  onSave={save}
                  onDelete={remove}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <PaginationRow page={safePage} total={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PaginationRow({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
      <button className="btn btn--compact" disabled={page === 0} onClick={() => onChange(0)}>{'\u27e8'}</button>
      <button className="btn btn--compact" disabled={page === 0} onClick={() => onChange(page - 1)}>{'\u2190'}</button>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)', margin: '0 8px' }}>Page {page + 1} of {total}</span>
      <button className="btn btn--compact" disabled={page === total - 1} onClick={() => onChange(page + 1)}>{'\u2192'}</button>
      <button className="btn btn--compact" disabled={page === total - 1} onClick={() => onChange(total - 1)}>{'\u27e9'}</button>
    </div>
  )
}

function PersonCard({ person, owners, otherPeople, allStakeholders, acctProjs, acctOpps, onSave, onDelete }: {
  person: Stakeholder
  owners: string[]
  otherPeople: Stakeholder[]
  allStakeholders: Stakeholder[]
  acctProjs: AppState['projects']
  acctOpps: AppState['opportunities']
  onSave: (s: Stakeholder) => Promise<void>
  onDelete: (s: Stakeholder) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showExpand, setShowExpand] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [rtoError, setRtoError] = useState(false)
  useEffect(() => {
    if (!rtoError) return
    const t = setTimeout(() => setRtoError(false), 3000)
    return () => clearTimeout(t)
  }, [rtoError])
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const deptRef = useRef<HTMLSpanElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isClient = (person.organization || '').toLowerCase() !== 'v.two'

  const debouncedSave = (fn: () => void) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(fn, 500)
  }

  const curEngIds = (person.engagement_id || '').split(',').map(s => s.trim()).filter(Boolean)
  const engItems = buildEngItems(acctProjs, acctOpps)

  useEffect(() => {
    if (!bodyRef.current) return
    if (expanded) { setShowExpand(true); return }
    setShowExpand(bodyRef.current.scrollHeight > bodyRef.current.clientHeight + 2)
  }, [expanded, person])

  useEffect(() => {
    if (notesOpen && notesRef.current) notesRef.current.focus()
  }, [notesOpen])

  return (
    <div className="person-card">
      <div className="person-card-top">
        <div ref={avatarRef} className={'avatar ' + (isClient ? 'client' : 'vtwo')}>{initials(person.name)}</div>
        <div className="person-card-info">
          <div
            ref={nameRef}
            className="name"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Name"
            onBlur={() => {
              const v = nameRef.current?.textContent?.trim() || ''
              if (!v) { if (nameRef.current) nameRef.current.textContent = person.name; return }
              if (v !== person.name) {
                if (avatarRef.current) avatarRef.current.textContent = initials(v)
                debouncedSave(() => onSave({ ...person, name: v, last_updated: today() }))
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
          >{person.name}</div>
          <div className="card-meta-row">
            <span className="card-meta-label">Title:</span>
            <span
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Title"
              style={!person.title ? { fontStyle: 'italic', color: 'var(--gray)' } : undefined}
              onFocus={() => { if (!person.title && titleRef.current && titleRef.current.textContent?.includes('Add title')) { titleRef.current.textContent = ''; titleRef.current.style.cssText = '' } }}
              onBlur={() => {
                const v = titleRef.current?.textContent?.trim() || ''
                if (!v) { if (titleRef.current) { titleRef.current.textContent = 'Add title\u2026'; titleRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } debouncedSave(() => onSave({ ...person, title: '', last_updated: today() })) }
                else { if (titleRef.current) titleRef.current.style.cssText = ''; if (v !== person.title) debouncedSave(() => onSave({ ...person, title: v, last_updated: today() })) }
              }}
            >{person.title || 'Add title\u2026'}</span>
          </div>
          <div className="card-meta-row">
            <span className="card-meta-label">Dept:</span>
            <span
              ref={deptRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Department"
              style={!person.department ? { fontStyle: 'italic', color: 'var(--gray)' } : undefined}
              onFocus={() => { if (!person.department && deptRef.current && deptRef.current.textContent?.includes('Add department')) { deptRef.current.textContent = ''; deptRef.current.style.cssText = '' } }}
              onBlur={() => {
                const v = deptRef.current?.textContent?.trim() || ''
                if (!v) { if (deptRef.current) { deptRef.current.textContent = 'Add department\u2026'; deptRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } debouncedSave(() => onSave({ ...person, department: '', last_updated: today() })) }
                else { if (deptRef.current) deptRef.current.style.cssText = ''; if (v !== person.department) debouncedSave(() => onSave({ ...person, department: v, last_updated: today() })) }
              }}
            >{person.department || 'Add department\u2026'}</span>
          </div>
        </div>
      </div>

      <div ref={bodyRef} className={'person-card-body' + (expanded ? ' expanded' : '')}>
        <div className="person-owners-block">
          {(['primary_owner', 'secondary_owner'] as const).map(key => (
            <div key={key} className="card-meta-row">
              <span className="card-meta-label">{key === 'primary_owner' ? 'Primary:' : 'Secondary:'}</span>
              <Picker
                value={person[key]}
                options={owners}
                placeholder={PH_PERSON}
                triggerClass={'card-owner-btn' + (!person[key] ? ' picker-placeholder' : '')}
                onChange={v => onSave({ ...person, [key]: v, last_updated: today() })}
              />
            </div>
          ))}
        </div>

        <div className="card-meta-row" style={{ marginTop: 14 }}>
          <span className="card-meta-label">Reports To:</span>
          <Picker
            value={otherPeople.find(p => p.stakeholder_id === person.reports_to)?.name || ''}
            options={otherPeople.map(p => p.name)}
            placeholder={PH_PERSON}
            triggerClass={'card-owner-btn' + (!person.reports_to ? ' picker-placeholder' : '')}
            onChange={v => {
              const match = otherPeople.find(p => p.name === v)
              if (match && isDescendantOf(match.stakeholder_id, person.stakeholder_id, allStakeholders)) {
                setRtoError(true)
                return
              }
              onSave({ ...person, reports_to: match ? match.stakeholder_id : '', last_updated: today() })
            }}
          />
        </div>
        {rtoError && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-red)', marginTop: 4, paddingLeft: 8 }}>
            Cannot create circular reporting relationship
          </div>
        )}

        <div className="card-meta-row" style={{ marginTop: 14 }}>
          <EngPicker
            ids={curEngIds}
            items={engItems}
            label={engDisplay(curEngIds, acctProjs, acctOpps)}
            onChange={ids => onSave({ ...person, engagement_id: ids.join(','), last_updated: today() })}
          />
        </div>

      </div>

      {showExpand && (
        <button
          className="card-expand-btn"
          aria-expanded={expanded}
          onClick={() => setExpanded(e => !e)}
        >{expanded ? '\u25b4' : '\u25be'}</button>
      )}

      <div style={{ position: 'relative', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 4 }}>
        <div
          className="card-section-label"
          style={{ cursor: 'pointer', marginTop: 0, userSelect: 'none' }}
          onClick={() => setNotesOpen(true)}
        >Notes{person.notes ? ' \u2022' : ''}</div>
        {notesOpen && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,.1)', padding: 8, minHeight: 60 }}>
            <div
              ref={notesRef}
              className="card-body-text"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Notes"
              onBlur={() => {
                const v = notesRef.current?.textContent?.trim() || ''
                debouncedSave(() => onSave({ ...person, notes: v, last_updated: today() }))
                setNotesOpen(false)
              }}
            >{person.notes || ''}</div>
          </div>
        )}
      </div>

      <button
        className="project-delete"
        title="Delete person"
        aria-label="Delete person"
        onClick={e => { e.stopPropagation(); onDelete(person) }}
      >×</button>
    </div>
  )
}

function EngPicker({ ids, items, label, onChange }: {
  ids: string[]
  items: Array<{ value: string; label: string; isHeader?: boolean }>
  label: string
  onChange: (ids: string[]) => void
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

  const toggle = (val: string) => {
    if (!val || val.startsWith('__h_')) return
    onChange(ids.includes(val) ? ids.filter(x => x !== val) : [...ids, val])
  }

  const handleOpen = () => { setOpen(o => !o); setQuery(''); setTimeout(() => searchRef.current?.focus(), 0) }

  const visibleItems = query
    ? items.filter(item => item.isHeader || item.value === '' || item.label.toLowerCase().includes(query.toLowerCase()))
    : items

  return (
    <div ref={ref} className="picker-wrap">
      <button className="person-eng-pill" onClick={handleOpen} aria-haspopup="listbox">
        {label}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 200 }}>
          <input
            ref={searchRef}
            className="app-popover-search"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          />
          <div className="app-popover-list">
            {visibleItems.map((item, i) =>
              item.isHeader ? (
                <div key={i} className="app-popover-section-label">{item.label}</div>
              ) : (
                <div
                  key={item.value}
                  className={'app-popover-item' + (item.value === '' ? (ids.length === 0 ? ' selected' : '') : (ids.includes(item.value) ? ' selected' : ''))}
                  onMouseDown={e => {
                    e.preventDefault()
                    if (item.value === '') { onChange([]); setOpen(false); setQuery('') }
                    else toggle(item.value)
                  }}
                >{item.label}</div>
              )
            )}
            {visibleItems.filter(i => !i.isHeader).length === 0 && (
              <div className="app-popover-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InlinePersonCard({ accountId, owners, acctProjs, acctOpps, onSaved, onDiscard }: {
  accountId: string
  owners: string[]
  acctProjs: AppState['projects']
  acctOpps: AppState['opportunities']
  onSaved: (s: Stakeholder) => void
  onDiscard: () => void
}) {
  const rec = useRef<Stakeholder>({
    stakeholder_id: newId('SH'), account_id: accountId, engagement_id: '',
    name: '', title: '', department: '', organization: 'Client',
    is_executive: 'false', sentiment: 'Unknown',
    primary_owner: '', secondary_owner: '', reports_to: '', notes: '',
    created_date: today(), last_updated: today(),
  })
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const deptRef = useRef<HTMLSpanElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const saved = useRef(false)

  useEffect(() => { nameRef.current?.focus() }, [])

  const saveIfReady = async () => {
    if (saved.current || !rec.current.name.trim()) return
    saved.current = true
    if (nameRef.current) nameRef.current.classList.remove('field-required-highlight')
    rec.current.last_updated = today()
    await upsertStakeholder(rec.current)
    onSaved({ ...rec.current })
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const card = nameRef.current?.closest('.person-card')
      if (!card) return
      if (card.contains(e.target as Node)) return
      if ((e.target as Element).closest('.app-popover,.app-modal-overlay')) return
      if (!saved.current) {
        if (rec.current.name.trim()) saveIfReady()
        else onDiscard()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="person-card new-card" style={{ border: '1.5px dashed var(--pink)' }}>
      <button className="project-delete" title="Discard" onClick={onDiscard}>×</button>

      <div className="person-card-top">
        <div ref={avatarRef} className="avatar client">?</div>
        <div className="person-card-info">
          <div
            ref={nameRef}
            className="name field-required-highlight"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Name"
            data-placeholder="Full name…"
            style={{ color: 'var(--text)' }}
            onInput={() => {
              const v = nameRef.current?.textContent?.trim() || ''
              rec.current.name = v
              if (nameRef.current) nameRef.current.classList.toggle('field-required-highlight', !v)
              if (avatarRef.current) avatarRef.current.textContent = v ? initials(v) : '?'
            }}
            onBlur={() => {
              rec.current.name = nameRef.current?.textContent?.trim() || ''
              if (rec.current.name && !saved.current) saveIfReady()
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveIfReady() } if (e.key === 'Escape') onDiscard() }}
          />
          <div className="card-meta-row">
            <span className="card-meta-label">Title:</span>
            <span
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Title"
              style={{ fontStyle: 'italic', color: 'var(--gray)' }}
              onFocus={() => { if (titleRef.current && titleRef.current.textContent?.includes('Add title')) { titleRef.current.textContent = ''; titleRef.current.style.cssText = '' } }}
              onBlur={() => { const v = titleRef.current?.textContent?.trim() || ''; rec.current.title = v; if (!v && titleRef.current) { titleRef.current.textContent = 'Add title\u2026'; titleRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } }}
            >Add title…</span>
          </div>
          <div className="card-meta-row">
            <span className="card-meta-label">Dept:</span>
            <span
              ref={deptRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Department"
              style={{ fontStyle: 'italic', color: 'var(--gray)' }}
              onFocus={() => { if (deptRef.current && deptRef.current.textContent?.includes('Add department')) { deptRef.current.textContent = ''; deptRef.current.style.cssText = '' } }}
              onBlur={() => { const v = deptRef.current?.textContent?.trim() || ''; rec.current.department = v; if (!v && deptRef.current) { deptRef.current.textContent = 'Add department\u2026'; deptRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } }}
            >Add department…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
