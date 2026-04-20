'use client'
import { supabase } from '@/lib/supabase'
import type { Flow, FlowCtx } from '../step-flow-types'
import type { Assignment } from '../types'
import { PickStep } from './pickFlow'

interface PickDraft { id: string }
interface AssignDraft extends PickDraft { empId: string }
interface ReturnDraft extends PickDraft { newStatus: 'available' | 'inactive' }

function deviceItems(ctx: FlowCtx) {
  return ctx.db.devices
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => {
      const assignedTo = d.assignedTo ? ctx.db.employees.find(e => e.id === d.assignedTo)?.name : null
      const sub = [d.status, d.serial, assignedTo ? '\u2192 ' + assignedTo : ''].filter(Boolean).join(' \u00b7 ')
      return { id: d.id, name: d.name, sub }
    })
}

export const editDeviceFlow: Flow<PickDraft> = {
  id: 'edit-device',
  title: 'Edit device',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick a device',
      validate: d => d.id ? null : 'Select a device',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={deviceItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ id })} />
      ),
    },
    {
      title: 'Open editor',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const d = ctx.db.devices.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Open the full edit form for <strong>{d?.name}</strong>. Confirm to navigate to Inventory with this device selected for editing.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    ctx.requestEdit('device', draft.id)
  },
}

export const deleteDeviceFlow: Flow<PickDraft> = {
  id: 'delete-device',
  title: 'Delete device',
  initialDraft: () => ({ id: '' }),
  steps: [
    {
      title: 'Pick a device',
      validate: d => d.id ? null : 'Select a device',
      render: ({ draft, setDraft, ctx }) => (
        <PickStep items={deviceItems(ctx)} selectedId={draft.id} onSelect={id => setDraft({ id })} />
      ),
    },
    {
      title: 'Confirm delete',
      isFinal: true,
      render: ({ draft, ctx }) => {
        const d = ctx.db.devices.find(x => x.id === draft.id)
        return <div className="step-flow-confirm-summary">Permanently delete <strong>{d?.name}</strong>? Active assignments to this device will also be removed.</div>
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    const deletedDev = ctx.db.devices.find(d => d.id === draft.id)
    const deletedAsgs = ctx.db.assignments.filter(a => a.deviceId === draft.id)
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      devices: prev.devices.filter(d => d.id !== draft.id),
      assignments: prev.assignments.filter(a => a.deviceId !== draft.id),
    }))
    try {
      const asgRes = await supabase.from('assignments').delete().eq('deviceId', draft.id)
      if (asgRes.error) throw asgRes.error
      const devRes = await supabase.from('devices').delete().eq('id', draft.id)
      if (devRes.error) throw devRes.error
      ctx.setSyncState('ok')
    } catch {
      ctx.setDb(prev => ({
        ...prev,
        devices: deletedDev && !prev.devices.some(d => d.id === deletedDev.id) ? [...prev.devices, deletedDev] : prev.devices,
        assignments: [...prev.assignments, ...deletedAsgs.filter(a => !prev.assignments.some(x => x.id === a.id))],
      }))
      ctx.setSyncState('error')
    }
  },
}

export const assignDeviceFlow: Flow<AssignDraft> = {
  id: 'assign-device',
  title: 'Assign device',
  initialDraft: () => ({ id: '', empId: '' }),
  steps: [
    {
      title: 'Pick available device',
      validate: d => d.id ? null : 'Select a device',
      render: ({ draft, setDraft, ctx }) => {
        const available = ctx.db.devices.filter(d => d.status !== 'inactive' && !d.assignedTo)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(d => ({ id: d.id, name: d.name, sub: [d.status, d.serial].filter(Boolean).join(' \u00b7 ') }))
        return <PickStep items={available} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} emptyMessage="No available devices" />
      },
    },
    {
      title: 'Pick employee',
      isFinal: true,
      validate: d => d.empId ? null : 'Select an employee',
      render: ({ draft, setDraft, ctx }) => {
        const emps = ctx.db.employees.filter(e => e.status !== 'offboarding')
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(e => ({ id: e.id, name: e.name, sub: (e.role || '') + (e.dept ? ' \u00b7 ' + e.dept : '') }))
        return <PickStep items={emps} selectedId={draft.empId} onSelect={empId => setDraft({ ...draft, empId })} emptyMessage="No active employees" />
      },
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id || !draft.empId) return
    const now = new Date().toISOString()
    const asg: Assignment = {
      id: 'ASG-' + Date.now().toString(36),
      employeeId: draft.empId,
      deviceId: draft.id,
      assignedAt: now,
      status: 'active',
      returnedAt: '',
      created_at: now,
    }
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      assignments: [asg, ...prev.assignments],
      devices: prev.devices.map(d => d.id === draft.id ? { ...d, status: 'assigned', assignedTo: draft.empId, updated_at: now } : d),
    }))
    try {
      await supabase.from('assignments').insert(asg)
      await supabase.from('devices').update({ status: 'assigned', assignedTo: draft.empId, updated_at: now }).eq('id', draft.id)
      ctx.setSyncState('ok')
    } catch { ctx.setSyncState('error') }
  },
}

export const returnDeviceFlow: Flow<ReturnDraft> = {
  id: 'return-device',
  title: 'Return device',
  initialDraft: () => ({ id: '', newStatus: 'available' }),
  steps: [
    {
      title: 'Pick assigned device',
      validate: d => d.id ? null : 'Select a device',
      render: ({ draft, setDraft, ctx }) => {
        const assigned = ctx.db.devices.filter(d => !!d.assignedTo)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(d => {
            const emp = ctx.db.employees.find(e => e.id === d.assignedTo)
            return { id: d.id, name: d.name, sub: '\u2192 ' + (emp?.name || 'Unknown') + ' \u00b7 ' + (d.serial || '') }
          })
        return <PickStep items={assigned} selectedId={draft.id} onSelect={id => setDraft({ ...draft, id })} emptyMessage="No assigned devices" />
      },
    },
    {
      title: 'Set new status',
      isFinal: true,
      render: ({ draft, setDraft }) => (
        <div className="cand-edit-group">
          <label className="app-modal-label">After return, set device to</label>
          <select className="app-modal-input" value={draft.newStatus} onChange={e => setDraft({ ...draft, newStatus: e.currentTarget.value as 'available' | 'inactive' })}>
            <option value="available">Available (re-assignable)</option>
            <option value="inactive">Inactive (retired/lost)</option>
          </select>
        </div>
      ),
    },
  ],
  finalize: async (draft, ctx) => {
    if (!draft.id) return
    const dev = ctx.db.devices.find(d => d.id === draft.id)
    if (!dev) return
    const now = new Date().toISOString()
    ctx.setSyncState('syncing')
    ctx.setDb(prev => ({
      ...prev,
      assignments: prev.assignments.map(a => (a.deviceId === draft.id && a.status === 'active') ? { ...a, status: 'returned', returnedAt: now } : a),
      devices: prev.devices.map(d => d.id === draft.id ? { ...d, status: draft.newStatus, assignedTo: '', updated_at: now } : d),
    }))
    try {
      await supabase.from('assignments').update({ status: 'returned', returnedAt: now }).eq('deviceId', draft.id).eq('status', 'active')
      await supabase.from('devices').update({ status: draft.newStatus, assignedTo: '', updated_at: now }).eq('id', draft.id)
      ctx.setSyncState('ok')
    } catch { ctx.setSyncState('error') }
  },
}
