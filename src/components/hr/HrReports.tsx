'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppModal } from '@/components/shared/AppModal'
import type { HrDB } from './types'
import { STAGES, getList } from './types'

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

const ACT_COLORS: Record<string, string> = {
  add: 'var(--accent)', hire: 'var(--accent-text)', stage: 'var(--amber)',
  offboard: 'var(--red)', device: 'var(--text3)', interview: 'var(--accent)',
}

function def30ago() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] }
function todayStr()  { return new Date().toISOString().split('T')[0] }

export default function HrReports({ db, setDb, setSyncState }: Props) {
  const [from, setFrom] = useState(def30ago)
  const [to, setTo]     = useState(todayStr)
  const [pending, setPending] = useState({ from, to })
  const { modal, showModal }  = useAppModal()

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  function applyFilter() { setPending({ from, to }) }

  async function clearActivity() {
    const { buttonValue } = await showModal({ title: 'Clear Activity', message: 'Clear all activity log entries? This cannot be undone.', confirmLabel: 'Clear All', dangerConfirm: true })
    if (buttonValue !== 'confirm') return
    setDb(prev => ({ ...prev, activities: [] }))
    await dbMulti([() => supabase.from('activities').delete().neq('id', '__none__')])
  }

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
      {modal}

      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Pipeline analytics</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-20)' }}>
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
      <div className="stat-grid" style={{ marginBottom: 'var(--spacing-12)' }}>
        <div className="stat-card"><div className="stat-label">Total Candidates</div><div className="stat-value">{total}</div></div>
        <div className="stat-card"><div className="stat-label">Hired</div><div className="stat-value stat-value-green">{hired}</div></div>
        <div className="stat-card"><div className="stat-label">Active Pipeline</div><div className="stat-value">{active}</div></div>
        <div className="stat-card"><div className="stat-label">Interviews Logged</div><div className="stat-value">{totalIv}</div></div>
      </div>

      <div className="section-sublabel">Period ({pending.from} to {pending.to})</div>
      <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
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
        <div className="card" style={{ marginTop: 'var(--spacing-md)' }}>
          <div className="card-section-hdr">By Department</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {depts.map(sp => (
              <div key={sp} className="report-spec-card">
                <div className="report-spec-count">{db.candidates.filter(c => c.dept === sp).length}</div>
                <div className="report-spec-label">{sp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--spacing-md)' }}>
        <div className="card-section-hdr">
          Recent Activity
          {db.activities.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearActivity}>Clear All</button>
          )}
        </div>
        {db.activities.slice(0, 50).length === 0 ? (
          <div className="activity-empty">No activity yet</div>
        ) : db.activities.slice(0, 50).map(a => (
          <div key={a.id} className="activity-row">
            <div className="activity-dot" style={{ background: ACT_COLORS[a.type] || 'var(--text3)' }} />
            <div className="activity-info">
              <div className="activity-desc">{a.desc}</div>
              <div className="activity-time">{relTime(a.at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
