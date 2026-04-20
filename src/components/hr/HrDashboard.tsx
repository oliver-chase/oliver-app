'use client'
import type { HrDB } from './types'
import { useAppModal } from '@/components/shared/AppModal'
import { supabase } from '@/lib/supabase'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  onNav: (page: string) => void
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(dateStr: string) {
  if (!dateStr) return 'TBD'
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function SectionHdr({ title, nav, onNav }: { title: string; nav: string; onNav: (p: string) => void }) {
  return (
    <div className="dash-section-hdr">
      <div className="app-card-label" style={{ marginBottom: 0 }}>{title}</div>
      <button type="button" className="btn-link" onClick={() => onNav(nav)}>View all &rarr;</button>
    </div>
  )
}

function EmptyRow({ msg }: { msg: string }) {
  return <div className="dash-empty">{msg}</div>
}

export default function HrDashboard({ db, setDb, onNav, setSyncState }: Props) {
  const { modal, showModal } = useAppModal()

  const activeReqs       = db.candidates.filter(c => c.candStatus !== 'Hired' && c.candStatus !== 'Closed').length
  const totalEmps        = db.employees.length
  const activeOnboarding = db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'onboarding').length
  const activeOffboard   = db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'offboarding').length

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const nowMs = Date.now()
  const upcomingStarts = db.employees
    .filter(e => e.startDate && parseLocalDate(e.startDate).getTime() > nowMs)
    .map(e => ({ ...e, daysAway: Math.ceil((parseLocalDate(e.startDate).getTime() - nowMs) / 86400000) }))
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 3)

  const upcomingOffboards = db.employees
    .filter(e => e.status === 'offboarding')
    .map(e => ({
      ...e,
      daysAway: e.endDate ? Math.ceil((parseLocalDate(e.endDate).getTime() - nowMs) / 86400000) : null,
    }))
    .slice(0, 3)

  const todayMs = today.getTime()

  const upcomingIvs = db.interviews
    .filter(iv => parseLocalDate(iv.date).getTime() >= todayMs)
    .map(iv => {
      const cand = db.candidates.find(c => c.id === iv.candidateId)
      if (!cand) return null
      const allCandIvs = db.interviews.filter(i => i.candidateId === iv.candidateId).sort((a, b) => a.date.localeCompare(b.date))
      const num = allCandIvs.findIndex(i => i.id === iv.id) + 1
      return { candId: cand.id, candName: cand.name, role: cand.role, interviewer: iv.interviewers, date: iv.date, num }
    })
    .filter(Boolean)
    .sort((a, b) => a!.date.localeCompare(b!.date))
    .slice(0, 4) as { candId: string; candName: string; role: string; interviewer: string; date: string; num: number }[]

  const recentCands = [...db.candidates]
    .sort((a, b) => (b.updatedAt || b.addedAt || '').localeCompare(a.updatedAt || a.addedAt || ''))
    .slice(0, 4)

  const activeOnboardingGroups = (() => {
    const groups: Record<string, { empId: string; empName: string; role: string; startDate: string; tracks: { runId: string; trackName: string; pct: number; nextSteps: string[] }[] }> = {}
    db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'onboarding').forEach(run => {
      const emp = db.employees.find(e => e.id === run.employeeId)
      if (!emp) return
      if (!groups[emp.id]) groups[emp.id] = { empId: emp.id, empName: emp.name, role: emp.role, startDate: emp.startDate, tracks: [] }
      const runTasks = db.runTasks.filter(t => t.runId === run.id)
      const done = runTasks.filter(t => t.status === 'completed').length
      const pending = runTasks.filter(t => t.status === 'pending')
      const track = db.tracks.find(t => t.id === run.trackId)
      groups[emp.id].tracks.push({ runId: run.id, trackName: track?.name || 'Track', pct: runTasks.length ? Math.round(done / runTasks.length * 100) : 0, nextSteps: pending.slice(0, 2).map(t => t.name) })
    })
    return Object.values(groups).slice(0, 2)
  })()

  const activeOffboardGroups = (() => {
    const groups: Record<string, { empId: string; empName: string; role: string; endDate: string; tracks: { runId: string; trackName: string; pct: number }[] }> = {}
    db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'offboarding').forEach(run => {
      const emp = db.employees.find(e => e.id === run.employeeId)
      if (!emp) return
      if (!groups[emp.id]) groups[emp.id] = { empId: emp.id, empName: emp.name, role: emp.role, endDate: emp.endDate || '', tracks: [] }
      const runTasks = db.runTasks.filter(t => t.runId === run.id)
      const done = runTasks.filter(t => t.status === 'completed').length
      const track = db.tracks.find(t => t.id === run.trackId)
      groups[emp.id].tracks.push({ runId: run.id, trackName: track?.name || 'Track', pct: runTasks.length ? Math.round(done / runTasks.length * 100) : 0 })
    })
    return Object.values(groups).slice(0, 2)
  })()

  async function quickAddCand() {
    const { buttonValue, inputValue } = await showModal({ title: 'Add Candidate', inputPlaceholder: 'Name', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const now = new Date().toISOString()
    const rec = { id: 'CAND-' + crypto.randomUUID(), name: inputValue.trim(), role: '', seniority: '', dept: '', source: '', stage: 'sourced', candStatus: 'Active', empType: '', compType: '', compAmount: '', city: '', state: '', country: '', client: '', email: '', resumeLink: '', skills: '', addedAt: now, updatedAt: now, notes: '', rejectionReason: '', offerAmount: '', offerDate: '', offerStatus: '' }
    setDb(prev => ({ ...prev, candidates: [rec, ...prev.candidates] }))
    setSyncState('syncing')
    try { await supabase.from('candidates').insert(rec); setSyncState('ok') } catch { setSyncState('error') }
  }

  async function quickAddEmp() {
    const { buttonValue, inputValue } = await showModal({ title: 'Add Employee', inputPlaceholder: 'Full name', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const now = new Date().toISOString()
    const rec = { id: 'EMP-' + crypto.randomUUID(), name: inputValue.trim(), role: 'TBD', dept: '', status: 'active', client: '', location: 'Remote', city: '', state: '', country: 'US', manager: '', buddy: '', startDate: '', endDate: '', email: '', source: '', created_at: now, updated_at: now }
    setDb(prev => ({ ...prev, employees: [rec, ...prev.employees] }))
    setSyncState('syncing')
    try { await supabase.from('employees').insert(rec); setSyncState('ok') } catch { setSyncState('error') }
  }

  async function quickStartRun() {
    const { buttonValue } = await showModal({ title: 'Start Run', message: 'Use the Onboarding or Offboarding section to start a new run.', confirmLabel: 'Go to Onboarding', cancelLabel: 'Close' })
    if (buttonValue === 'confirm') onNav('onboarding')
  }

  return (
    <div className="page page--split">
      {modal}
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-subtitle">{activeReqs} open reqs &middot; {totalEmps} employees &middot; {activeOnboarding} onboarding &middot; {activeOffboard} offboarding</div>
          </div>
          <div className="dash-quick-add">
            <button className="btn btn-primary btn--compact" onClick={quickAddCand}>+ Candidate</button>
            <button className="btn btn-secondary btn--compact" onClick={quickAddEmp}>+ Employee</button>
            <button className="btn btn-secondary btn--compact" onClick={() => onNav('inventory')}>+ Device</button>
            <button className="btn btn-secondary btn--compact" onClick={quickStartRun}>Start Run</button>
          </div>
        </div>
      </div>
      <div className="page-body">

      {/* Row 1: Upcoming starts + Active onboarding */}
      <div className="dash-grid">
        <div>
          <SectionHdr title="Upcoming start dates" nav="directory" onNav={onNav} />
          <div className="card">
            {upcomingStarts.length === 0 ? <EmptyRow msg="No upcoming start dates" /> : upcomingStarts.map(e => (
              <div key={e.id} className="dash-row" onClick={() => onNav('directory')}>
                <div className="dash-row-left">
                  <div>
                    <div className="dash-row-name">{e.name}</div>
                    <div className="dash-row-sub">{e.role}</div>
                  </div>
                </div>
                <div className="dash-row-right">
                  <div className="dash-row-date dash-row-date--blue">{fmtDate(e.startDate)}</div>
                  <div className="dash-row-sub">{e.daysAway} days away</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHdr title="Active onboarding" nav="onboarding" onNav={onNav} />
          <div className="card">
            {activeOnboardingGroups.length === 0 ? <EmptyRow msg="No active onboarding" /> : activeOnboardingGroups.map(emp => (
              <div key={emp.empId} className="dash-row" onClick={() => onNav('onboarding')}>
                <div className="dash-row-left">
                  <div>
                    <div className="dash-row-name">{emp.empName}</div>
                    <div className="dash-row-sub">{emp.tracks.map(t => t.trackName).join(', ')}</div>
                  </div>
                </div>
                <button className="btn-link" onClick={e => { e.stopPropagation(); onNav('directory') }}>Profile</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Upcoming interviews + Recent interviews */}
      <div className="dash-grid">
        <div>
          <SectionHdr title="Upcoming interviews" nav="hiring" onNav={onNav} />
          <div className="card">
            {upcomingIvs.length === 0 ? <EmptyRow msg="No upcoming interviews" /> : upcomingIvs.map(iv => (
              <div key={iv.candId + iv.date} className="dash-row hr-row-pad" style={{ gap: 'var(--spacing-10)' }} onClick={() => onNav('hiring')}>
                <div className="dash-row-mid">
                  <div className="dash-row-name dash-row-ellipsis">{iv.candName}</div>
                  <div className="dash-row-sub dash-row-ellipsis">with {iv.interviewer || 'TBD'} &middot; {iv.role}</div>
                </div>
                <div className="dash-row-right">
                  <div className="dash-row-date">{fmtDate(iv.date)}</div>
                  <div className="dash-row-sub" style={{ marginTop: 'var(--spacing-2xs)' }}>Interview #{iv.num}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHdr title="Recent candidates" nav="hiring" onNav={onNav} />
          <div className="card">
            {recentCands.length === 0 ? <EmptyRow msg="No candidates yet" /> : recentCands.map(c => (
              <div key={c.id} className="dash-row hr-row-pad" onClick={() => onNav('hiring')}>
                <div className="dash-row-mid">
                  <div className="dash-row-name dash-row-ellipsis">{c.name}</div>
                  <div className="dash-row-sub dash-row-ellipsis">{c.role}{c.dept ? ' · ' + c.dept : ''}</div>
                </div>
                <span className={'badge cand-status-' + (c.candStatus || 'active').toLowerCase().replace(/\s+/g, '-')}>{c.candStatus || 'Active'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Upcoming offboards + Active offboarding */}
      <div className="dash-grid">
        <div>
          <SectionHdr title="Upcoming offboards" nav="offboarding" onNav={onNav} />
          <div className="card">
            {upcomingOffboards.length === 0 ? <EmptyRow msg="No upcoming offboards" /> : upcomingOffboards.map(e => {
              const urgencyColor = e.daysAway !== null ? (e.daysAway! <= 7 ? 'var(--red)' : e.daysAway! <= 14 ? 'var(--amber)' : 'var(--text2)') : 'var(--text2)'
              return (
                <div key={e.id} className="dash-row" onClick={() => onNav('offboarding')}>
                  <div className="dash-row-left">
                    <div>
                      <div className="dash-row-name">{e.name}</div>
                      <div className="dash-row-sub">{e.role}</div>
                    </div>
                  </div>
                  <div className="dash-row-right">
                    <div className="dash-row-date dash-row-date--red">{fmtDate(e.endDate || '')}</div>
                    <div className="dash-urgency" style={{ color: urgencyColor }}>{e.daysAway !== null ? e.daysAway + ' days left' : ''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <SectionHdr title="Active offboarding" nav="offboarding" onNav={onNav} />
          <div className="card">
            {activeOffboardGroups.length === 0 ? <EmptyRow msg="No active offboarding" /> : activeOffboardGroups.map(emp => (
              <div key={emp.empId} className="dash-row" onClick={() => onNav('offboarding')}>
                <div className="dash-row-left">
                  <div>
                    <div className="dash-row-name">{emp.empName}</div>
                    <div className="dash-row-sub">{emp.tracks.map(t => t.trackName).join(', ')}</div>
                  </div>
                </div>
                <button className="btn-link" onClick={e => { e.stopPropagation(); onNav('directory') }}>Profile</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
