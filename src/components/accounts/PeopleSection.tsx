'use client'
import { useState, useRef } from 'react'
import { upsertStakeholder, deleteRecord, newId, today } from '@/lib/db'
import type { Stakeholder, Background, AppState } from '@/types'
import { Picker } from './Picker'

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

const SENTIMENT_OPTIONS: Stakeholder['sentiment'][] = ['Champion', 'Supporter', 'Neutral', 'Detractor', 'Unknown']

function sentimentClass(s: Stakeholder['sentiment']) {
  const map: Record<string, string> = {
    Champion: 'app-chip app-chip-champion',
    Supporter: 'app-chip app-chip-supporter',
    Neutral: 'app-chip app-chip-neutral',
    Detractor: 'app-chip app-chip-detractor',
    Unknown: 'app-chip app-chip-unknown',
  }
  return map[s] || 'app-chip app-chip-neutral'
}

function initials(name: string) {
  return name.split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2)
}

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function PeopleSection({ accountId, data, setData }: Props) {
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const people = data.stakeholders
    .filter(s => s.account_id === accountId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const save = async (s: Stakeholder) => {
    setData(prev => ({ ...prev, stakeholders: prev.stakeholders.map(x => x.stakeholder_id === s.stakeholder_id ? s : x) }))
    await upsertStakeholder(s)
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) { nameInputRef.current?.focus(); return }
    const s: Stakeholder = {
      stakeholder_id: newId('STK'), account_id: accountId, engagement_id: '',
      name, title: newTitle.trim(), department: '', organization: 'Client',
      is_executive: false, sentiment: 'Unknown',
      primary_owner: '', secondary_owner: '', reports_to: '', notes: '',
      created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, stakeholders: [...prev.stakeholders, s] }))
    await upsertStakeholder(s)
    setNewName(''); setNewTitle(''); setAdding(false)
  }

  const remove = async (s: Stakeholder) => {
    if (!window.confirm('Delete ' + s.name + '?')) return
    setData(prev => ({ ...prev, stakeholders: prev.stakeholders.filter(x => x.stakeholder_id !== s.stakeholder_id) }))
    await deleteRecord('stakeholders', 'stakeholder_id', s.stakeholder_id)
  }

  const reportsToOptions = people.map(p => p.name)

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <button className="btn-acct-action" onClick={() => { setAdding(true); setTimeout(() => nameInputRef.current?.focus(), 50) }}>
          + Add Person
        </button>
      </div>

      {adding && (
        <div className="inline-form" style={{ marginBottom: 12 }}>
          <div className="inline-form-title">New Person</div>
          <div className="inline-form-row">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                ref={nameInputRef}
                className="form-input field-required-highlight"
                placeholder="Full name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                placeholder="Job title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
              />
            </div>
          </div>
          <div className="inline-form-actions">
            <button className="btn-acct-action" onClick={add}>Save</button>
            <button className="btn-acct-action" onClick={() => { setAdding(false); setNewName(''); setNewTitle('') }}>Cancel</button>
          </div>
        </div>
      )}

      {people.length === 0 && !adding && <div className="empty-state">No people yet</div>}

      <div className="people-grid">
        {people.map(p => (
          <PersonCard
            key={p.stakeholder_id}
            person={p}
            owners={owners}
            reportsToOptions={reportsToOptions}
            onSave={save}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  )
}

function PersonCard({ person, owners, reportsToOptions, onSave, onDelete }: {
  person: Stakeholder
  owners: string[]
  reportsToOptions: string[]
  onSave: (s: Stakeholder) => Promise<void>
  onDelete: (s: Stakeholder) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const deptRef = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const isClient = person.organization !== 'V.Two'

  return (
    <div className="person-card">
      <div className="person-card-top">
        <div className={'avatar ' + (isClient ? 'client' : 'vtwo')}>{initials(person.name)}</div>
        <div className="person-card-info">
          <div
            ref={nameRef}
            className="name"
            contentEditable
            suppressContentEditableWarning
            onBlur={() => {
              const v = nameRef.current?.textContent?.trim() || ''
              if (v !== person.name) onSave({ ...person, name: v || person.name, last_updated: today() })
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
          >
            {person.name}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray)', marginTop: 2 }}>
            <div
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={() => {
                const v = titleRef.current?.textContent?.trim() || ''
                if (v !== person.title) onSave({ ...person, title: v, last_updated: today() })
              }}
            >
              {person.title || <span style={{ fontStyle: 'italic' }}>Title</span>}
            </div>
            <div
              ref={deptRef}
              contentEditable
              suppressContentEditableWarning
              style={{ marginTop: 1 }}
              onBlur={() => {
                const v = deptRef.current?.textContent?.trim() || ''
                if (v !== person.department) onSave({ ...person, department: v, last_updated: today() })
              }}
            >
              {person.department || <span style={{ fontStyle: 'italic' }}>Department</span>}
            </div>
          </div>
        </div>
        <Picker
          value={person.sentiment}
          options={SENTIMENT_OPTIONS as unknown as string[]}
          triggerClass={sentimentClass(person.sentiment) + ' app-badge--clickable'}
          onChange={v => onSave({ ...person, sentiment: v as Stakeholder['sentiment'], last_updated: today() })}
        />
      </div>

      <div className={'person-card-body' + (expanded ? ' expanded' : '')}>
        <div className="person-owners-block">
          <div className="card-meta-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="card-section-label">Primary</span>
            <Picker value={person.primary_owner} options={owners} placeholder="Owner" onChange={v => onSave({ ...person, primary_owner: v, last_updated: today() })} />
          </div>
          <div className="card-meta-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="card-section-label">Secondary</span>
            <Picker value={person.secondary_owner} options={owners} placeholder="Owner" onChange={v => onSave({ ...person, secondary_owner: v, last_updated: today() })} />
          </div>
        </div>

        {reportsToOptions.length > 0 && (
          <div className="person-reports-to">
            Reports to:{' '}
            <Picker
              value={person.reports_to}
              options={reportsToOptions.filter(n => n !== person.name)}
              placeholder="—"
              onChange={v => onSave({ ...person, reports_to: v, last_updated: today() })}
            />
          </div>
        )}

        <div className="card-section-label" style={{ marginTop: 8 }}>Notes</div>
        <div
          ref={notesRef}
          className="notes-text"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            const v = notesRef.current?.textContent?.trim() || ''
            if (v !== person.notes) onSave({ ...person, notes: v, last_updated: today() })
          }}
        >
          {person.notes || <span style={{ fontStyle: 'italic', color: 'var(--gray)' }}>Notes…</span>}
        </div>

        <button
          className="btn-acct-action danger"
          style={{ marginTop: 10, fontSize: 'var(--font-size-xs)' }}
          onClick={() => onDelete(person)}
        >
          Delete
        </button>
      </div>

      <button className="card-expand-btn" style={{ display: 'block' }} onClick={() => setExpanded(e => !e)}>
        {expanded ? '▲' : '▼'}
      </button>
    </div>
  )
}
