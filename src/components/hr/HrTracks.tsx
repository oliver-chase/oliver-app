'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppModal } from '@/components/shared/AppModal'
import CustomPicker from '@/components/shared/CustomPicker'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { HrDB, Track, TrackTask } from './types'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
}

interface TrackForm { name: string; type: string; autoApply: string }
interface TaskForm  { name: string; ownerRole: string; dueDaysOffset: string }

const BLANK_TRACK: TrackForm = { name: '', type: 'company', autoApply: 'false' }
const BLANK_TASK: TaskForm   = { name: '', ownerRole: '', dueDaysOffset: '1' }

type ModalType = 'add-track' | 'edit-track' | 'add-task' | 'edit-task' | null

export default function HrTracks({ db, setDb, setSyncState }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(db.tracks[0]?.id || null)
  const [modalType, setModalType]   = useState<ModalType>(null)
  const [trackForm, setTrackForm]   = useState<TrackForm>(BLANK_TRACK)
  const [taskForm, setTaskForm]     = useState<TaskForm>(BLANK_TASK)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const { modal, showModal }        = useAppModal()
  const { softDelete: softDeleteTrack, toastEl: trackToastEl } = useSoftDelete<Track>()
  const { softDelete: softDeleteTask, toastEl: taskToastEl }   = useSoftDelete<TrackTask>()

  const selectedTrack = selectedId ? db.tracks.find(t => t.id === selectedId) || null : null
  const trackTasks    = selectedId ? db.tasks.filter(t => t.trackId === selectedId).sort((a, b) => a.order - b.order) : []

  const dbMulti = useCallback(async (ops: Array<() => PromiseLike<unknown>>) => {
    setSyncState('syncing')
    try { await Promise.all(ops.map(fn => fn())); setSyncState('ok') } catch { setSyncState('error') }
  }, [setSyncState])

  function closeModal() { setModalType(null); setEditingId(null) }

  function openAddTrack() { setTrackForm(BLANK_TRACK); setModalType('add-track') }

  function openEditTrack(t: Track) {
    setTrackForm({ name: t.name, type: t.type, autoApply: String(t.autoApply) })
    setEditingId(t.id)
    setModalType('edit-track')
  }

  function openAddTask() { setTaskForm(BLANK_TASK); setModalType('add-task') }

  function openEditTask(t: TrackTask) {
    setTaskForm({ name: t.name, ownerRole: t.ownerRole, dueDaysOffset: t.dueDaysOffset })
    setEditingId(t.id)
    setModalType('edit-task')
  }

  async function addTrack() {
    if (!trackForm.name.trim()) return
    const ts = new Date().toISOString()
    const nt: Track = { id: crypto.randomUUID(), name: trackForm.name, type: trackForm.type, description: '', autoApply: trackForm.autoApply, createdAt: ts, updated_at: ts }
    setDb(prev => ({ ...prev, tracks: [...prev.tracks, nt] }))
    setSelectedId(nt.id)
    closeModal()
    await dbMulti([() => supabase.from('tracks').insert(nt)])
  }

  async function saveTrack() {
    const t = db.tracks.find(x => x.id === editingId)
    if (!t) return
    const updated = { ...t, name: trackForm.name, type: trackForm.type, autoApply: trackForm.autoApply, updated_at: new Date().toISOString() }
    setDb(prev => ({ ...prev, tracks: prev.tracks.map(x => x.id === updated.id ? updated : x) }))
    closeModal()
    await dbMulti([() => supabase.from('tracks').upsert(updated)])
  }

  function deleteTrack(id: string) {
    const t = db.tracks.find(x => x.id === id)
    if (!t) return
    closeModal()
    const removedTasks = db.tasks.filter(x => x.trackId === id)
    const nextId = db.tracks.filter(x => x.id !== id)[0]?.id || null
    softDeleteTrack(t, {
      displayName: t.name,
      onLocalRemove: () => {
        setDb(prev => ({ ...prev, tracks: prev.tracks.filter(x => x.id !== id), tasks: prev.tasks.filter(x => x.trackId !== id) }))
        setSelectedId(nextId)
      },
      onLocalRestore: track => {
        setDb(prev => ({ ...prev, tracks: [...prev.tracks, track], tasks: [...prev.tasks, ...removedTasks] }))
        setSelectedId(id)
      },
      onDeleteRecord: async () => {
        await dbMulti([() => supabase.from('tracks').delete().eq('id', id), () => supabase.from('tasks').delete().eq('trackId', id)])
      },
    })
  }

  async function addTask() {
    if (!taskForm.name.trim() || !selectedId) return
    const ts  = new Date().toISOString()
    const ord = trackTasks.length + 1
    const nt: TrackTask = { id: crypto.randomUUID(), trackId: selectedId, name: taskForm.name, ownerRole: taskForm.ownerRole, dueDaysOffset: taskForm.dueDaysOffset || '0', order: ord, created_at: ts, updated_at: ts }
    setDb(prev => ({ ...prev, tasks: [...prev.tasks, nt] }))
    closeModal()
    await dbMulti([() => supabase.from('tasks').insert(nt)])
  }

  async function saveTask() {
    const t = db.tasks.find(x => x.id === editingId)
    if (!t) return
    const updated = { ...t, name: taskForm.name, ownerRole: taskForm.ownerRole, dueDaysOffset: taskForm.dueDaysOffset || '0', updated_at: new Date().toISOString() }
    setDb(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === updated.id ? updated : x) }))
    closeModal()
    await dbMulti([() => supabase.from('tasks').upsert(updated)])
  }

  function deleteTask(id: string) {
    const t = db.tasks.find(x => x.id === id)
    if (!t) return
    softDeleteTask(t, {
      displayName: t.name,
      onLocalRemove: () => setDb(prev => ({ ...prev, tasks: prev.tasks.filter(x => x.id !== id) })),
      onLocalRestore: task => setDb(prev => ({ ...prev, tasks: [...prev.tasks, task] })),
      onDeleteRecord: async () => {
        setSyncState('syncing')
        try { await supabase.from('tasks').delete().eq('id', id); setSyncState('ok') } catch { setSyncState('error') }
      },
    })
  }

  return (
    <div className="page page--split">
      {modal}
      {trackToastEl}
      {taskToastEl}

      {modalType && (
        <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="app-modal" role="dialog" aria-modal="true">

            {modalType === 'add-track' && <>
              <div className="app-modal-header"><div className="app-modal-title">New Track</div><button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button></div>
              <div className="app-modal-body">
                <div className="form-group"><label className="form-label">Track Name</label><input className="form-input" placeholder="e.g. Design Onboarding" value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Type</label>
                    <CustomPicker
                      placeholder="Type"
                      options={['company', 'role', 'client', 'offboarding'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                      selected={trackForm.type}
                      onChange={v => setTrackForm(f => ({ ...f, type: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Auto-apply</label>
                    <CustomPicker
                      placeholder="Auto-apply"
                      options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
                      selected={trackForm.autoApply}
                      onChange={v => setTrackForm(f => ({ ...f, autoApply: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                </div>
              </div>
              <div className="app-modal-actions"><button className="btn btn-secondary" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={addTrack}>Create</button></div>
            </>}

            {modalType === 'edit-track' && editingId && <>
              <div className="app-modal-header"><div className="app-modal-title">Edit Track</div><button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button></div>
              <div className="app-modal-body">
                <div className="form-group"><label className="form-label">Track Name</label><input className="form-input" value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Type</label>
                    <CustomPicker
                      placeholder="Type"
                      options={['company', 'role', 'client', 'offboarding'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                      selected={trackForm.type}
                      onChange={v => setTrackForm(f => ({ ...f, type: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                  <div className="form-group"><label className="form-label">Auto-apply</label>
                    <CustomPicker
                      placeholder="Auto-apply"
                      options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                      selected={trackForm.autoApply}
                      onChange={v => setTrackForm(f => ({ ...f, autoApply: v as string }))}
                      showUnassigned={false}
                    />
                  </div>
                </div>
              </div>
              <div className="app-modal-actions">
                <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => deleteTrack(editingId)}>Delete Track</button>
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={saveTrack}>Save</button>
              </div>
            </>}

            {modalType === 'add-task' && <>
              <div className="app-modal-header"><div className="app-modal-title">Add Task</div><button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button></div>
              <div className="app-modal-body">
                <div className="form-group"><label className="form-label">Task Name</label><input className="form-input" placeholder="e.g. Complete I-9 paperwork" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Owner</label><input className="form-input" placeholder="e.g. HR, IT, Manager" value={taskForm.ownerRole} onChange={e => setTaskForm(f => ({ ...f, ownerRole: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Due (days from start date)</label><input type="number" className="form-input" value={taskForm.dueDaysOffset} onChange={e => setTaskForm(f => ({ ...f, dueDaysOffset: e.target.value }))} /></div>
                </div>
              </div>
              <div className="app-modal-actions"><button className="btn btn-secondary" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={addTask}>Add Task</button></div>
            </>}

            {modalType === 'edit-task' && editingId && <>
              <div className="app-modal-header"><div className="app-modal-title">Edit Task</div><button className="detail-close" aria-label="Close" onClick={closeModal}>&times;</button></div>
              <div className="app-modal-body">
                <div className="form-group"><label className="form-label">Task Name</label><input className="form-input" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Owner</label><input className="form-input" value={taskForm.ownerRole} onChange={e => setTaskForm(f => ({ ...f, ownerRole: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Due (days from start)</label><input type="number" className="form-input" value={taskForm.dueDaysOffset} onChange={e => setTaskForm(f => ({ ...f, dueDaysOffset: e.target.value }))} /></div>
                </div>
              </div>
              <div className="app-modal-actions"><button className="btn btn-secondary" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveTask}>Save</button></div>
            </>}

          </div>
        </div>
      )}

      <div className="split-layout">
        <div className="track-sidebar">
          <div className="track-sidebar-label">Track Templates</div>
          <div id="track-list">
            {db.tracks.map(t => (
              <div
                key={t.id}
                className={'track-list-item' + (selectedId === t.id ? ' active' : '')}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="track-list-item-name">{t.name}</div>
                <div className="track-list-item-meta">{t.type} &middot; {db.tasks.filter(tk => tk.trackId === t.id).length} tasks</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary track-new-btn" onClick={openAddTrack}>+ New Track</button>
        </div>

        <div className="split-list" id="track-detail">
          {selectedTrack ? (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">{selectedTrack.name}</div>
                  <div className="page-subtitle">Type: {selectedTrack.type} &middot; Auto-apply: {selectedTrack.autoApply === 'true' || selectedTrack.autoApply === true ? 'Yes' : 'No'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-secondary" title="Edit" onClick={() => openEditTrack(selectedTrack)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l4 4-6 6H4v-4l6-6z"/></svg>
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => {}}>Apply Track</button>
                </div>
              </div>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="track-sidebar-label" style={{ marginBottom: 0, padding: 0 }}>Tasks ({trackTasks.length})</div>
                  <button className="btn btn-sm btn-secondary" onClick={openAddTask}>+ Add Task</button>
                </div>
                <div id="task-list">
                  {trackTasks.length === 0 ? (
                    <div className="task-empty">No tasks yet — add one above</div>
                  ) : trackTasks.map((task, i) => {
                    const days = parseInt(task.dueDaysOffset)
                    const dayLabel = days === 0 ? 'Day 0' : days > 0 ? '+' + days + 'd' : days + 'd'
                    return (
                      <div key={task.id} className="task-row">
                        <div className="task-step-num">{i + 1}</div>
                        <div className="task-info">
                          <div className="task-name">{task.name}</div>
                          <div className="task-owner">Owner: {task.ownerRole}</div>
                        </div>
                        <div className="task-day">{dayLabel}</div>
                        <button className="btn btn-sm btn-secondary" title="Edit task" onClick={() => openEditTask(task)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l4 4-6 6H4v-4l6-6z"/></svg>
                        </button>
                        <button className="btn-ghost btn-sm btn-icon-danger" onClick={() => deleteTask(task.id)}>&#x2715;</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-title">No tracks yet</div>
              <div className="empty-sub">Create a track template to get started.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
