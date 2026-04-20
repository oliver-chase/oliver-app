'use client'
import { useState } from 'react'
import type { HrDB } from './types'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

function relTime(d: string) {
  if (!d) return '—'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return days + 'd ago'
  if (days < 30) return Math.floor(days / 7) + 'w ago'
  return Math.floor(days / 30) + 'mo ago'
}

type SortCol = 'name' | 'device' | 'assignedAt'

export default function HrAssignments({ db }: Props) {
  const [q, setQ]             = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  function sortBy(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(1) }
  }

  const active = (() => {
    let list = db.assignments.filter(a => a.status === 'active')
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(a => {
        const emp = db.employees.find(e => e.id === a.employeeId)
        const dev = db.devices.find(d => d.id === a.deviceId)
        return (emp?.name || '').toLowerCase().includes(lq) || (dev?.name || '').toLowerCase().includes(lq)
      })
    }
    list.sort((a, b) => {
      let av = '', bv = ''
      if (sortCol === 'name') { av = db.employees.find(e => e.id === a.employeeId)?.name || ''; bv = db.employees.find(e => e.id === b.employeeId)?.name || '' }
      else if (sortCol === 'device') { av = db.devices.find(d => d.id === a.deviceId)?.name || ''; bv = db.devices.find(d => d.id === b.deviceId)?.name || '' }
      else if (sortCol === 'assignedAt') { av = a.assignedAt || ''; bv = b.assignedAt || '' }
      return av.localeCompare(bv) * sortDir
    })
    return list
  })()

  function th(col: SortCol, label: string) {
    return (
      <th className={sortCol === col ? 'sorted' : ''} onClick={() => sortBy(col)}>
        {label}
        {sortCol === col && <span className="sort-arrow">{sortDir === 1 ? '↑' : '↓'}</span>}
      </th>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Assignments</div>
          <div className="page-subtitle">{active.length} active</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
          <input placeholder="Filter by employee or device..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {th('name', 'Employee')}
              {th('device', 'Device')}
              <th>Serial</th>
              {th('assignedAt', 'Assigned')}
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--text3)' }}>No active assignments.</td></tr>
            ) : active.map(a => {
              const emp = db.employees.find(e => e.id === a.employeeId) || { name: 'Unknown', id: '' }
              const dev = db.devices.find(d => d.id === a.deviceId) || { name: 'Unknown', serial: '', id: '' }
              const ini = (emp.name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase()
              return (
                <tr key={a.id}>
                  <td>
                    <div className="person-cell">
                      <div className="person-av" style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>{ini}</div>
                      <div className="person-name">{emp.name}</div>
                    </div>
                  </td>
                  <td>{dev.name}</td>
                  <td className="td-mono">{dev.serial || '—'}</td>
                  <td>{relTime(a.assignedAt)}</td>
                  <td><span className="pill pill-purple">Active</span></td>
                  <td></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
