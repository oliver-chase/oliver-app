'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import HrDashboard from '@/components/hr/HrDashboard'
import HrHiring from '@/components/hr/HrHiring'
import HrDirectory from '@/components/hr/HrDirectory'
import HrOnboarding from '@/components/hr/HrOnboarding'
import HrInventory from '@/components/hr/HrInventory'
import HrAssignments from '@/components/hr/HrAssignments'
import HrTracks from '@/components/hr/HrTracks'
import HrReports from '@/components/hr/HrReports'
import HrSettings from '@/components/hr/HrSettings'
import GlobalSearchButton from '@/components/hr/GlobalSearchButton'
import GlobalSearch from '@/components/hr/GlobalSearch'
import CommandPalette from '@/components/hr/CommandPalette'
import StepFlowRunner from '@/components/hr/StepFlowRunner'
import HrAgentPanel from '@/components/hr/HrAgentPanel'
import { useAppModal } from '@/components/shared/AppModal'
import type { Flow, EditTarget } from '@/components/hr/step-flow-types'
import type { HrDB, HrPage, Candidate, Employee, Device } from '@/components/hr/types'

const PAGE_FOR_TARGET: Record<EditTarget, HrPage> = { candidate: 'hiring', employee: 'directory', device: 'inventory' }

const NAV: { id: HrPage; label: string; section: string; icon: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',   section: '',        icon: 'M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z' },
  { id: 'hiring',      label: 'Hiring',       section: 'People',  icon: 'M8 2a3 3 0 110 6 3 3 0 010-6zM2 13c0-3.3 2.7-6 6-6s6 2.7 6 6' },
  { id: 'directory',   label: 'Directory',    section: 'People',  icon: 'M14 13v-1.5a3 3 0 00-3-3H5a3 3 0 00-3 3V13M8 2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z' },
  { id: 'onboarding',  label: 'Onboarding',   section: 'People',  icon: 'M13 8H3M13 4H3M9 12H3' },
  { id: 'offboarding', label: 'Offboarding',  section: 'People',  icon: 'M10 3l3 3-3 3M3 6h10M6 13H3V3h3' },
  { id: 'inventory',   label: 'Inventory',    section: 'Devices', icon: 'M1 3h14v9H1zM5 12v2M11 12v2M3 14h10' },
  { id: 'assignments', label: 'Assignments',  section: 'Devices', icon: 'M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V9M10 2l4 4-6 6H4v-4l6-6z' },
  { id: 'tracks',      label: 'Tracks',       section: 'Admin',   icon: 'M2 4h12M2 8h8M2 12h5' },
  { id: 'reports',     label: 'Reports',      section: 'Admin',   icon: 'M2 9h3v5H2zM6.5 5h3v9h-3zM11 1h3v13h-3z' },
  { id: 'settings',    label: 'Settings',     section: 'Admin',   icon: 'M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13' },
]

const SECTIONS = [...new Set(NAV.map(n => n.section))]

const EMPTY_DB: HrDB = {
  candidates: [], employees: [], devices: [], assignments: [],
  tracks: [], tasks: [], onboardingRuns: [], runTasks: [],
  interviews: [], activities: [], lists: [],
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) { console.error('[HR]', table, error.message); return [] }
  return (data ?? []) as T[]
}

