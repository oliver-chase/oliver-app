'use client'
import { useState } from 'react'
import type { Candidate } from './types'
import { STAGES } from './types'

interface Props { candidates: Candidate[] }

const STAGE_COLOR: Record<string, string> = {
  sourced: 'gray', screening: 'gray', interview: 'amber', offer: 'purple', hired: 'purple',
}
const STATUS_COLOR: Record<string, string> = {
  'Active': 'purple', 'On Hold': 'amber', 'Nurturing': 'gray', 'Hired': 'purple', 'Closed': 'gray',
}

function StagePill({ stage }: { stage: string }) {
  const label = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : '\u2014'
  return <span className={'pill pill-' + (STAGE_COLOR[stage] || 'gray')}>{label}</span>
}
function StatusPill({ status }: { status: string }) {
  return <span className={'pill pill-' + (STATUS_COLOR[status] || 'gray')}>{status}</span>
}

export default function HrHiring({ candidates }: Props) {
  const [q, setQ]           = useState('')
  const [status, setStatus] = useState('')
  const [stage, setStage]   = useState('')
  const [dept, setDept]     = useState('')
  const [view, setView]     = useState<'kanban' | 'table'>('kanban')

  const statuses = [...new Set(candidates.map(c => c.candStatus).filter(Boolean))]
  const depts    = [...new Set(candidates.map(c => c.dept).filter(Boolean))]

  function filtered() {
    let list = [...candidates]
    if (view === 'kanban' && !status) list = list.filter(c => c.candStatus !== 'Hired' && c.candStatus !== 'Closed')
    if (q)      list = list.filter(c => (c.name + ' ' + c.role + ' ' + (c.city || '')).toLowerCase().includes(q.toLowerCase()))
    if (status) list = list.filter(c => c.candStatus === status)
    if (stage)  list = list.filter(c => c.stage === stage)
    if (dept)   list = list.filter(c => c.dept === dept)
    return list
  }

  const list = filtered()

  return (
    <div className="page page--split" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Hiring Pipeline</div>
            <div className="page-subtitle">{candidates.length} candidates</div>
          </div>
          <div className="view-toggle">
            <button className={'view-btn' + (view === 'kanban' ? ' active' : '')} onClick={() => setView('kanban')}>Kanban</button>
            <button className={'view-btn' + (view === 'table' ? ' active' : '')} onClick={() => setView('table')}>Table</button>
          </div>
        </div>
        <div className="filter-bar">
          <div className="filter-search">
            <input placeholder="Search name, role, city..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={stage} onChange={e => setStage(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="filter-select" value={dept} onChange={e => setDept(e.target.value)}>
            <option value="">All departments</option>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {view === 'kanban' ? (
          <div className="kanban">
            {STAGES.map(s => {
              const col = list.filter(c => c.stage === s)
              return (
                <div key={s} className="kanban-col">
                  <div className="kanban-col-header">
                    <span className="kanban-col-name">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                    <span className="kanban-count">{col.length}</span>
                  </div>
                  {col.map(c => (
                    <div key={c.id} className="kanban-card">
                      <div className="kanban-name">{c.name}</div>
                      <div className="kanban-role">{c.role}</div>
                      <div className="kanban-meta">
                        <StatusPill status={c.candStatus} />
                        {c.dept && <span className="pill pill-gray pill-xs">{c.dept}</span>}
                      </div>
                      {(c.city || c.state) && (
                        <div className="kanban-footer">
                          <span className="kanban-meta-text">{[c.city, c.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length === 0 && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text3)', padding: '8px 0' }}>Empty</div>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Role</th><th>Dept</th><th>Stage</th><th>Status</th><th>Location</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--gray)' }}>No candidates match this filter.</td></tr>
                ) : list.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.role}</td>
                    <td>{c.dept}</td>
                    <td><StagePill stage={c.stage} /></td>
                    <td><StatusPill status={c.candStatus} /></td>
                    <td>{[c.city, c.state].filter(Boolean).join(', ')}</td>
                    <td style={{ color: 'var(--gray)' }}>{(c.updatedAt || c.addedAt || '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
