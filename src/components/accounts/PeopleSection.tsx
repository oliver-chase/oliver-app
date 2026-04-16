'use client'
import { useState, useRef, useEffect } from 'react'
import { upsertStakeholder, deleteRecord, newId, today } from '@/lib/db'
import type { Stakeholder, Background, AppState } from '@/types'
import { Picker } from './Picker'

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

const PH_PERSON = 'Select person'

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function PeopleSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [adding, setAdding] = useState(false)
  const [sortBy, setSortBy] = useState('name')

  const acctProjs = data.projects.filter(p => p.account_id === accountId)
  const acctOpps = data.opportunities.filter(o => o.account_id === accountId)

  const people = data.stakeholders
    .filter(s => s.account_id === accountId)
    .sort((a, b) => {
      if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '')
      return a.name.localeCompare(b.name)
    })

  const save = async (s: Stakeholder) => {
    setData(prev => ({ ...prev, stakeholders: prev.stakeholders.map(x => x.stakeholder_id === s.stakeholder_id ? s : x) }))
    await upsertStakeholder(s)
  }

  const add = (s: Stakeholder) => {
    setData(prev => ({ ...prev, stakeholders: [...prev.stakeholders, s] }))
    setAdding(false)
  }

  const remove = async (s: Stakeholder) => {
    if (!window.confirm('Delete ' + s.name + '?')) return
    setData(prev => ({ ...prev, stakeholders: prev.stakeholders.filter(x => x.stakeholder_id !== s.stakeholder_id) }))
    await deleteRecord('stakeholders', 'stakeholder_id', s.stakeholder_id)
  }

  return (
    <div>
      <div className="app-section-header">
        <div className="app-section-title">People</div>
        <div className="section-header-row2">
          <div className="section-header-left">
            <button className="btn-ghost btn--compact" onClick={() => setAdding(true)}>+ Add person</button>
          </div>
          <div className="section-actions">
            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort people"
            >
              <option value="name">Name A–Z</option>
              <option value="department">Department</option>
            </select>
          </div>
        </div>
      </div>

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
        {people.map(p => (
          <PersonCard
            key={p.stakeholder_id}
            person={p}
            owners={owners}
            otherPeople={people.filter(x => x.stakeholder_id !== p.stakeholder_id)}
            acctProjs={acctProjs}
            acctOpps={acctOpps}
            onSave={save}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  )
}

function PersonCard({ person, owners, otherPeople, acctProjs, acctOpps, onSave, onDelete }: {
  person: Stakeholder
  owners: string[]
  otherPeople: Stakeholder[]
  acctProjs: AppState['projects']
  acctOpps: AppState['opportunities']
  onSave: (s: Stakeholder) => Promise<void>
  onDelete: (s: Stakeholder) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const deptRef = useRef<HTMLSpanElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)
  const [showExpand, setShowExpand] = useState(true) // always show expand since body has content
  const isClient = (person.organization || '').toLowerCase() !== 'v.two'

  const curEngIds = (person.engagement_id || '').split(',').map(s => s.trim()).filter(Boolean)
  const engItems = buildEngItems(acctProjs, acctOpps)

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
                onSave({ ...person, name: v, last_updated: today() })
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
          >
            {person.name}
          </div>
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
                if (!v) { if (titleRef.current) { titleRef.current.textContent = 'Add title…'; titleRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } onSave({ ...person, title: '', last_updated: today() }) }
                else { if (titleRef.current) titleRef.current.style.cssText = ''; if (v !== person.title) onSave({ ...person, title: v, last_updated: today() }) }
              }}
            >
              {person.title || 'Add title…'}
            </span>
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
                if (!v) { if (deptRef.current) { deptRef.current.textContent = 'Add department…'; deptRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } onSave({ ...person, department: '', last_updated: today() }) }
                else { if (deptRef.current) deptRef.current.style.cssText = ''; if (v !== person.department) onSave({ ...person, department: v, last_updated: today() }) }
              }}
            >
              {person.department || 'Add department…'}
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible body */}
      <div ref={bodyRef} className={'person-card-body' + (expanded ? ' expanded' : '')}>
        <div className="person-owners-block">
          {(['primary_owner', 'secondary_owner'] as const).map(key => (
            <div key={key} className="card-meta-row">
              <span className="card-meta-label">{key === 'primary_owner' ? 'Primary:' : 'Secondary:'}</span>
              <Picker
                value={person[key]}
                options={[...owners, '']}
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
            options={[...otherPeople.map(p => p.name), '']}
            placeholder={PH_PERSON}
            triggerClass={'card-owner-btn' + (!person.reports_to ? ' picker-placeholder' : '')}
            onChange={v => {
              const match = otherPeople.find(p => p.name === v)
              onSave({ ...person, reports_to: match ? match.stakeholder_id : '', last_updated: today() })
            }}
          />
        </div>

        {/* Project/opp engagement */}
        <div className="card-meta-row" style={{ marginTop: 14 }}>
          <EngPicker
            ids={curEngIds}
            items={engItems}
            label={engDisplay(curEngIds, acctProjs, acctOpps)}
            onChange={ids => onSave({ ...person, engagement_id: ids.join(','), last_updated: today() })}
          />
        </div>

        <div className="card-section-label">Notes</div>
        <div
          ref={notesRef}
          className="card-body-text"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Notes"
          onFocus={() => {
            if (!expanded) {
              setExpanded(true)
            }
          }}
          onBlur={() => {
            const v = notesRef.current?.textContent?.trim() || ''
            if (v !== person.notes) onSave({ ...person, notes: v, last_updated: today() })
          }}
        >
          {person.notes}
        </div>
      </div>

      {showExpand && (
        <button
          className="card-expand-btn"
          style={{ display: 'block' }}
          aria-expanded={expanded}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? '▴' : '▾'}
        </button>
      )}

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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (val: string) => {
    if (!val || val.startsWith('__h_')) return
    onChange(ids.includes(val) ? ids.filter(x => x !== val) : [...ids, val])
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="person-eng-pill" onClick={() => setOpen(o => !o)} aria-haspopup="listbox">
        {label}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 200 }}>
          <div className="app-popover-list">
            {items.map((item, i) =>
              item.isHeader ? (
                <div key={i} className="app-popover-section-label">{item.label}</div>
              ) : (
                <div
                  key={item.value}
                  className={'app-popover-item' + (item.value === '' ? (ids.length === 0 ? ' selected' : '') : (ids.includes(item.value) ? ' selected' : ''))}
                  onMouseDown={e => {
                    e.preventDefault()
                    if (item.value === '') { onChange([]); setOpen(false) }
                    else toggle(item.value)
                  }}
                >
                  {item.label}
                </div>
              )
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
    is_executive: false, sentiment: 'Unknown',
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
      <button
        className="project-delete"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        title="Discard"
        onClick={onDiscard}
      >×</button>

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
              onBlur={() => { const v = titleRef.current?.textContent?.trim() || ''; rec.current.title = v; if (!v && titleRef.current) { titleRef.current.textContent = 'Add title…'; titleRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } }}
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
              onBlur={() => { const v = deptRef.current?.textContent?.trim() || ''; rec.current.department = v; if (!v && deptRef.current) { deptRef.current.textContent = 'Add department…'; deptRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } }}
            >Add department…</span>
          </div>
        </div>
      </div>
    </div>
  )
}
