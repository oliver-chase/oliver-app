'use client'
import { useState, useRef } from 'react'
import { upsertAction, deleteRecord, newId, today } from '@/lib/db'
import type { Action, Background, AppState } from '@/types'
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

const STATUS_OPTIONS: Action['status'][] = ['Open', 'In Progress', 'Done']

function statusClass(status: Action['status']) {
  if (status === 'Done') return 'app-badge app-badge-complete app-badge--clickable'
  if (status === 'In Progress') return 'app-badge app-badge-progress app-badge--clickable'
  return 'app-badge app-badge-open app-badge--clickable'
}

interface Props {
  accountId: string
  data: AppState
  setData: React.Dispatch<React.SetStateAction<AppState>>
}

export default function ActionsSection({ accountId, data, setData }: Props) {
  const actions = data.actions.filter(a => a.account_id === accountId)
  const bg = data.background.find(b => b.account_id === accountId && !b.engagement_id)
  const owners = getTeamNames(bg)
  const [sortCol, setSortCol] = useState<'description' | 'owner' | 'status' | 'created_date'>('created_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const descRef = useRef<HTMLInputElement>(null)

  const sorted = [...actions].sort((a, b) => {
    const av = a[sortCol] || ''
    const bv = b[sortCol] || ''
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const handleSort = (col: typeof sortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const save = async (action: Action) => {
    setData(prev => ({ ...prev, actions: prev.actions.map(a => a.action_id === action.action_id ? action : a) }))
    await upsertAction(action)
  }

  const add = async () => {
    const desc = newDesc.trim()
    if (!desc) { descRef.current?.focus(); return }
    const a: Action = {
      action_id: newId('ACT'), account_id: accountId, engagement_id: '',
      description: desc, owner: newOwner, status: 'Open',
      closed_date: '', created_date: today(), last_updated: today(),
    }
    setData(prev => ({ ...prev, actions: [a, ...prev.actions] }))
    await upsertAction(a)
    setNewDesc(''); setNewOwner(''); setAdding(false)
  }

  const remove = async (a: Action) => {
    if (!window.confirm('Delete this action?')) return
    setData(prev => ({ ...prev, actions: prev.actions.filter(x => x.action_id !== a.action_id) }))
    await deleteRecord('actions', 'action_id', a.action_id)
  }

  const arrow = (col: typeof sortCol) => {
    if (sortCol !== col) return null
    return <span className="sort-arrow" style={{ opacity: 1 }}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
  }

  return (
    <div>
      <div className="section-header-row2" style={{ marginBottom: 10 }}>
        <div />
        <button className="btn-acct-action" onClick={() => { setAdding(true); setTimeout(() => descRef.current?.focus(), 50) }}>
          + Add Action
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('description')}>Description{arrow('description')}</th>
              <th onClick={() => handleSort('owner')}>Owner{arrow('owner')}</th>
              <th onClick={() => handleSort('status')}>Status{arrow('status')}</th>
              <th onClick={() => handleSort('created_date')}>Created{arrow('created_date')}</th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr>
                <td>
                  <input
                    ref={descRef}
                    className="form-input"
                    style={{ margin: 0 }}
                    placeholder="Description"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false) }}
                  />
                </td>
                <td>
                  <Picker value={newOwner} options={owners} placeholder="Owner" onChange={setNewOwner} />
                </td>
                <td colSpan={2} />
                <td>
                  <button className="btn-acct-action" onClick={add}>Save</button>
                </td>
              </tr>
            )}
            {sorted.length === 0 && !adding && (
              <tr><td colSpan={5}><div className="empty-state">No actions yet</div></td></tr>
            )}
            {sorted.map(a => (
              <ActionRow key={a.action_id} action={a} owners={owners} onSave={save} onDelete={remove} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionRow({ action, owners, onSave, onDelete }: {
  action: Action
  owners: string[]
  onSave: (a: Action) => Promise<void>
  onDelete: (a: Action) => Promise<void>
}) {
  const descRef = useRef<HTMLDivElement>(null)

  return (
    <tr className={action.status === 'Done' ? 'done-row' : ''}>
      <td>
        <div
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
        </div>
      </td>
      <td>
        <Picker
          value={action.owner}
          options={owners}
          placeholder="—"
          onChange={v => onSave({ ...action, owner: v, last_updated: today() })}
        />
      </td>
      <td>
        <Picker
          value={action.status}
          options={STATUS_OPTIONS as unknown as string[]}
          triggerClass={statusClass(action.status)}
          onChange={v => onSave({ ...action, status: v as Action['status'], last_updated: today() })}
        />
      </td>
      <td style={{ color: 'var(--gray)', fontSize: 'var(--font-size-xs)' }}>{action.created_date}</td>
      <td>
        <button className="btn-acct-action danger" style={{ padding: '2px 6px' }} onClick={() => onDelete(action)}>×</button>
      </td>
    </tr>
  )
}
