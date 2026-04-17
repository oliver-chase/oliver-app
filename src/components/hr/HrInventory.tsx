'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppModal } from '@/components/shared/AppModal'
import CustomPicker from '@/components/shared/CustomPicker'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { HrDB, Device } from './types'
import { getList } from './types'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

interface DevForm {
  make: string; model: string; modelNumber: string; serial: string
  type: string; condition: string; purchaseDate: string; purchaseStore: string
  orderNumber: string; specs: string
}

const BLANK_DEV: DevForm = { make: '', model: '', modelNumber: '', serial: '', type: 'laptop', condition: 'new', purchaseDate: '', purchaseStore: '', orderNumber: '', specs: '' }

function today() { return new Date().toISOString().split('T')[0] }

function StatusPill({ s }: { s: string }) {
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
  if (s === 'available' || s === 'good' || s === 'new') return <span className="pill pill-purple">{label}</span>
  if (s === 'assigned') return <span className="pill pill-purple">{label}</span>
  if (s === 'inactive') return <span className="pill pill-gray">{label}</span>
  if (s === 'lost') return <span className="pill pill-red">{label}</span>
  return <span className="pill pill-gray">{label}</span>
}

export default function HrInventory({ db, setDb, setSyncState }: Props) {
  const [filterStatus, setFilterStatus] = useState('')
  const [modalType, setModalType] = useState<'add' | 'edit' | 'detail' | 'assign' | 'return' | null>(null)
  const [focusDevId, setFocusDevId] = useState<string | null>(null)
  const [form, setForm] = useState<DevForm>({ ...BLANK_DEV, purchaseDate: today() })
  const [assignEmpId, setAssignEmpId] = useState('')
  const { modal, showModal } = useAppModal()
  const { softDelete, toastEl } = useSoftDelete<Device>()

  const avail    = db.devices.filter(d => d.status === 'available').length
  const assigned = db.devices.filter(d => d.status === 'assigned').length
  const inactive = db.devices.filter(d => d.status === 'inactive').length
  const lost     = db.devices.filter(d => d.status === 'lost').length

  const visibleDevices = filterStatus ? db.devices.filter(d => d.status === filterStatus) : db.devices
  const focusDev = focusDevId ? db.devices.find(d => d.id === focusDevId) || null : null

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  function openAdd() {
    setForm({ ...BLANK_DEV, purchaseDate: today() })
    setModalType('add')
  }

  function openDetail(id: string) {
    setFocusDevId(id)
    setModalType('detail')
  }

  function openEdit(id: string) {
    const d = db.devices.find(x => x.id === id)
    if (!d) return
    setForm({ make: d.make, model: d.model, modelNumber: d.modelNumber || '', serial: d.serial || '', type: d.type || 'laptop', condition: d.condition || 'new', purchaseDate: d.purchaseDate || '', purchaseStore: d.purchaseStore || '', orderNumber: d.orderNumber || '', specs: d.specs || '' })
    setFocusDevId(id)
    setModalType('edit')
  }

  function openAssign(id: string) {
    setFocusDevId(id)
    setAssignEmpId(db.employees[0]?.id || '')
    setModalType('assign')
  }

  function openReturn(id: string) {
    setFocusDevId(id)
    setModalType('return')
  }

  function closeModal() { setModalType(null) }

  async function addDevice() {
    if (!form.make || !form.model) return
    const ts = new Date().toISOString()
    const nd: Device = { id: crypto.randomUUID(), name: form.make + ' ' + form.model, make: form.make, model: form.model, modelNumber: form.modelNumber, serial: form.serial || 'N/A', type: form.type, status: 'available', assignedTo: '', condition: form.condition, purchaseDate: form.purchaseDate, purchaseStore: form.purchaseStore, orderNumber: form.orderNumber, specs: form.specs, location: '', notes: '', created_at: ts, updated_at: ts }
    setDb(prev => ({ ...prev, devices: [...prev.devices, nd] }))
    closeModal()
    await dbMulti([() => supabase.from('devices').insert(nd)])
  }

  async function saveDevice() {
    const d = db.devices.find(x => x.id === focusDevId)
    if (!d) return
    const updated: Device = { ...d, make: form.make, model: form.model, name: form.make + ' ' + form.model, modelNumber: form.modelNumber, serial: form.serial, type: form.type, condition: form.condition, purchaseDate: form.purchaseDate, purchaseStore: form.purchaseStore, orderNumber: form.orderNumber, specs: form.specs, updated_at: new Date().toISOString() }
    setDb(prev => ({ ...prev, devices: prev.devices.map(x => x.id === updated.id ? updated : x) }))
    closeModal()
    await dbMulti([() => supabase.from('devices').upsert(updated)])
  }

  async function deleteDevice(id: string) {
    const d = db.devices.find(x => x.id === id)
    if (!d) return
    if (d.status === 'assigned') { await showModal({ title: 'Cannot delete', message: 'Return device before deleting.', confirmLabel: 'OK', cancelLabel: 'Close' }); return }
    closeModal()
    softDelete(d, {
      displayName: d.name,
      onLocalRemove: () => setDb(prev => ({ ...prev, devices: prev.devices.filter(x => x.id !== id) })),
      onLocalRestore: dev => setDb(prev => ({ ...prev, devices: [...prev.devices, dev] })),
      onDeleteRecord: async () => { await dbMulti([() => supabase.from('devices').delete().eq('id', id)]) },
    })
  }

  async function assignDevice() {
    const d = db.devices.find(x => x.id === focusDevId)
    const emp = db.employees.find(x => x.id === assignEmpId)
    if (!d || !emp) return
    const ts = new Date().toISOString()
    const updated = { ...d, status: 'assigned', assignedTo: emp.id, updated_at: ts }
    const newAssign = { id: crypto.randomUUID(), employeeId: emp.id, deviceId: d.id, assignedAt: ts, status: 'active', returnedAt: '', created_at: ts }
    setDb(prev => ({
      ...prev,
      devices: prev.devices.map(x => x.id === d.id ? updated : x),
      assignments: [...prev.assignments, newAssign],
    }))
    closeModal()
    await dbMulti([() => supabase.from('devices').upsert(updated), () => supabase.from('assignments').insert(newAssign)])
  }

  async function finalizeReturn(newStatus: string) {
    const d = db.devices.find(x => x.id === focusDevId)
    if (!d) return
    const ts = new Date().toISOString()
    const updated = { ...d, status: newStatus, assignedTo: '', updated_at: ts }
    setDb(prev => ({
      ...prev,
      devices: prev.devices.map(x => x.id === d.id ? updated : x),
      assignments: prev.assignments.map(a => a.deviceId === d.id && a.status === 'active' ? { ...a, status: 'returned', returnedAt: ts } : a),
    }))
    closeModal()
    await dbMulti([() => supabase.from('devices').upsert(updated)])
  }

  async function setDeviceStatus(id: string, status: string) {
    const d = db.devices.find(x => x.id === id)
    if (!d) return
    const updated = { ...d, status, updated_at: new Date().toISOString() }
    setDb(prev => ({ ...prev, devices: prev.devices.map(x => x.id === id ? updated : x) }))
    closeModal()
    await dbMulti([() => supabase.from('devices').upsert(updated)])
  }

  const assigneeFirstName = focusDev?.assignedTo ? (db.employees.find(e => e.id === focusDev.assignedTo)?.name.split(' ')[0] || '') : ''
  const focusAssignee    = focusDev?.assignedTo ? db.employees.find(e => e.id === focusDev.assignedTo) : null
  const assignHistory    = focusDev ? db.assignments.filter(a => a.deviceId === focusDev.id && a.status === 'returned') : []

  return (
    <div className="page">
      {modal}
      {toastEl}

      {/* Add device modal */}
      {modalType === 'add' && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">Add Device</div>
              <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="app-modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Make</label><input className="form-input" placeholder="Apple" value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Model</label><input className="form-input" placeholder='MacBook Pro 14"' value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Model Number</label><input className="form-input" placeholder="MDE04LL/A" value={form.modelNumber} onChange={e => setForm(f => ({ ...f, modelNumber: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Serial #</label><input className="form-input" placeholder="ABC123" value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type</label>
                  <CustomPicker
                    placeholder="Type"
                    options={getList(db.lists, 'deviceType').map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    selected={form.type}
                    onChange={v => setForm(f => ({ ...f, type: v as string }))}
                    showUnassigned={false}
                  />
                </div>
                <div className="form-group"><label className="form-label">Condition</label>
                  <CustomPicker
                    placeholder="Condition"
                    options={['new', 'good', 'fair', 'poor'].map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                    selected={form.condition}
                    onChange={v => setForm(f => ({ ...f, condition: v as string }))}
                    showUnassigned={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Purchase Date</label><input type="date" className="form-input" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Purchase Store</label><input className="form-input" placeholder="Apple Store, Amazon..." value={form.purchaseStore} onChange={e => setForm(f => ({ ...f, purchaseStore: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Order Number</label><input className="form-input" value={form.orderNumber} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Specs / Description</label><textarea className="form-input" rows={2} placeholder="Full product description or specs" value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} /></div>
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={addDevice}>Add Device</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit device modal */}
      {modalType === 'edit' && focusDev && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">Edit Device</div>
              <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="app-modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Make</label><input className="form-input" value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Model</label><input className="form-input" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Model Number</label><input className="form-input" value={form.modelNumber} onChange={e => setForm(f => ({ ...f, modelNumber: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Serial #</label><input className="form-input" value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type</label>
                  <CustomPicker
                    placeholder="Type"
                    options={getList(db.lists, 'deviceType').map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    selected={form.type}
                    onChange={v => setForm(f => ({ ...f, type: v as string }))}
                    showUnassigned={false}
                  />
                </div>
                <div className="form-group"><label className="form-label">Condition</label>
                  <CustomPicker
                    placeholder="Condition"
                    options={['new', 'good', 'fair', 'poor'].map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                    selected={form.condition}
                    onChange={v => setForm(f => ({ ...f, condition: v as string }))}
                    showUnassigned={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Purchase Date</label><input type="date" className="form-input" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Purchase Store</label><input className="form-input" value={form.purchaseStore} onChange={e => setForm(f => ({ ...f, purchaseStore: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Order Number</label><input className="form-input" value={form.orderNumber} onChange={e => setForm(f => ({ ...f, orderNumber: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Specs / Description</label><textarea className="form-input" rows={2} value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} /></div>
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => deleteDevice(focusDev.id)}>Delete</button>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDevice}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Device detail modal */}
      {modalType === 'detail' && focusDev && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="device-type-badge">{focusDev.type || 'Device'}</div>
                <div>
                  <div className="app-modal-title">{focusDev.name}</div>
                  <div className="device-serial-val">{focusDev.serial}</div>
                </div>
              </div>
              <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="app-modal-body">
              <div className="detail-row"><span className="detail-key">Make / Model</span><span className="detail-val">{focusDev.make} {focusDev.model}</span></div>
              <div className="detail-row"><span className="detail-key">Serial #</span>
                <div className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="device-serial-val">{focusDev.serial || '—'}</span>
                  {focusDev.serial && <button className="btn btn-sm btn-secondary copy-btn" onClick={() => navigator.clipboard.writeText(focusDev.serial)}>Copy</button>}
                </div>
              </div>
              <div className="detail-row"><span className="detail-key">Status</span><StatusPill s={focusDev.status} /></div>
              <div className="detail-row"><span className="detail-key">Condition</span><span className="detail-val">{focusDev.condition || '—'}</span></div>
              <div className="detail-row"><span className="detail-key">Purchased</span><span className="detail-val">{focusDev.purchaseDate || '—'}</span></div>
              {focusDev.purchaseStore && <div className="detail-row"><span className="detail-key">Store</span><span className="detail-val">{focusDev.purchaseStore}</span></div>}
              {focusDev.orderNumber && (
                <div className="detail-row"><span className="detail-key">Order #</span>
                  <div className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="device-serial-val">{focusDev.orderNumber}</span>
                    <button className="btn btn-sm btn-secondary copy-btn" onClick={() => navigator.clipboard.writeText(focusDev.orderNumber)}>Copy</button>
                  </div>
                </div>
              )}
              {focusDev.specs && <div className="detail-row detail-col"><span className="detail-key">Specs</span><span className="device-specs">{focusDev.specs}</span></div>}
              {focusAssignee && <div className="detail-row"><span className="detail-key">Assigned To</span><span className="detail-val">{focusAssignee.name}</span></div>}
              {assignHistory.length > 0 && (
                <div className="detail-row detail-col">
                  <span className="detail-key detail-history-key">Assignment History</span>
                  {assignHistory.map(h => {
                    const emp = db.employees.find(e => e.id === h.employeeId) || { name: 'Unknown' }
                    const days = Math.floor((Date.now() - new Date(h.assignedAt).getTime()) / 86400000)
                    const rel  = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? days + 'd ago' : Math.floor(days / 7) + 'w ago'
                    return <div key={h.id} className="detail-history-row"><span>{emp.name}</span><span className="detail-history-time">{rel}</span></div>
                  })}
                </div>
              )}
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-sm btn-secondary" title="Edit" onClick={() => openEdit(focusDev.id)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l4 4-6 6H4v-4l6-6z"/></svg>
              </button>
              {focusDev.status === 'available' && <>
                <button className="btn btn-primary" onClick={() => openAssign(focusDev.id)}>Assign to Employee</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDeviceStatus(focusDev.id, 'inactive')}>Mark inactive</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDeviceStatus(focusDev.id, 'lost')}>Mark lost</button>
              </>}
              {focusDev.status === 'assigned' && <button className="btn btn-danger" onClick={() => openReturn(focusDev.id)}>Return Device</button>}
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {modalType === 'assign' && focusDev && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">Assign {focusDev.name}</div>
              <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="app-modal-body">
              <div className="form-group">
                <label className="form-label">Employee</label>
                <CustomPicker
                  placeholder="Select employee\u2026"
                  options={db.employees.map(e => {
                    const hasType = db.assignments.filter(a => a.employeeId === e.id && a.status === 'active').some(a => { const dv = db.devices.find(d => d.id === a.deviceId); return dv?.type === focusDev.type })
                    return { value: e.id, label: e.name + ' \u2014 ' + e.role + (hasType ? ' (already has ' + focusDev.type + ')' : '') }
                  })}
                  selected={assignEmpId}
                  onChange={v => setAssignEmpId(v as string)}
                  showUnassigned={false}
                />
              </div>
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={assignDevice}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Return modal */}
      {modalType === 'return' && focusDev && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">
            <div className="app-modal-header">
              <div className="app-modal-title">Return Device</div>
              <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
            </div>
            <div className="app-modal-body">
              <p style={{ margin: '0 0 16px' }}>Return <strong>{focusDev.name}</strong> from <strong>{assigneeFirstName || 'employee'}</strong>. Set new status:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => finalizeReturn('available')}>Available — back in stock</button>
                <button className="btn btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => finalizeReturn('inactive')}>Inactive — retired or broken</button>
                <button className="btn btn-secondary btn--danger-text" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => finalizeReturn('lost')}>Lost — cannot locate</button>
              </div>
            </div>
            <div className="app-modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Device Inventory</div>
          <div className="page-subtitle">{db.devices.length} devices &middot; {avail} available</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Device</button>
      </div>

      <div className="filter-bar">
        <button className={'btn btn-secondary btn-sm' + (!filterStatus ? ' btn-active' : '')} onClick={() => setFilterStatus('')}>All ({db.devices.length})</button>
        <button className={'btn btn-secondary btn-sm' + (filterStatus === 'available' ? ' btn-active' : '')} onClick={() => setFilterStatus('available')}>Available ({avail})</button>
        <button className={'btn btn-secondary btn-sm' + (filterStatus === 'assigned' ? ' btn-active' : '')} onClick={() => setFilterStatus('assigned')}>Assigned ({assigned})</button>
        <button className={'btn btn-secondary btn-sm' + (filterStatus === 'inactive' ? ' btn-active' : '')} onClick={() => setFilterStatus('inactive')}>Inactive ({inactive})</button>
        <button className={'btn btn-secondary btn-sm' + (filterStatus === 'lost' ? ' btn-active' : '')} onClick={() => setFilterStatus('lost')}>Lost ({lost})</button>
      </div>

      <div className="device-grid" id="device-grid">
        {visibleDevices.map(d => {
          const empFirstName = d.assignedTo ? (db.employees.find(e => e.id === d.assignedTo)?.name.split(' ')[0] || '') : ''
          return (
            <div key={d.id} className="device-card" onClick={() => openDetail(d.id)}>
              <div className="device-type-label">{d.type || 'Device'}</div>
              <div className="device-name">{d.name}</div>
              <div className="device-serial">{d.serial}</div>
              <div className="device-footer">
                <StatusPill s={d.status} />
                {d.assignedTo && empFirstName && <span className="device-assignee">{empFirstName}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
