'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { dbWrite } from '@/lib/db-helpers'
import { useAppModal } from '@/components/shared/AppModal'
import CustomPicker from '@/components/shared/CustomPicker'
import PromoteEmployeeModal from './PromoteEmployeeModal'
import InterviewLogModal from './InterviewLogModal'
import EditCandidateModal from './EditCandidateModal'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import { useSoftDelete } from '@/hooks/useSoftDelete'
import type { HrDB, Candidate, Employee, Interview } from './types'
import { STAGES, getList } from './types'
import { filenameForDownload, parseResumeAssets, serializeResumeAssets } from '@/lib/hr-assets'

interface Props {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
  pendingEditId?: string | null
  onEditConsumed?: () => void
}

type ViewMode = 'kanban' | 'table'

const STAGE_COLOR: Record<string, string> = {
  sourced: 'gray', screening: 'gray', interview: 'amber', offer: 'purple', hired: 'purple',
}
const STATUS_COLOR: Record<string, string> = {
  Active: 'purple', 'On Hold': 'amber', Nurturing: 'gray', Hired: 'purple', Closed: 'gray',
}

function relTime(d: string) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return days + 'd ago'
  if (days < 30) return Math.floor(days / 7) + 'w ago'
  if (days < 365) return Math.floor(days / 30) + 'mo ago'
  return Math.floor(days / 365) + 'y ago'
}

function locDisplay(c: Candidate) { return [c.city, c.state].filter(Boolean).join(', ') || '—' }
function compDisplay(c: Candidate) { return c.compAmount ? (c.compType === 'hourly' ? '$' + c.compAmount + '/hr' : '$' + parseInt(c.compAmount, 10).toLocaleString()) : '—' }

function StagePill({ stage }: { stage: string }) {
  const label = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : '—'
  return <span className={'pill pill-' + (STAGE_COLOR[stage] || 'gray')}>{label}</span>
}
function StatusPill({ status }: { status: string }) {
  return <span className={'pill pill-' + (STATUS_COLOR[status] || 'gray')}>{status || '—'}</span>
}

