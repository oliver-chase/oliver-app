'use client'
import { useState } from 'react'
import type { HrDB } from './types'
import { STAGES, getList } from './types'

interface Props {
  db: HrDB
}

function def30ago() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] }
function todayStr()  { return new Date().toISOString().split('T')[0] }

export default function HrReports({ db }: Props) {
  const [from, setFrom] = useState(def30ago)
  const [to, setTo]     = useState(todayStr)
  const [pending, setPending] = useState({ from, to })

  function applyFilter() { setPending({ from, to }) }

  const total   = db.candidates.length
  const hired   = db.candidates.filter(c => c.candStatus === 'Hired').length
  const active  = db.candidates.filter(c => c.candStatus === 'Active').length
  const totalIv = db.interviews.length

  const addedInPeriod = db.candidates.filter(c => c.addedAt && c.addedAt.split('T')[0] >= pending.from && c.addedAt.split('T')[0] <= pending.to).length
  const ivsInPeriod   = db.interviews.filter(iv => iv.date && iv.date >= pending.from && iv.date <= pending.to).length

  const sources = [...new Set(db.candidates.map(c => c.source).filter(Boolean))]
  const depts   = [...new Set(db.candidates.map(c => c.dept).filter(Boolean))]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Pipeline analytics</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="report-card-label">Date Range</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--spacing-md)' }} onClick={applyFilter}>Apply</button>
        </div>
      </div>

      <div className="section-sublabel">All-time</div>
      <div className="stat-grid" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="stat-card"><div className="stat-label">Total Candidates</div><div className="stat-value">{total}</div></div>
        <div className="stat-card"><div className="stat-label">Hired</div><div className="stat-value stat-value-green">{hired}</div></div>
        <div className="stat-card"><div className="stat-label">Active Pipeline</div><div className="stat-value">{active}</div></div>
        <div className="stat-card"><div className="stat-label">Interviews Logged</div><div className="stat-value">{totalIv}</div></div>
      </div>

      <div className="section-sublabel">Period ({pending.from} to {pending.to})</div>
      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--spacing-lg)' }}>
        <div className="stat-card"><div className="stat-label">Added this period</div><div className="stat-value">{addedInPeriod}</div></div>
        <div className="stat-card"><div className="stat-label">Interviews this period</div><div className="stat-value">{ivsInPeriod}</div></div>
      </div>

      <div className="reports-grid">
        <div className="card">
          <div className="card-section-hdr">By Stage</div>
          {STAGES.map(s => {
            const n   = db.candidates.filter(c => c.stage === s).length
            const pct = total ? Math.round(n / total * 100) : 0
            return (
              <div key={s} className="report-stage-item">
                <div className="report-stage-hdr">
                  <span className="report-stage-cap">{s}</span>
                  <span className="report-stage-count">{n}</span>
                </div>
                <div className="report-bar-bg"><div className="report-bar-fill" style={{ width: pct + '%' }} /></div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-section-hdr">By Status</div>
          {getList(db.lists, 'candStatus').map(s => {
            const n = db.candidates.filter(c => c.candStatus === s).length
            const COLOR: Record<string, string> = { Active: 'purple', 'On Hold': 'amber', Nurturing: 'gray', Hired: 'purple', Closed: 'gray' }
            return (
              <div key={s} className="report-list-row">
                <span className={'pill pill-' + (COLOR[s] || 'gray')}>{s}</span>
                <span className="report-list-count">{n}</span>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-section-hdr">By Source</div>
          {sources.length === 0 ? (
            <div className="kanban-meta-text">No data</div>
          ) : sources.map(src => (
            <div key={src} className="report-list-row">
              <span className="report-source-label">{src}</span>
              <span className="report-list-count">{db.candidates.filter(c => c.source === src).length}</span>
            </div>
          ))}
        </div>
      </div>

      {depts.length > 0 && (
        <div className="card hr-card-group">
          <div className="card-section-hdr">By Department</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {depts.map(sp => (
              <div key={sp} className="report-spec-card">
                <div className="report-spec-count">{db.candidates.filter(c => c.dept === sp).length}</div>
                <div className="report-spec-label">{sp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
