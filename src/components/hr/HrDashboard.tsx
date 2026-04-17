'use client'
import type { HrDB } from './types'

interface Props {
  db: HrDB
  onNav: (page: string) => void
}

function initials(name: string) {
  return (name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase()
}

function daysFromNow(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export default function HrDashboard({ db, onNav }: Props) {
  const activeReqs       = db.candidates.filter(c => c.candStatus !== 'Hired' && c.candStatus !== 'Closed').length
  const totalEmps        = db.employees.length
  const activeOnboarding = db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'onboarding').length
  const activeOffboard   = db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'offboarding').length

  const upcoming = db.employees
    .filter(e => e.startDate)
    .map(e => ({ ...e, daysAway: daysFromNow(e.startDate) }))
    .filter(e => e.daysAway >= 0 && e.daysAway <= 30)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 5)

  const recentCands = [...db.candidates]
    .sort((a, b) => (b.updatedAt || b.addedAt || '').localeCompare(a.updatedAt || a.addedAt || ''))
    .slice(0, 5)

  return (
    <div className="page">
      <div className="stat-grid">
        <div className="stat-card" onClick={() => onNav('hiring')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Active Reqs</div>
          <div className="stat-value">{activeReqs}</div>
        </div>
        <div className="stat-card" onClick={() => onNav('directory')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Employees</div>
          <div className="stat-value">{totalEmps}</div>
        </div>
        <div className="stat-card" onClick={() => onNav('onboarding')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Onboarding</div>
          <div className="stat-value">{activeOnboarding}</div>
        </div>
        <div className="stat-card" onClick={() => onNav('offboarding')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Offboarding</div>
          <div className="stat-value">{activeOffboard}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Upcoming Starts</div>
            <button className="btn-link" onClick={() => onNav('directory')}>View all</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="dash-empty">No upcoming starts in the next 30 days.</div>
          ) : upcoming.map(e => (
            <div key={e.id} className="dash-row" onClick={() => onNav('directory')} style={{ cursor: 'pointer' }}>
              <div className="dash-row-left">
                <div className="dash-av dash-av--start">{initials(e.name)}</div>
                <div>
                  <div className="dash-row-name">{e.name}</div>
                  <div className="dash-row-sub">{e.role}</div>
                </div>
              </div>
              <div className="dash-row-right">
                <div className="dash-row-date dash-row-date--blue">
                  {new Date(e.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="dash-row-sub">{e.daysAway} days away</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Candidates</div>
            <button className="btn-link" onClick={() => onNav('hiring')}>View all</button>
          </div>
          {recentCands.length === 0 ? (
            <div className="dash-empty">No candidates yet.</div>
          ) : recentCands.map(c => (
            <div key={c.id} className="dash-row" onClick={() => onNav('hiring')} style={{ cursor: 'pointer' }}>
              <div className="dash-row-left">
                <div className="dash-av">{initials(c.name)}</div>
                <div>
                  <div className="dash-row-name">{c.name}</div>
                  <div className="dash-row-sub">{c.role}{c.dept ? ' \u00b7 ' + c.dept : ''}</div>
                </div>
              </div>
              <div className="dash-row-right">
                <span className={'pill pill-' + (c.stage === 'interview' ? 'amber' : c.stage === 'offer' || c.stage === 'hired' ? 'purple' : 'gray')}>
                  {c.stage}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