export default function HrHiring({ db, setDb, setSyncState, pendingEditId, onEditConsumed }: Props) {
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [stage, setStage]       = useState('')
  const [dept, setDept]         = useState('')
  const [location, setLocation] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [view, setView]         = useState<ViewMode>('kanban')
  const [sortCol, setSortCol]   = useState('updatedAt')
  const [sortDir, setSortDir]   = useState<1 | -1>(-1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragId, setDragId]     = useState<string | null>(null)
  const [promoteCand, setPromoteCand] = useState<Candidate | null>(null)
  const [logIvFor, setLogIvFor] = useState<Candidate | null>(null)
  const [editIvId, setEditIvId] = useState<string | null>(null)
  const [confirmDelIvId, setConfirmDelIvId] = useState<string | null>(null)
  const [editCand, setEditCand] = useState<Candidate | null>(null)
  const [confirmDelCand, setConfirmDelCand] = useState<Candidate | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedId) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Element
      if (detailRef.current?.contains(t)) return
      if (t.closest('.kanban-card') || t.closest('tr.clickable')) return
      setSelectedId(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [selectedId])

  useEffect(() => {
    if (!pendingEditId) return
    const c = db.candidates.find(x => x.id === pendingEditId)
    if (c) { setSelectedId(c.id); setEditCand(c) }
    onEditConsumed?.()
  }, [pendingEditId, db.candidates, onEditConsumed])
  const { modal, showModal }    = useAppModal()

  async function requestMoveToHired(c: Candidate) {
    const { buttonValue } = await showModal({
      title: 'Move to Hired',
      message: 'Move "' + c.name + '" to hired status?',
      confirmLabel: 'Yes, Move to Hired',
    })
    if (buttonValue === 'confirm') setPromoteCand(c)
  }

  const { softDelete, toastEl } = useSoftDelete<Candidate>()

  const statuses = [...new Set(db.candidates.map(c => c.candStatus).filter(Boolean))]
  const depts    = [...new Set(db.candidates.map(c => c.dept).filter(Boolean))]
  const locationOptions = [...new Set(
    db.candidates.map(c => [c.city, c.state].filter(Boolean).join(', ')).filter(Boolean)
  )].sort().map(l => ({ value: l, label: l }))

  const empWithActiveOnboarding = db.onboardingRuns.filter(r => r.status === 'active' && r.type === 'onboarding').map(r => r.employeeId)
  const onboardingEmpNames = db.employees.filter(e => empWithActiveOnboarding.includes(e.id)).map(e => e.name)

  function getFiltered() {
    let list = [...db.candidates].filter(c => !onboardingEmpNames.includes(c.name))
    if (view === 'kanban' && !status && !showArchived) list = list.filter(c => c.candStatus !== 'Hired' && c.candStatus !== 'Closed')
    if (q) { const lq = q.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(lq) || c.role.toLowerCase().includes(lq) || (c.city || '').toLowerCase().includes(lq)) }
    if (status) list = list.filter(c => c.candStatus === status)
    if (stage) list = list.filter(c => c.stage === stage)
    if (dept) list = list.filter(c => c.dept === dept)
    if (location) list = list.filter(c => [c.city, c.state].filter(Boolean).join(', ') === location)
    return list
  }

  const list = getFiltered()
  const visibleCandidates = db.candidates.filter(c => !onboardingEmpNames.includes(c.name))
  const total = visibleCandidates.length
  const archivedCount = visibleCandidates.filter(c => c.candStatus === 'Hired' || c.candStatus === 'Closed').length
  const subtitle = (view === 'kanban' && !showArchived && !status && archivedCount > 0)
    ? `${list.length} active · ${archivedCount} archived`
    : `${list.length} of ${total} candidates`

  const selected = selectedId ? db.candidates.find(c => c.id === selectedId) || null : null
  const selectedResumes = selected ? parseResumeAssets(selected.resumeLink) : []

  const save = useCallback(async (c: Candidate) => {
    setDb(prev => ({ ...prev, candidates: prev.candidates.map(x => x.id === c.id ? c : x) }))
    setSyncState('syncing')
    try { await dbWrite(supabase.from('candidates').upsert(c), 'hiring.candidateUpsert'); setSyncState('ok') } catch { setSyncState('error') }
  }, [setDb, setSyncState])

  async function moveStage(id: string, newStage: string) {
    const c = db.candidates.find(x => x.id === id)
    if (!c) return
    if (newStage === 'hired' && !alreadyEmployee(c)) { await requestMoveToHired(c); return }
    const updated = { ...c, stage: newStage, updatedAt: new Date().toISOString() }
    await save(updated)
    if (selectedId === id) setSelectedId(id)
  }

  async function setCandStatus(id: string, newStatus: string) {
    const c = db.candidates.find(x => x.id === id)
    if (!c) return
    if (newStatus === 'Hired' && !alreadyEmployee(c)) { await requestMoveToHired(c); return }
    await save({ ...c, candStatus: newStatus, updatedAt: new Date().toISOString() })
  }

  function alreadyEmployee(c: Candidate) {
    return db.employees.some(e => e.name.toLowerCase() === c.name.toLowerCase())
  }

  async function doPromote(dept: string, startDate: string) {
    const c = promoteCand
    if (!c) return
    const now = new Date().toISOString()
    const autoEmail = c.email || (c.name.split(' ')[0].toLowerCase() + '@vtwo.co')
    const newEmp: Employee = {
      id: 'EMP-' + crypto.randomUUID(),
      name: c.name,
      role: c.role || '',
      dept,
      status: 'active',
      client: c.client || '',
      location: '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || '',
      manager: '',
      buddy: '',
      startDate,
      endDate: '',
      email: autoEmail,
      source: c.source || '',
      created_at: now,
      updated_at: now,
    }
    setSyncState('syncing')
    setDb(prev => ({
      ...prev,
      employees: [newEmp, ...prev.employees],
      candidates: prev.candidates.map(x => x.id === c.id ? { ...x, stage: 'hired', candStatus: 'Hired', updatedAt: now } : x),
    }))
    setPromoteCand(null)
    try {
      await dbWrite(supabase.from('employees').insert(newEmp), 'hiring.promoteInsertEmployee')
      await dbWrite(supabase.from('candidates').update({ stage: 'hired', candStatus: 'Hired', updatedAt: now }).eq('id', c.id), 'hiring.promoteUpdateCandidate')
      setSyncState('ok')
    } catch {
      setSyncState('error')
    }
  }

  function deleteCandConfirmed(c: Candidate) {
    softDelete(c, {
      displayName: c.name,
      onLocalRemove: () => {
        setDb(prev => ({ ...prev, candidates: prev.candidates.filter(x => x.id !== c.id) }))
        if (selectedId === c.id) setSelectedId(null)
      },
      onLocalRestore: cand => {
        setDb(prev => ({ ...prev, candidates: [cand, ...prev.candidates] }))
      },
      onDeleteRecord: async () => {
        setSyncState('syncing')
        try { await dbWrite(supabase.from('candidates').delete().eq('id', c.id), 'hiring.candidateDelete'); setSyncState('ok') } catch { setSyncState('error') }
      },
    })
  }

  function requestDeleteCand(id: string) {
    const c = db.candidates.find(x => x.id === id)
    if (c) setConfirmDelCand(c)
  }

  function tableSortBy(col: string) {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortCol(col); setSortDir(-1) }
  }

  const sortedList = [...list].sort((a, b) => {
    const av = (a as unknown as Record<string, string>)[sortCol] || ''
    const bv = (b as unknown as Record<string, string>)[sortCol] || ''
    return av.localeCompare(bv) * sortDir
  })

  const candIvs = selected ? db.interviews.filter(iv => iv.candidateId === selected.id) : []

  async function requestDeleteResumeVersion(cand: Candidate, resumeId: string) {
    const versions = parseResumeAssets(cand.resumeLink)
    const target = versions.find(v => v.id === resumeId)
    if (!target) return
    const { buttonValue } = await showModal({
      title: 'Delete Resume Version',
      message: 'Delete "' + target.name + '"?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })
    if (buttonValue !== 'confirm') return
    const updated = {
      ...cand,
      resumeLink: serializeResumeAssets(versions.filter(v => v.id !== resumeId)),
      updatedAt: new Date().toISOString(),
    }
    await save(updated)
  }

  return (
    <div className="page page--split">
      {modal}
      {toastEl}
      {promoteCand && (
        <PromoteEmployeeModal
          candidate={promoteCand}
          depts={getList(db.lists, 'dept')}
          onConfirm={doPromote}
          onCancel={() => setPromoteCand(null)}
        />
      )}
      {editCand && (
        <EditCandidateModal
          candidate={editCand}
          lists={db.lists}
          onCancel={() => setEditCand(null)}
          onDelete={() => { setConfirmDelCand(editCand); setEditCand(null) }}
          onSave={async updated => {
            setSyncState('syncing')
            setDb(prev => ({ ...prev, candidates: prev.candidates.map(x => x.id === updated.id ? updated : x) }))
            setEditCand(null)
            try { await dbWrite(supabase.from('candidates').update(updated).eq('id', updated.id), 'hiring.candidateEditSave'); setSyncState('ok') } catch { setSyncState('error') }
          }}
        />
      )}
      {confirmDelCand && (
        <DeleteConfirmModal
          title="Delete candidate"
          message={'Permanently delete "' + confirmDelCand.name + '" and all their interviews? This cannot be undone (you will get a 5-second undo toast).'}
          confirmLabel="Delete"
          onConfirm={() => { const c = confirmDelCand; setConfirmDelCand(null); deleteCandConfirmed(c) }}
          onCancel={() => setConfirmDelCand(null)}
        />
      )}
      {logIvFor && (
        <InterviewLogModal
          candidate={logIvFor}
          lists={db.lists}
          onSave={async values => {
            const cand = logIvFor
            const now = new Date().toISOString()
            const iv: Interview = {
              id: 'IV-' + crypto.randomUUID(),
              candidateId: cand.id,
              date: values.date,
              interviewers: values.interviewers,
              notes: values.notes,
              score: values.score,
              created_at: now,
              updated_at: now,
            }
            setSyncState('syncing')
            setDb(prev => ({
              ...prev,
              interviews: [...prev.interviews, iv],
              candidates: prev.candidates.map(x => x.id === cand.id ? { ...x, updatedAt: now } : x),
            }))
            setLogIvFor(null)
            try {
              await dbWrite(supabase.from('interviews').insert(iv), 'hiring.interviewLogInsert')
              await dbWrite(supabase.from('candidates').update({ updatedAt: now }).eq('id', cand.id), 'hiring.interviewLogTouchCand')
              setSyncState('ok')
            } catch {
              setSyncState('error')
            }
          }}
          onCancel={() => setLogIvFor(null)}
        />
      )}
      {editIvId && (() => {
        const iv = db.interviews.find(x => x.id === editIvId)
        const cand = iv ? db.candidates.find(c => c.id === iv.candidateId) : null
        if (!iv || !cand) return null
        return (
          <InterviewLogModal
            candidate={cand}
            lists={db.lists}
            initial={{ date: iv.date, score: iv.score, interviewers: iv.interviewers, notes: iv.notes }}
            onSave={async values => {
              const now = new Date().toISOString()
              const updated: Interview = { ...iv, ...values, updated_at: now }
              setSyncState('syncing')
              setDb(prev => ({ ...prev, interviews: prev.interviews.map(x => x.id === iv.id ? updated : x) }))
              setEditIvId(null)
              try { await dbWrite(supabase.from('interviews').update(updated).eq('id', iv.id), 'hiring.interviewUpdate'); setSyncState('ok') } catch { setSyncState('error') }
            }}
            onCancel={() => setEditIvId(null)}
          />
        )
      })()}
      {confirmDelIvId && (
        <DeleteConfirmModal
          title="Delete interview"
          message="Permanently remove this interview record? This cannot be undone."
          onConfirm={async () => {
            const id = confirmDelIvId
            setConfirmDelIvId(null)
            setSyncState('syncing')
            setDb(prev => ({ ...prev, interviews: prev.interviews.filter(x => x.id !== id) }))
            try { await dbWrite(supabase.from('interviews').delete().eq('id', id), 'hiring.interviewDelete'); setSyncState('ok') } catch { setSyncState('error') }
          }}
          onCancel={() => setConfirmDelIvId(null)}
        />
      )}
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Hiring Pipeline</div>
            <div className="page-subtitle">{subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-primary" onClick={async () => {
              const { buttonValue, inputValue } = await showModal({ title: 'Add Candidate', inputPlaceholder: 'Full name', confirmLabel: 'Add' })
              if (buttonValue !== 'confirm' || !inputValue.trim()) return
              const now = new Date().toISOString()
              const rec: Candidate = { id: 'CAND-' + crypto.randomUUID(), name: inputValue.trim(), role: '', seniority: '', dept: '', source: '', stage: 'sourced', candStatus: 'Active', empType: '', compType: '', compAmount: '', city: '', state: '', country: '', client: '', email: '', resumeLink: '', skills: '', addedAt: now, updatedAt: now, notes: '', rejectionReason: '', offerAmount: '', offerDate: '', offerStatus: '' }
              setDb(prev => ({ ...prev, candidates: [rec, ...prev.candidates] }))
              setSyncState('syncing')
              try { await dbWrite(supabase.from('candidates').insert(rec), 'hiring.addCandidate'); setSyncState('ok') } catch { setSyncState('error') }
            }}>+ Add Candidate</button>
          </div>
        </div>
        <div className="filter-bar">
          <div className="filter-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
            <input placeholder="Search name, role, city..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <CustomPicker
            placeholder="All statuses"
            options={statuses.map(s => ({ value: s, label: s }))}
            selected={status}
            onChange={v => setStatus(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All stages"
            options={STAGES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            selected={stage}
            onChange={v => setStage(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All departments"
            options={depts.map(d => ({ value: d, label: d }))}
            selected={dept}
            onChange={v => setDept(v as string)}
            showUnassigned={false}
          />
          <CustomPicker
            placeholder="All locations"
            options={locationOptions}
            selected={location}
            onChange={v => setLocation(v as string)}
            showUnassigned={false}
          />
          <button
            className={'btn btn-sm btn-secondary' + (showArchived ? ' btn-active' : '')}
            onClick={() => setShowArchived(a => !a)}
            title="Show/hide Hired & Closed in Kanban"
          >
            {showArchived ? `Showing Hired & Closed${archivedCount ? ` (${archivedCount})` : ''}` : `Show Hired & Closed${archivedCount ? ` (${archivedCount})` : ''}`}
          </button>
          <div className="view-toggle" style={{ marginLeft: 'auto' }}>
            <button className={'view-btn' + (view === 'kanban' ? ' active' : '')} onClick={() => setView('kanban')}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="4" height="14" rx="1"/><rect x="6" y="1" width="4" height="14" rx="1"/><rect x="11" y="1" width="4" height="14" rx="1"/></svg>
              {' '}Kanban
            </button>
            <button className={'view-btn' + (view === 'table' ? ' active' : '')} onClick={() => setView('table')}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="1.5"/><path d="M1 5h14M1 9h14M5 5v9M11 5v9"/></svg>
              {' '}Table
            </button>
          </div>
        </div>
      </div>

      <div className="split-layout">
        <div className="split-list" id="hiring-main">
          {view === 'kanban' ? (
            <div className="kanban">
              {STAGES.map(s => {
                const col = list.filter(c => c.stage === s)
                return (
                  <div
                    key={s}
                    className="kanban-col"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragId) moveStage(dragId, s); setDragId(null) }}
                  >
                    <div className="kanban-col-header">
                      <span className="kanban-col-name">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      <span className="kanban-count">{col.length}</span>
                    </div>
                    {col.map(c => {
                      const ivCount = db.interviews.filter(iv => iv.candidateId === c.id).length
                      return (
                        <div
                          key={c.id}
                          className={'kanban-card' + (selectedId === c.id ? ' selected' : '')}
                          draggable
                          onDragStart={() => setDragId(c.id)}
                          onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                        >
                          <div className="kanban-name">{c.name}</div>
                          <div className="kanban-role">{c.role}</div>
                          <div className="kanban-meta">
                            <StatusPill status={c.candStatus} />
                            {c.dept && <span className="pill pill-gray">{c.dept}</span>}
                          </div>
                          <div className="kanban-footer">
                            <span className="kanban-meta-text">{locDisplay(c)}</span>
                            {ivCount > 0 && (
                              <span className="kanban-iv-count">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/></svg>
                                {ivCount}
                              </span>
                            )}
                          </div>
                          <div className="kanban-ts">{relTime(c.updatedAt)}</div>
                        </div>
                      )
                    })}
                    {col.length === 0 && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text3)', padding: 'var(--spacing-sm) 0' }}>Empty</div>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(['name', 'role', 'seniority', 'dept', 'stage', 'candStatus', 'empType', 'compAmount', 'source', 'city'] as const).map(col => {
                      const labels: Record<string, string> = { name: 'Name', role: 'Role', seniority: 'Seniority', dept: 'Dept', stage: 'Stage', candStatus: 'Status', empType: 'Type', compAmount: 'Comp', source: 'Source', city: 'Location' }
                      return (
                        <th key={col} className={sortCol === col ? 'sorted' : ''} onClick={() => tableSortBy(col)}>
                          {labels[col]}
                          {sortCol === col && <span className="sort-arrow">{sortDir === 1 ? '↑' : '↓'}</span>}
                        </th>
                      )
                    })}
                    <th>Interviews</th>
                    <th className={sortCol === 'updatedAt' ? 'sorted' : ''} onClick={() => tableSortBy('updatedAt')}>
                      Updated{sortCol === 'updatedAt' && <span className="sort-arrow">{sortDir === 1 ? '↑' : '↓'}</span>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--gray)' }}>No candidates match this filter.</td></tr>
                  ) : sortedList.map(c => {
                    const ivCount = db.interviews.filter(iv => iv.candidateId === c.id).length
                    return (
                      <tr key={c.id} className={'clickable' + (selectedId === c.id ? ' selected' : '')} onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}>
                        <td>
                          <div className="person-cell">
                            <div>
                              <div className="person-name">{c.name}</div>
                              {c.email && <div className="person-sub">{c.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{c.role}</td>
                        <td>{c.seniority || '—'}</td>
                        <td>{c.dept || '—'}</td>
                        <td><StagePill stage={c.stage} /></td>
                        <td><StatusPill status={c.candStatus} /></td>
                        <td>{c.empType || '—'}</td>
                        <td className="td-xs">{compDisplay(c)}</td>
                        <td>{c.source || '—'}</td>
                        <td className="td-xs">{locDisplay(c)}</td>
                        <td style={{ textAlign: 'center' }}>{ivCount || '—'}</td>
                        <td className="td-muted">{relTime(c.updatedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Candidate detail panel */}
        <div ref={detailRef} className={'split-detail' + (selected ? ' open' : '')} id="cand-detail">
          {selected && (
            <>
              <div className="detail-header">
                <div className="detail-person-main">
                  <div className="detail-person-hdr">
                    <div>
                      <div className="detail-person-name">{selected.name}</div>
                      <div className="detail-person-role">{selected.role}{selected.seniority ? ' · ' + selected.seniority : ''}</div>
                    </div>
                  </div>
                  <div className="detail-pills">
                    <StagePill stage={selected.stage} />
                    <StatusPill status={selected.candStatus} />
                    {selected.dept && <span className="pill pill-gray">{selected.dept}</span>}
                  </div>
                </div>
                <div className="detail-hdr-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => setEditCand(selected)}>Edit</button>
                  <button className="detail-close" aria-label="Close" onClick={() => setSelectedId(null)}>&times;</button>
                </div>
              </div>
              <div className="detail-body">
                <div className="detail-section">
                  <div className="detail-section-title">Details</div>
                  <div className="detail-row"><span className="detail-key">Employment Type</span><span className="detail-val">{selected.empType || '—'}</span></div>
                  <div className="detail-row"><span className="detail-key">Compensation</span><span className="detail-val">{compDisplay(selected)}</span></div>
                  <div className="detail-row"><span className="detail-key">Source</span><span className="detail-val">{selected.source || '—'}</span></div>
                  {selected.client && <div className="detail-row"><span className="detail-key">Client</span><span className="detail-val">{selected.client}</span></div>}
                  <div className="detail-row"><span className="detail-key">Location</span><span className="detail-val">{locDisplay(selected)}</span></div>
                  {selected.email && <div className="detail-row"><span className="detail-key">Email</span><span className="detail-val detail-val-xs"><a href={'mailto:' + selected.email} className="link-accent">{selected.email}</a></span></div>}
                  <div className="detail-row"><span className="detail-key">Added</span><span className="detail-val">{relTime(selected.addedAt)}</span></div>
                  <div className="detail-row"><span className="detail-key">Last Updated</span><span className="detail-val">{relTime(selected.updatedAt)}</span></div>
                </div>

                {selectedResumes.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">Resumes ({selectedResumes.length})</div>
                    {selectedResumes.map(asset => (
                      <div key={asset.id} className="detail-row">
                        <span className="detail-key">{new Date(asset.createdAt).toLocaleDateString()}</span>
                        <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="link-accent-sm"
                            download={asset.kind === 'file' ? filenameForDownload(asset, 'resume') : undefined}
                          >
                            {asset.name}
                          </a>
                          <button
                            className="btn btn-sm btn-ghost"
                            type="button"
                            aria-label="Delete resume version"
                            onClick={() => requestDeleteResumeVersion(selected, asset.id)}
                          >
                            &times;
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selected.notes && (
                  <div className="detail-section">
                    <div className="detail-section-title">Notes</div>
                    <p className="detail-notes">{selected.notes}</p>
                  </div>
                )}

                <div className="detail-section">
                  <div className="detail-section-title">Stage</div>
                  <div className="detail-btn-group">
                    {STAGES.map(s => (
                      <button
                        key={s}
                        className={'btn btn-sm ' + (s === selected.stage ? 'btn-primary' : 'btn-secondary')}
                        onClick={() => moveStage(selected.id, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">Status</div>
                  <div className="detail-btn-group">
                    {getList(db.lists, 'candStatus').map(s => (
                      <button
                        key={s}
                        className={'btn btn-sm ' + (s === selected.candStatus ? 'btn-primary' : 'btn-secondary')}
                        onClick={() => setCandStatus(selected.id, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {selected.rejectionReason && <div className="detail-row hr-sub"><span className="detail-key">Reason</span><span className="detail-val detail-rej-reason">{selected.rejectionReason}</span></div>}
                </div>

                {(selected.stage === 'offer' || selected.stage === 'hired') && (selected.offerAmount || selected.offerDate || selected.offerStatus) && (
                  <div className="detail-section">
                    <div className="detail-section-title">Offer</div>
                    {selected.offerAmount && <div className="detail-row"><span className="detail-key">Amount</span><span className="detail-val">${parseInt(selected.offerAmount, 10).toLocaleString()}</span></div>}
                    {selected.offerDate && <div className="detail-row"><span className="detail-key">Date</span><span className="detail-val">{selected.offerDate}</span></div>}
                    {selected.offerStatus && <div className="detail-row"><span className="detail-key">Status</span><span className="detail-val">{selected.offerStatus}</span></div>}
                  </div>
                )}

                <div className="detail-section">
                  <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Interviews ({candIvs.length})</span>
                    <button className="btn btn-sm btn-secondary" onClick={() => setLogIvFor(selected)}>+ Log Interview</button>
                  </div>
                  {candIvs.length === 0 ? (
                    <div className="iv-empty">No interviews logged yet</div>
                  ) : candIvs.sort((a, b) => a.date.localeCompare(b.date)).map(iv => {
                    const isFuture = new Date(iv.date) >= new Date()
                    return (
                      <div key={iv.id} className="interview-card" style={{ position: 'relative' }}>
                        {isFuture
                          ? <div className="iv-date-upcoming">{iv.date} <span className="iv-date-upcoming-label">Upcoming</span></div>
                          : <div className="iv-date-past">{iv.date}</div>
                        }
                        <div className="iv-interviewer">{iv.interviewers || '—'}</div>
                        {iv.score && <div className="iv-score">Score: {iv.score}</div>}
                        {iv.notes && <p className="iv-notes">{iv.notes}</p>}
                        <div className="iv-actions" style={{ position: 'absolute', top: 'var(--spacing-xs)', right: 'var(--spacing-xs)', display: 'flex', gap: 'var(--spacing-2xs)' }}>
                          <button className="btn btn-sm btn-ghost" type="button" onClick={() => setEditIvId(iv.id)}>Edit</button>
                          <button className="btn btn-sm btn-ghost" type="button" aria-label="Delete interview" onClick={() => setConfirmDelIvId(iv.id)}>&times;</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="detail-section" style={{ paddingTop: 'var(--spacing-sm)' }}>
                  <button
                    className="btn btn-sm btn-secondary btn--danger-text"
                    onClick={() => requestDeleteCand(selected.id)}
                  >
                    Delete Candidate
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
