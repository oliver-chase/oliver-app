'use client'
import { useState } from 'react'
import type { Employee } from './types'

interface Props { employees: Employee[] }

export default function HrDirectory({ employees }: Props) {
  const [q, setQ]         = useState('')
  const [dept, setDept]   = useState('')
  const [status, setStatus] = useState('')

  const depts    = [...new Set(employees.map(e => e.dept).filter(Boolean))]
  const statuses = [...new Set(employees.map(e => e.status).filter(Boolean))]

  const list = employees.filter(e => {
    if (q && !(e.name + ' ' + e.role + ' ' + (e.city || '')).toLowerCase().includes(q.toLowerCase())) return false
    if (dept && e.dept !== dept) return false
    if (status && e.status !== status) return false
    return true
  })

  return (
    <div className="page">
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Directory</div>
            <div className="page-subtitle">{employees.length} employees</div>
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
          <select className="filter-select" value={dept} onChange={e => setDept(e.target.value)}>
            <option value="">All departments</option>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="dash-empty" style={{ padding: '32px 0' }}>No employees match this filter.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Dept</th><th>Status</th><th>Location</th><th>Start Date</th><th>Manager</th>
              </tr>
            </thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 500 }}>{e.name}</td>
                  <td>{e.role}</td>
                  <td>{e.dept}</td>
                  <td>
                    <span className="pill pill-gray">{e.status}</span>
                  </td>
                  <td>{[e.city, e.state].filter(Boolean).join(', ')}</td>
                  <td style={{ color: 'var(--gray)' }}>{e.startDate?.slice(0, 10) || ''}</td>
                  <td style={{ color: 'var(--gray)' }}>{e.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
