'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import CustomPicker from '@/components/shared/CustomPicker'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { HrDB, Employee } from './types'
import { getList } from './types'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

interface EmpForm {
  firstName: string; lastName: string; role: string; dept: string
  startDate: string; manager: string; city: string; state: string
  country: string; email: string; status: string; buddy: string; location: string
}

const BLANK: EmpForm = {
  firstName: '', lastName: '', role: '', dept: '', startDate: '', manager: '',
  city: '', state: '', country: 'US', email: '', status: 'active', buddy: '', location: '',
}

function ini(name: string) { return (name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase() }

function StatusPill({ s }: { s: string }) {
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
  if (!s) return <span className="pill pill-gray">—</span>
  if (['active', 'good', 'new', 'available'].includes(s)) return <span className="pill pill-purple">{label}</span>
  if (s === 'onboarding') return <span className="pill pill-amber">{label}</span>
  if (s === 'pending') return <span className="pill pill-amber">{label}</span>
  if (s === 'inactive') return <span className="pill pill-gray">{label}</span>
  if (s === 'lost') return <span className="pill pill-red">{label}</span>
  return <span className="pill pill-gray">{label}</span>
}

const COLS = ['name', 'role', 'dept', 'status', 'location', 'startDate', 'manager', 'buddy'] as const
const COL_LABELS: Record<string, string> = { name: 'Employee', role: 'Role', dept: 'Dept', status: 'Status', location: 'City', startDate: 'Start Date', manager: 'Manager', buddy: 'Buddy' }

export default function HrDirectory({ db, setDb, setSyncState }: Props) {
  const [q, setQ]                   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept]   = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterCity, setFilterCity]   = useState('')
  const [sortCol, setSortCol]         = useState('name')
  const [sortDir, setSortDir]         = useState<1 | -1>(1)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [modalType, setModalType]     = useState<'add' | 'edit' | 'offboard' | null>(null)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState<EmpForm>(BLANK)
  const [offTrackId, setOffTrackId]   = useState('')
  const [offDate, setOffDate]         = useState('')

  const { softDelete, toastEl } = useSoftDelete<Employee>()

  const depts  = [...new Set(db.employees.map(e => e.dept).filter(Boolean))]
  const states = [...new Set(db.employees.map(e => e.state).filter(Boolean))]
  const cities = [...new Set(db.employees.map(e => e.city).filter(Boolean))]

  const filtered = (() => {
    let list = [...db.employees]
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(lq) || e.role.toLowerCase().includes(lq) ||
        (e.city || '').toLowerCase().includes(lq) || (e.state || '').toLowerCase().includes(lq) ||
        (e.email || '').toLowerCase().includes(lq)
      )
    }
    if (filterStatus) list = list.filter(e => e.status === filterStatus)
    if (filterDept) list = list.filter(e => e.dept === filterDept)
    if (filterState) list = list.filter(e => e.state === filterState)
    if (filterCity) list = list.filter(e => e.city === filterCity)
    list.sort((a, b) => {
      const av = (a as unknown as Record<string, string>)[sortCol] || ''
      const bv = (b as unknown as Record<string, string>)[sortCol] || ''
      return av.localeCompare(bv) * sortDir
    })
    return list
  })()

  const selected  = selectedId ? db.employees.find(e => e.id === selectedId) || null : null
  const offTracks = db.tracks.filter(t => t.type === 'offboarding' || t.type === 'role' || t.type === 'company')

  const empDevices = selected
    ? db.assignments.filter(a => a.employeeId === selected.id && a.status === 'active')
        .map(a => db.devices.find(d => d.id === a.deviceId)).filter(Boolean)
    : []

  const empSkills = selected
    ? (() => {
        const c = db.candidates.find(c => c.name === selected.name)
        return c?.skills?.trim() ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : []
      })()
    : []

  function sortBy(col: string) {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(1) }
  }

  function openAdd() { setForm(BLANK); setModalType('add') }

  function openEdit(e: Employee) {
    const [firstName, ...rest] = e.name.split(' ')
    setForm({
      firstName, lastName: rest.join(' '), role: e.role, dept: e.dept || '',
      startDate: e.startDate || '', manager: e.manager || '', city: e.city || '',
      state: e.state || '', country: e.country || 'US', email: e.email || '',
      status: e.status || 'active', buddy: e.buddy || '', location: e.location || '',
    })
    setEditingId(e.id)
    setModalType('edit')
  }

  function openOffboard(e: Employee) {
    setOffTrackId(offTracks[0]?.id || '')
    setOffDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0])
    setEditingId(e.id)
    setModalType('offboard')
  }

  function closeModal() { setModalType(null); setEditingId(null) }

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  async function addEmployee() {
    const name = (form.firstName + ' ' + form.lastName).trim()
    if (!name) return
    const ts = new Date().toISOString()
    const ne: Employee = {
      id: crypto.randomUUID(), name, role: form.role || 'TBD', dept: form.dept,
      status: 'active', client: '', location: form.city || 'Remote',
      city: form.city, state: form.state, country: form.country,
      manager: form.manager, buddy: '', startDate: form.startDate || 'TBD', endDate: '',
      email: form.email || form.firstName.toLowerCase() + '@vtwo.co',
      source: '', created_at: ts, updated_at: ts,
    }
    setDb(prev => ({ ...prev, employees: [ne, ...prev.employees] }))
    closeModal()
    await dbMulti([() => supabase.from('employees').insert(ne)])
  }

  async function saveEmployee() {
    const e = db.employees.find(x => x.id === editingId)
    if (!e) return
    const updated: Employee = {
      ...e, role: form.role, dept: form.dept, status: form.status,
      startDate: form.startDate, manager: form.manager, buddy: form.buddy,
      email: form.email, location: form.location || 'Remote',
      city: form.city, state: form.state, country: form.country,
      updated_at: new Date().toISOString(),
    }
    setDb(prev => ({ ...prev, employees: prev.employees.map(x => x.id === updated.id ? updated : x) }))
    closeModal()
    await dbMulti([() => supabase.from('employees').upsert(updated)])
  }

  function deleteEmployee(id: string) {
    const e = db.employees.find(x => x.id === id)
    if (!e) return
    closeModal()
    const runIds = db.onboardingRuns.filter(r => r.employeeId === id).map(r => r.id)
    softDelete(e, {
      displayName: e.name,
      onLocalRemove: () => {
        setDb(prev => ({
          ...prev,
          employees: prev.employees.filter(x => x.id !== id),
          devices: prev.devices.map(d => {
            const a = prev.assignments.find(a => a.employeeId === id && a.deviceId === d.id && a.status === 'active')
            return a ? { ...d, status: 'available', assignedTo: '' } : d
          }),
          assignments: prev.assignments.map(a => a.employeeId === id && a.status === 'active' ? { ...a, status: 'returned' } : a),
          onboardingRuns: prev.onboardingRuns.filter(r => r.employeeId !== id),
          runTasks: prev.runTasks.filter(t => !runIds.includes(t.runId)),
        }))
        if (selectedId === id) setSelectedId(null)
      },
      onLocalRestore: emp => {
        setDb(prev => ({ ...prev, employees: [emp, ...prev.employees] }))
      },
      onDeleteRecord: async () => {
        await dbMulti([() => supabase.from('employees').delete().eq('id', id)])
      },
    })
  }

  async function confirmOffboard() {
    const e = db.employees.find(x => x.id === editingId)
    if (!e || !offTrackId) return
    const ts = new Date().toISOString()
    const runId = crypto.randomUUID()
    const trackTasks = db.tasks.filter(t => t.trackId === offTrackId)
    const newTasks = trackTasks.map(tt => {
      const due = new Date(offDate)
      due.setDate(due.getDate() + parseInt(tt.dueDaysOffset || '0'))
      return { id: crypto.randomUUID(), runId, name: tt.name, ownerRole: tt.ownerRole, status: 'pending', dueDate: due.toISOString().split('T')[0], created_at: ts, updated_at: ts }
    })
    const updatedEmp = { ...e, status: 'offboarding', endDate: offDate, updated_at: ts }
    const newRun = { id: runId, employeeId: e.id, trackId: offTrackId, type: 'offboarding', status: 'active', startDate: offDate, created_at: ts }
    setDb(prev => ({
      ...prev,
      employees: prev.employees.map(x => x.id === e.id ? updatedEmp : x),
      onboardingRuns: [...prev.onboardingRuns, newRun],
      runTasks: [...prev.runTasks, ...newTasks],
    }))
    closeModal()
    await dbMulti([
      () => supabase.from('employees').upsert(updatedEmp),
      () => supabase.from('onboardingRuns').insert(newRun),
      ...newTasks.map(t => () => supabase.from('runTasks').insert(t)),
    ])
  }

  return (
    <div className="page page--split">
      {toastEl}

      {modalType && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">

            {modalType === 'add' && <>
              <div className="app-modal-header">
                <div className="app-modal-title">Add Employee</div>
                <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
              </div>
              <div className="app-modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Department</label>
                    <CustomPicker
                      placeholder="(none)"
                      options={getList(db.lists, 'dept').map(d => ({ value: d, label: d }))}
                      selected={form.dept}
                      onChange={v => setForm(f => ({ ...f, dept: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Manager</label>
                    <CustomPicker
                      placeholder="(none)"
                      options={db.employees.map(e => ({ value: e.name, label: e.name }))}
                      selected={form.manager}
                      onChange={v => setForm(f => ({ ...f, manager: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
              </div>
              <div className="app-modal-actions">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={addEmployee}>Add Employee</button>
              </div>
            </>}

            {modalType === 'edit' && editingId && <>
              <div className="app-modal-header">
                <div className="app-modal-title">Edit — {db.employees.find(e => e.id === editingId)?.name}</div>
                <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
              </div>
              <div className="app-modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Department</label>
                    <CustomPicker
                      placeholder="(none)"
                      options={getList(db.lists, 'dept').map(d => ({ value: d, label: d }))}
                      selected={form.dept}
                      onChange={v => setForm(f => ({ ...f, dept: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Status</label>
                    <CustomPicker
                      placeholder="Status"
                      options={['active', 'onboarding', 'offboarding', 'inactive'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                      selected={form.status}
                      onChange={v => setForm(f => ({ ...f, status: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Manager</label><input className="form-input" value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Buddy</label><input className="form-input" value={form.buddy} onChange={e => setForm(f => ({ ...f, buddy: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Work Location</label><input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
                </div>
              </div>
              <div className="app-modal-actions">
                <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => deleteEmployee(editingId)}>Delete</button>
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEmployee}>Save</button>
              </div>
            </>}

            {modalType === 'offboard' && editingId && <>
              <div className="app-modal-header">
                <div className="app-modal-title">Start Offboarding — {db.employees.find(e => e.id === editingId)?.name}</div>
                <button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button>
              </div>
              <div className="app-modal-body">
                <p className="modal-body-desc">This will set {db.employees.find(e => e.id === editingId)?.name}&apos;s status to <strong>offboarding</strong> and start a checklist track.</p>
                <div className="form-group">
                  <label className="form-label">Offboarding Track</label>
                  <CustomPicker
                    placeholder={offTracks.length ? 'Select track\u2026' : 'No tracks available — create one in Tracks'}
                    options={offTracks.map(t => ({ value: t.id, label: t.name }))}
                    selected={offTrackId}
                    onChange={v => setOffTrackId(v as string)}
                    showUnassigned={false}
                    disabled={offTracks.length === 0}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Day</label>
                  <input type="date" className="form-input" value={offDate} onChange={e => setOffDate(e.target.value)} />
                </div>
              </div>
              <div className="app-modal-actions">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmOffboard}>Start Offboarding</button>
              </div>
            </>}

          </div>
        </div>
      )}

      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Directory</div>
            <div className="page-subtitle">{db.employees.length} employees</div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
        </div>
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
            <input placeholder="Search name, role, city..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <CustomPicker
            placeholder="All statuses"
            options={['active', 'onboarding', 'offboarding', 'inactive'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            selected={filterStatus}
            onChange={v => setFilterStatus(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All departments"
            options={depts.map(d => ({ value: d, label: d }))}
            selected={filterDept}
            onChange={v => setFilterDept(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All states"
            options={states.map(s => ({ value: s, label: s }))}
            selected={filterState}
            onChange={v => setFilterState(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All cities"
            options={cities.map(c => ({ value: c, label: c }))}
            selected={filterCity}
            onChange={v => setFilterCity(v as string)}
            showUnassigned={false}
          />
        </div>
      </div>

      <div className="split-layout">
        <div className="split-list" style={{ padding: 0 }}>
          <div className="table-wrap dir-table-flush">
            <table>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col} className={sortCol === col ? 'sorted' : ''} onClick={() => sortBy(col)}>
                      {COL_LABELS[col]}
                      {sortCol === col && <span className="sort-arrow">{sortDir === 1 ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>No employees match this filter.</td></tr>
                ) : filtered.map(e => (
                  <tr
                    key={e.id}
                    className={'clickable' + (selectedId === e.id ? ' selected' : '')}
                    onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
                  >
                    <td>
                      <div className="person-cell">
                        <div className="person-av" style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>{ini(e.name)}</div>
                        <div>
                          <div className="person-name">{e.name}</div>
                          {e.email && <div className="person-sub">{e.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{e.role}</td>
                    <td>{e.dept || '—'}</td>
                    <td><StatusPill s={e.status} /></td>
                    <td>{e.location || e.city || '—'}</td>
                    <td>{e.startDate || '—'}</td>
                    <td>{e.manager || '—'}</td>
                    <td>{e.buddy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={'split-detail' + (selected ? ' open' : '')} id="emp-detail">
          {selected && (
            <>
              <div className="detail-header">
                <div className="detail-person-hdr" style={{ flex: 1 }}>
                  <div className="person-av person-av--md" style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>{ini(selected.name)}</div>
                  <div>
                    <div className="detail-person-name">{selected.name}</div>
                    <div className="detail-person-role">{selected.role}{selected.dept ? ' · ' + selected.dept : ''}</div>
                  </div>
                </div>
                <div className="detail-hdr-actions">
                  <button className="btn btn-sm btn-secondary" title="Edit" onClick={() => openEdit(selected)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l4 4-6 6H4v-4l6-6z"/></svg>
                  </button>
                  <button className="detail-close" aria-label="Close" onClick={() => setSelectedId(null)}>&times;</button>
                </div>
              </div>
              <div className="detail-body">
                <div className="detail-section">
                  <div className="detail-section-title">Info</div>
                  <div className="detail-row"><span className="detail-key">Status</span><StatusPill s={selected.status} /></div>
                  <div className="detail-row"><span className="detail-key">Manager</span><span className="detail-val">{selected.manager || '—'}</span></div>
                  <div className="detail-row"><span className="detail-key">Buddy</span><span className="detail-val">{selected.buddy || '—'}</span></div>
                  <div className="detail-row"><span className="detail-key">Location</span><span className="detail-val">{[selected.city, selected.state, selected.country].filter(Boolean).join(', ') || selected.location || '—'}</span></div>
                  {selected.email && <div className="detail-row"><span className="detail-key">Email</span><span className="detail-val detail-val-xs"><a href={'mailto:' + selected.email} className="link-accent">{selected.email}</a></span></div>}
                  <div className="detail-row"><span className="detail-key">Start Date</span><span className="detail-val">{selected.startDate || '—'}</span></div>
                  <div className="detail-row">
                    <span className="detail-key">Skills</span>
                    <div className="detail-val">
                      {empSkills.length ? empSkills.map((s, i) => <span key={i} className="pill pill-gray" style={{ margin: 'var(--spacing-2xs)' }}>{s}</span>) : <span>—</span>}
                    </div>
                  </div>
                </div>
                <div className="detail-section">
                  <div className="detail-section-title">Devices ({empDevices.length})</div>
                  {empDevices.length === 0 ? (
                    <div className="dir-no-devices">No devices assigned</div>
                  ) : empDevices.map(dv => dv && (
                    <div key={dv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{dv.name}</span>
                      <span className="pill pill-gray device-serial-val">{dv.serial}</span>
                    </div>
                  ))}
                </div>
                <div className="detail-section">
                  <div className="detail-section-title">Actions</div>
                  <div className="detail-action-col">
                    {selected.status !== 'offboarding' ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => openOffboard(selected)}>Start Offboarding Track</button>
                    ) : (
                      <span className="offboard-warning">&#9888; Offboarding in progress</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
