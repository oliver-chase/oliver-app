'use client'
import { supabase } from '@/lib/supabase'
import type { Flow, FlowCtx } from '../step-flow-types'
import type { OnboardingRun } from '../types'
import { PickStep } from './pickFlow'

interface PickDraft { id: string }
interface OffboardDraft extends PickDraft { trackId: string; endDate: string }

function empItems(ctx: FlowCtx) {
  return ctx.db.employees
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => ({ id: e.id, name: e.name, sub: (e.role || '') + (e.dept ? ' \u00b7 ' + e.dept : '') + (e.status ? ' \u00b7 ' + e.status : '') }))
}

export const editEmployeeFlow: Flow<PickDraft> = {
  id: 'edit-employee',
  title: 'Edit employee',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick an employee',
      validate: d => d.id ? null : 'Select an employee to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={empItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ id })} />
      ),
    },
    {
      title: 'Open editor',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const e = ctx.db.employees.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Open the full edit form for <strong>{e?.name}</strong>. Confirm to navigate to Directory with this employee selected for editing.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    ctx.requestEdit('employee', draft.id)
  },
}

export const deleteEmployeeFlow: Flow<PickDraft> = {
  id: 'delete-employee',
  title: 'Delete employee',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick an employee',
      validate: d => d.id ? null : 'Select an employee to continue',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={empItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ id })} />
      ),
    },
    {
      title: 'Confirm delete',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const e = ctx.db.employees.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Permanently delete <strong>{e?.name}</strong>? Their device assignments will also be removed. This cannot be undone.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    const deletedEmp = ctx.db.employees.find(x => x.id === draft.id)
    const deletedAsgs = ctx.db.assignments.filter(a => a.employeeId === draft.id)
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      employees: prev.employees.filter(x => x.id !== draft.id),
      assignments: prev.assignments.filter(a => a.employeeId !== draft.id),
    }))
    try {
      const asgRes = await supabase.from('assignments').delete().eq('employeeId', draft.id)
      if (asgRes.error) throw asgRes.error
      const empRes = await supabase.from('employees').delete().eq('id', draft.id)
      if (empRes.error) throw empRes.error
      ctx.setSyncState('ok')
    } catch {
      ctx.setDb(prev => ({
        ...prev,
        employees: deletedEmp && !prev.employees.some(e => e.id === deletedEmp.id) ? [...prev.employees, deletedEmp] : prev.employees,
        assignments: [...prev.assignments, ...deletedAsgs.filter(a => !prev.assignments.some(x => x.id === a.id))],
      }))
      ctx.setSyncState('error')
      ctx.refresh().catch(() => {})
    }
  },
}

export const startOffboardingFlow: Flow<OffboardDraft> = {
  id: 'start-offboarding',
  title: 'Start offboarding',
  initialDraft: () => ({ id: '', trackId: '', endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] }),
  steps: [
    {
      title: 'Pick an employee',
      validate: d => d.id ? null : 'Select an employee',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={empItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} />
      ),
    },
    {
      title: 'Choose track + last day',
      isFinal: true,
      validate: d => d.trackId ? null : 'Choose an offboarding track',
      render: ({ draft, setDraft, ctx }) => {
        const tracks = ctx.db.tracks.filter(t => t.type === 'offboarding')
        return (
          <>
            <div className="cand-edit-group">
              <label className="app-modal-label">Offboarding track</label>
              <select className="app-modal-input" value={draft.trackId} onChange={e => setDraft({ ...draft, trackId: e.currentTarget.value })}>
                <option value="">{'\u2014 Choose \u2014'}</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tracks.length === 0 && <div className="step-flow-error">No offboarding tracks defined. Create one in Tracks first.</div>}
            </div>
            <div className="cand-edit-group">
              <label className="app-modal-label app-modal-label--spaced">Last day</label>
              <input className="app-modal-input" type="date" value={draft.endDate} onChange={e => setDraft({ ...draft, endDate: e.currentTarget.value })} />
            </div>
          </>
        )
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id || !draft.trackId) return
    const now = new Date().toISOString()
    const run: OnboardingRun = {
      id: 'RUN-' + crypto.randomUUID(),
      employeeId: draft.id,
      trackId: draft.trackId,
      type: 'offboarding',
      status: 'active',
      startDate: now.split('T')[0],
      created_at: now,
    }
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      onboardingRuns: [run, ...prev.onboardingRuns],
      employees: prev.employees.map(e => e.id === draft.id ? { ...e, status: 'offboarding', endDate: draft.endDate, updated_at: now } : e),
    }))
    try {
      await supabase.from('onboardingRuns').insert(run)
      await supabase.from('employees').update({ status: 'offboarding', endDate: draft.endDate, updated_at: now }).eq('id', draft.id)
      ctx.setSyncState('ok')
    } catch { ctx.setSyncState('error') }
  },
}