export default function HrPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage]               = useState<HrPage>('dashboard')
  const [db, setDb]                   = useState<HrDB>(EMPTY_DB)
  const [loading, setLoading]         = useState(true)
  const [syncState, setSyncState]     = useState<'ok' | 'syncing' | 'error'>('syncing')
  const [searchOpen, setSearchOpen]   = useState(false)
  const [cpOpen, setCpOpen]           = useState(false)
  const [activeFlow, setActiveFlow]   = useState<Flow<unknown> | null>(null)
  const [pendingEdit, setPendingEdit] = useState<{ target: EditTarget; id: string } | null>(null)
  const { modal, showModal }          = useAppModal()

  const requestEdit = useCallback((target: EditTarget, id: string) => {
    setPage(PAGE_FOR_TARGET[target])
    setPendingEdit({ target, id })
  }, [])

  const clearPendingEdit = useCallback(() => setPendingEdit(null), [])

  async function quickAddCandidate() {
    const { buttonValue, inputValue } = await showModal({ title: 'Add Candidate', inputLabel: 'Full name', inputPlaceholder: 'e.g. Jane Doe', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const now = new Date().toISOString()
    const rec: Candidate = {
      id: 'CAND-' + crypto.randomUUID(),
      name: inputValue.trim(),
      role: '', seniority: '', dept: '', source: '', stage: 'sourced', candStatus: 'Active',
      empType: '', compType: '', compAmount: '', city: '', state: '', country: '', client: '',
      email: '', resumeLink: '', skills: '', addedAt: now, updatedAt: now, notes: '',
      rejectionReason: '', offerAmount: '', offerDate: '', offerStatus: '',
    }
    setSyncState('syncing')
    setDb(prev => ({ ...prev, candidates: [rec, ...prev.candidates] }))
    try { await supabase.from('candidates').insert(rec); setSyncState('ok') } catch { setSyncState('error') }
    setPage('hiring')
  }

  async function quickAddEmployee() {
    const { buttonValue, inputValue } = await showModal({ title: 'Add Employee', inputLabel: 'Full name', inputPlaceholder: 'e.g. Jane Doe', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const now = new Date().toISOString()
    const rec: Employee = {
      id: 'EMP-' + crypto.randomUUID(), name: inputValue.trim(), role: '', dept: '', status: 'active',
      client: '', location: '', city: '', state: '', country: '', manager: '', buddy: '',
      startDate: '', endDate: '', email: '', source: '', created_at: now, updated_at: now,
    }
    setSyncState('syncing')
    setDb(prev => ({ ...prev, employees: [rec, ...prev.employees] }))
    try { await supabase.from('employees').insert(rec); setSyncState('ok') } catch { setSyncState('error') }
    setPage('directory')
  }

  async function quickAddDevice() {
    const { buttonValue, inputValue } = await showModal({ title: 'Add Device', inputLabel: 'Device name', inputPlaceholder: 'e.g. MacBook Pro 14"', confirmLabel: 'Add' })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const now = new Date().toISOString()
    const rec: Device = {
      id: 'DEV-' + crypto.randomUUID(), name: inputValue.trim(), make: '', type: '', model: '',
      modelNumber: '', serial: '', status: 'available', assignedTo: '', condition: 'good',
      purchaseDate: '', purchaseStore: '', orderNumber: '', specs: '', location: '', notes: '',
      created_at: now, updated_at: now,
    }
    setSyncState('syncing')
    setDb(prev => ({ ...prev, devices: [rec, ...prev.devices] }))
    try { await supabase.from('devices').insert(rec); setSyncState('ok') } catch { setSyncState('error') }
    setPage('inventory')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase()
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCpOpen(o => !o)
        return
      }
      if (e.key === '/' && !editing && !cpOpen) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cpOpen])

  const loadData = useCallback(async () => {
    setSyncState('syncing')
    try {
      const [candidates, employees, devices, assignments, tracks, tasks, onboardingRuns, runTasks, interviews, activities, lists] = await Promise.all([
        fetchTable('candidates'),
        fetchTable('employees'),
        fetchTable('devices'),
        fetchTable('assignments'),
        fetchTable('tracks'),
        fetchTable('tasks'),
        fetchTable('onboardingRuns'),
        fetchTable('runTasks'),
        fetchTable('interviews'),
        fetchTable('activities'),
        fetchTable('lists'),
      ])
      setDb({ candidates, employees, devices, assignments, tracks, tasks, onboardingRuns, runTasks, interviews, activities, lists } as HrDB)
      setSyncState('ok')
    } catch {
      setSyncState('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function navTo(p: string) {
    setPage(p as HrPage)
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <div className="app show-hamburger">
        <div className="main">
          <main className="page page--loading" id="main-content">Loading...</main>
        </div>
      </div>
    )
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':   return <HrDashboard db={db} setDb={setDb} onNav={navTo} setSyncState={setSyncState} />
      case 'hiring':      return <HrHiring db={db} setDb={setDb} setSyncState={setSyncState} pendingEditId={pendingEdit?.target === 'candidate' ? pendingEdit.id : null} onEditConsumed={clearPendingEdit} />
      case 'directory':   return <HrDirectory db={db} setDb={setDb} setSyncState={setSyncState} pendingEditId={pendingEdit?.target === 'employee' ? pendingEdit.id : null} onEditConsumed={clearPendingEdit} />
      case 'onboarding':  return <HrOnboarding type="onboarding" db={db} setDb={setDb} setSyncState={setSyncState} onNav={navTo} />
      case 'offboarding': return <HrOnboarding type="offboarding" db={db} setDb={setDb} setSyncState={setSyncState} onNav={navTo} />
      case 'inventory':   return <HrInventory db={db} setDb={setDb} setSyncState={setSyncState} pendingEditId={pendingEdit?.target === 'device' ? pendingEdit.id : null} onEditConsumed={clearPendingEdit} />
      case 'assignments': return <HrAssignments db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'tracks':      return <HrTracks db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'reports':     return <HrReports db={db} />
      case 'settings':    return <HrSettings db={db} setDb={setDb} setSyncState={setSyncState} />
      default:            return null
    }
  }

  return (
    <div className="app show-hamburger">
      {modal}
      {activeFlow && (
        <StepFlowRunner
          flow={activeFlow}
          ctx={{ db, setDb, setSyncState, requestEdit, refresh: loadData }}
          onClose={() => setActiveFlow(null)}
        />
      )}
      {cpOpen && (
        <CommandPalette
          ctx={{
            setPage: p => setPage(p),
            openSearch: () => setSearchOpen(true),
            addCandidate: quickAddCandidate,
            addEmployee: quickAddEmployee,
            addDevice: quickAddDevice,
            runFlow: <D,>(f: Flow<D>) => setActiveFlow(f as Flow<unknown>),
          }}
          onClose={() => setCpOpen(false)}
        />
      )}
      <button
        id="cp-fab"
        type="button"
        aria-label="Open command palette"
        title={'Commands (\u2318K)'}
        onClick={() => setCpOpen(true)}
      >
        +
      </button>
      {searchOpen && (
        <GlobalSearch
          db={db}
          onClose={() => setSearchOpen(false)}
          onNavigate={p => navTo(p)}
        />
      )}
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="HR navigation">
        <div className="app-sidebar-logo">HR &amp; People Ops</div>
        <Link href="/" className="sidebar-back">&larr; Back to Hub</Link>
        {SECTIONS.map(section => (
          <div key={section || 'main'} className="app-sidebar-section">
            {section && <div className="app-sidebar-section-label">{section}</div>}
            {NAV.filter(n => n.section === section).map(n => (
              <div
                key={n.id}
                className={'app-sidebar-item' + (page === n.id ? ' active' : '')}
                role="button"
                tabIndex={0}
                onClick={() => navTo(n.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo(n.id) } }}
              >
                <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d={n.icon} />
                </svg>
                {n.label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="main">
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            &#9776;
          </button>
          <div className="gs-wrap" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <GlobalSearchButton onClick={() => setSearchOpen(true)} />
          </div>
          <div className="sync-status" aria-live="polite">
            <div className={'sync-dot' + (syncState === 'syncing' ? ' syncing' : syncState === 'error' ? ' error' : '')} />
            <span id="sync-text">{syncState === 'syncing' ? 'Syncing...' : syncState === 'error' ? 'Error' : 'Synced'}</span>
          </div>
        </header>

        <main id="main-content">
          {renderPage()}
        </main>

        <HrAgentPanel db={db} currentPage={page} />

        <nav className="bottom-nav" id="bottom-nav" aria-label="Bottom navigation">
          {([
            { id: 'dashboard',   label: 'Home' },
            { id: 'hiring',      label: 'Hiring' },
            { id: 'directory',   label: 'Directory' },
            { id: 'onboarding',  label: 'Onboarding' },
            { id: 'offboarding', label: 'Offboarding' },
          ] as const).map(n => (
            <div
              key={n.id}
              className={'bottom-nav-item' + (page === n.id ? ' active' : '')}
              data-page={n.id}
              onClick={() => navTo(n.id)}
            >
              {n.label}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
