'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppModal } from '@/components/shared/AppModal'
import CustomPicker from '@/components/shared/CustomPicker'
import type { HrDB, OnboardingRun, RunTask } from './types'

interface Props {
  type: 'onboarding' | 'offboarding'
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
  onNav: (page: string) => void
}

interface EmpGroup {
  empId: string; empName: string; role: string; startDate?: string; endDate?: string
  tracks: { runId: string; trackName: string; pct: number; nextSteps: string[]; allDone: boolean }[]
}

function ini(name: string) { return (name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase() }
function today() { return new Date().toISOString().split('T')[0] }

function groupByEmployee(db: HrDB, type: 'onboarding' | 'offboarding', statusFilter: 'active' | 'completed' = 'active'): EmpGroup[] {
  const groups: Record<string, EmpGroup> = {}
  db.onboardingRuns.filter(r => r.status === statusFilter && r.type === type).forEach(run => {
    const emp = db.employees.find(e => e.id === run.employeeId)
    if (!emp) return
    if (!groups[emp.id]) groups[emp.id] = { empId: emp.id, empName: emp.name, role: emp.role, startDate: emp.startDate, endDate: emp.endDate, tracks: [] }
    const runTasks = db.runTasks.filter(t => t.runId === run.id)
    const pending = runTasks.filter(t => t.status !== 'completed')
    const completed = runTasks.filter(t => t.status === 'completed').length
    const track = db.tracks.find(t => t.id === run.trackId)
    groups[emp.id].tracks.push({
      runId: run.id, trackName: track?.name || 'Track',
      pct: runTasks.length ? Math.round(completed / runTasks.length * 100) : 0,
      nextSteps: pending.slice(0, 2).map(t => t.name), allDone: pending.length === 0,
    })
  })
  return Object.values(groups)
}

export default function HrOnboarding({ type, db, setDb, setSyncState, onNav }: Props) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [runModalOpen, setRunModalOpen]   = useState(false)
  const [runEmpId, setRunEmpId]           = useState('')
  const [runTrackId, setRunTrackId]       = useState('')
  const [runStart, setRunStart]           = useState(today())
  const [detailRunId, setDetailRunId]     = useState<string | null>(null)
  const { modal, showModal }              = useAppModal()

  const groups         = groupByEmployee(db, type)
  const completedGroups = type === 'offboarding' ? groupByEmployee(db, type, 'completed') : []

  const detailRun  = detailRunId ? db.onboardingRuns.find(r => r.id === detailRunId) || null : null
  const detailEmp  = detailRun ? db.employees.find(e => e.id === detailRun.employeeId) : null
  const detailTasks = detailRunId ? db.runTasks.filter(t => t.runId === detailRunId) : []
  const detailDone  = detailTasks.filter(t => t.status === 'completed').length

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  function openStartRun() {
    setRunEmpId(db.employees[db.employees.length - 1]?.id || '')
    setRunTrackId(db.tracks[0]?.id || '')
    setRunStart(today())
    setRunModalOpen(true)
  }

  async function startRun() {
    if (!runEmpId || !runTrackId) return
    const ts = new Date().toISOString()
    const runId = crypto.randomUUID()
    const trackTasks = db.tasks.filter(t => t.trackId === runTrackId)
    const newTasks = trackTasks.map(tt => {
      const due = new Date(runStart)
      due.setDate(due.getDate() + parseInt(tt.dueDaysOffset || '0'))
      return { id: crypto.randomUUID(), runId, name: tt.name, ownerRole: tt.ownerRole, status: 'pending', dueDate: due.toISOString().split('T')[0], created_at: ts, updated_at: ts }
    })
    const newRun: OnboardingRun = { id: runId, employeeId: runEmpId, trackId: runTrackId, type, status: 'active', startDate: runStart, created_at: ts }
    const updatedEmps = type === 'offboarding'
      ? db.employees.map(e => e.id === runEmpId ? { ...e, status: 'offboarding', endDate: runStart, updated_at: ts } : e)
      : db.employees
    setDb(prev => ({
      ...prev,
      onboardingRuns: [...prev.onboardingRuns, newRun],
      runTasks: [...prev.runTasks, ...newTasks],
      employees: type === 'offboarding' ? updatedEmps : prev.employees,
    }))
    setRunModalOpen(false)
    const ops: Array<() => PromiseLike<unknown>> = [
      () => supabase.from('onboardingRuns').insert(newRun),
      ...newTasks.map(t => () => supabase.from('runTasks').insert(t)),
    ]
    if (type === 'offboarding') {
      const emp = updatedEmps.find(e => e.id === runEmpId)
      if (emp) ops.push(() => supabase.from('employees').upsert(emp))
    }
    await dbMulti(ops)
  }

  async function toggleTask(runId: string, task: RunTask) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const updated = { ...task, status: newStatus, updated_at: new Date().toISOString() }
    setDb(prev => ({ ...prev, runTasks: prev.runTasks.map(t => t.id === task.id ? updated : t) }))
    setSyncState('syncing')
    try { await supabase.from('runTasks').upsert(updated); setSyncState('ok') } catch { setSyncState('error') }
    // Check if all tasks complete
    const allTasks = db.runTasks.filter(t => t.runId === runId)
    const allUpdated = allTasks.map(t => t.id === task.id ? updated : t)
    const allDone = allUpdated.length > 0 && allUpdated.every(t => t.status === 'completed')
    if (allDone) {
      const run = db.onboardingRuns.find(r => r.id === runId)
      const emp = run ? db.employees.find(e => e.id === run.employeeId) : null
      if (emp && run) {
        const newStatus = run.type === 'offboarding' ? 'inactive' : 'active'
        const label = run.type === 'offboarding' ? 'mark them as inactive' : 'mark them as active'
        const { buttonValue } = await showModal({ title: 'Track Complete!', message: `All tasks for ${emp.name} are done. Would you like to ${label} in the Directory?`, confirmLabel: `Update to ${newStatus}` })
        if (buttonValue === 'confirm') {
          const updatedEmp = { ...emp, status: newStatus, updated_at: new Date().toISOString() }
          const updatedRun = { ...run, status: 'completed' }
          setDb(prev => ({
            ...prev,
            employees: prev.employees.map(e => e.id === emp.id ? updatedEmp : e),
            onboardingRuns: prev.onboardingRuns.map(r => r.id === run.id ? updatedRun : r),
          }))
          await dbMulti([
            () => supabase.from('employees').upsert(updatedEmp),
            () => supabase.from('onboardingRuns').upsert(updatedRun),
          ])
        }
      }
    }
  }

  const title     = type === 'onboarding' ? 'Onboarding' : 'Offboarding'
  const accentBg  = type === 'onboarding' ? 'var(--accent-light)' : 'var(--red-light)'
  const accentTxt = type === 'onboarding' ? 'var(--accent-text)' : 'var(--red)'
  const doneTxt   = type === 'onboarding' ? 'var(--accent-text)' : 'var(--red)'

  return (
    <div className="page">
      {modal}

      {/* Start run modal */}
      {runModalOpen && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setRunModalOpen(false) }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">Start Run</div>
              <button className="detail-close" aria-label="Close" onClick={() => setRunModalOpen(false)}>&times;</button>
            </div>
            <div className="app-modal-body">
              <div className="form-group">
                <label className="form-label">Employee</label>
                <CustomPicker
                  placeholder={db.employees.length === 0 ? 'No employees yet — promote a candidate first' : 'Select employee\u2026'}
                  options={[...db.employees].reverse().map(e => ({ value: e.id, label: e.name + ' \u2014 ' + e.role + ' (' + e.status + ')' }))}
                  selected={runEmpId}
                  onChange={v => setRunEmpId(v as string)}
                  showUnassigned={false}
                  disabled={db.employees.length === 0}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Track Template</label>
                <CustomPicker
                  placeholder="Select track\u2026"
                  options={db.tracks.map(t => ({ value: t.id, label: t.name }))}
                  selected={runTrackId}
                  onChange={v => setRunTrackId(v as string)}
                  showUnassigned={false}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={runStart} onChange={e => setRunStart(e.target.value)} />
              </div>
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-secondary" onClick={() => setRunModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={startRun}>Start Run</button>
            </div>
          </div>
        </div>
      )}

      {/* Run detail modal */}
      {detailRunId && detailRun && detailEmp && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDetailRunId(null) }}>
          <div className="app-modal" style={{ maxWidth: 560 }} role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">{detailEmp.name} — {detailRun.type}</div>
              <button className="detail-close" aria-label="Close" onClick={() => setDetailRunId(null)}>&times;</button>
            </div>
            <div className="app-modal-body">
              <p className="modal-body-desc">Start: {detailRun.startDate} &middot; {detailDone}/{detailTasks.length} complete</p>
              {detailTasks.map(t => {
                const isOverdue = t.status !== 'completed' && t.dueDate && t.dueDate < today()
                return (
                  <div key={t.id} className="run-task-row" onClick={() => toggleTask(detailRunId, t)} style={{ cursor: 'pointer' }}>
                    <div className={'task-check' + (t.status === 'completed' ? ' done' : '')}>{t.status === 'completed' ? '✓' : ''}</div>
                    <div className="run-task-info">
                      <div className={'run-task-name' + (t.status === 'completed' ? ' run-task-name--done' : '')}>{t.name}</div>
                      <div className="run-task-meta">
                        {t.ownerRole} &middot; {' '}
                        <span className={isOverdue ? 'text-overdue' : 'text-muted'}>
                          Due {t.dueDate}{isOverdue && <span className="badge-overdue"> Overdue</span>}
                        </span>
                      </div>
                    </div>
                    <span className={'pill ' + (t.status === 'completed' ? 'pill-purple' : 'pill-amber')}>{t.status === 'completed' ? 'Complete' : 'Pending'}</span>
                  </div>
                )
              })}
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-secondary" onClick={() => setDetailRunId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-subtitle">{groups.length} active</div>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {type === 'offboarding' && (
            <button
              className={'btn btn-secondary btn-sm' + (showCompleted ? ' btn-active' : '')}
              onClick={() => setShowCompleted(v => !v)}
            >
              Show Completed ({completedGroups.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={openStartRun}>+ Start Run</button>
        </div>
      </div>

      {groups.length > 0 ? groups.map(emp => {
        const overdueTasks = db.runTasks.filter(t =>
          t.status !== 'completed' && t.dueDate && t.dueDate < today() &&
          emp.tracks.some(tr => tr.runId === t.runId)
        )
        return (
          <div key={emp.empId} className="onboard-group">
            <div className="onboard-person-row" onClick={() => { const firstRun = db.onboardingRuns.find(r => r.employeeId === emp.empId && r.status === 'active'); if (firstRun) setDetailRunId(firstRun.id) }}>
              <div className="onboard-av" style={{ background: accentBg, color: accentTxt }}>{ini(emp.empName)}</div>
              <div className="onboard-info">
                <div className="onboard-name">
                  {emp.empName}
                  {overdueTasks.length > 0 && <span className="overdue-badge">{overdueTasks.length} overdue</span>}
                </div>
                <div className="onboard-sub">{emp.role}</div>
              </div>
              <div className="onboard-view-hint">View runs &rarr;</div>
            </div>
            {emp.tracks.map(track => (
              <div key={track.runId} className="card onboard-track-card" onClick={() => setDetailRunId(track.runId)}>
                <div className="onboard-track-title">{track.trackName} — {track.pct}% complete</div>
                {track.nextSteps.length > 0 ? (
                  <>
                    <div className="onboard-steps-label">Next steps:</div>
                    <div>{track.nextSteps.map((step, i) => <div key={i} className="onboard-step">{step}</div>)}</div>
                  </>
                ) : (
                  <div className="onboard-complete" style={{ color: doneTxt }}>All tasks complete</div>
                )}
              </div>
            ))}
          </div>
        )
      }) : (
        <div className="section-empty">No active {type} runs</div>
      )}

      {type === 'offboarding' && showCompleted && completedGroups.length > 0 && (
        <div className="completed-section">
          <div className="completed-label">Completed</div>
          {completedGroups.map(emp => (
            <div key={emp.empId} className="onboard-group">
              <div className="onboard-person-row" onClick={() => onNav('directory')}>
                <div className="onboard-av" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{ini(emp.empName)}</div>
                <div className="onboard-info">
                  <div className="onboard-name">{emp.empName}</div>
                  <div className="onboard-sub">{emp.role}</div>
                </div>
                <div className="onboard-view-hint">View &rarr;</div>
              </div>
              {emp.tracks.map(track => (
                <div key={track.runId} className="card onboard-track-card" onClick={() => setDetailRunId(track.runId)}>
                  <div className="onboard-track-title">{track.trackName} — {track.pct}% complete</div>
                  <div className="onboard-complete" style={{ color: 'var(--text3)' }}>All tasks complete</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
