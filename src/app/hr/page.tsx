'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import HrDashboard from '@/components/hr/HrDashboard'
import HrHiring from '@/components/hr/HrHiring'
import HrDirectory from '@/components/hr/HrDirectory'
import type { HrDB, HrPage } from '@/components/hr/types'

const NAV: { id: HrPage; label: string; section: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    section: '' },
  { id: 'hiring',       label: 'Hiring',        section: 'People' },
  { id: 'directory',    label: 'Directory',     section: 'People' },
  { id: 'onboarding',   label: 'Onboarding',    section: 'People' },
  { id: 'offboarding',  label: 'Offboarding',   section: 'People' },
  { id: 'inventory',    label: 'Inventory',     section: 'Devices' },
  { id: 'assignments',  label: 'Assignments',   section: 'Devices' },
  { id: 'tracks',       label: 'Tracks',        section: 'Admin' },
  { id: 'reports',      label: 'Reports',       section: 'Admin' },
  { id: 'settings',     label: 'Settings',      section: 'Admin' },
]

const SECTIONS = [...new Set(NAV.map(n => n.section))]

const EMPTY_DB: HrDB = {
  candidates: [], employees: [], devices: [], assignments: [],
  tracks: [], onboardingRuns: [], runTasks: [],
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) { console.error('[HR]', table, error.message); return [] }
  return (data ?? []) as T[]
}

function StubPage({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="page-header"><div className="page-title">{title}</div></div>
      <div className="coming-soon" style={{ minHeight: '40vh' }}>
        <div className="coming-soon-badge">In Progress</div>
        <div className="coming-soon-title">{title}</div>
        <div className="coming-soon-sub">Full port coming soon.</div>
      </div>
    </div>
  )
}

export default function HrPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage]               = useState<HrPage>('dashboard')
  const [db, setDb]                   = useState<HrDB>(EMPTY_DB)
  const [loading, setLoading]         = useState(true)
  const [syncState, setSyncState]     = useState<'ok' | 'syncing' | 'error'>('syncing')

  const loadData = useCallback(async () => {
    setSyncState('syncing')
    try {
      const [candidates, employees, devices, assignments, tracks, onboardingRuns, runTasks] = await Promise.all([
        fetchTable('candidates'),
        fetchTable('employees'),
        fetchTable('devices'),
        fetchTable('assignments'),
        fetchTable('tracks'),
        fetchTable('onboardingRuns'),
        fetchTable('runTasks'),
      ])
      setDb({ candidates, employees, devices, assignments, tracks, onboardingRuns, runTasks } as HrDB)
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

  function closeSidebar() { setSidebarOpen(false) }

  function renderPage() {
    if (loading) return <div className="page"><div className="dash-empty">Loading...</div></div>
    switch (page) {
      case 'dashboard':   return <HrDashboard db={db} onNav={navTo} />
      case 'hiring':      return <HrHiring candidates={db.candidates} />
      case 'directory':   return <HrDirectory employees={db.employees} />
      case 'onboarding':  return <StubPage title="Onboarding" />
      case 'offboarding': return <StubPage title="Offboarding" />
      case 'inventory':   return <StubPage title="Device Inventory" />
      case 'assignments': return <StubPage title="Assignments" />
      case 'tracks':      return <StubPage title="Tracks" />
      case 'reports':     return <StubPage title="Reports" />
      case 'settings':    return <StubPage title="Settings" />
      default:            return null
    }
  }

  return (
    <div className="app show-hamburger">
      <div
        className="sidebar-backdrop"
        style={{ display: sidebarOpen ? 'block' : 'none', pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        onClick={closeSidebar}
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
          <div className="gs-wrap" style={{ flex: 1 }} />
          <div className="sync-status" aria-live="polite">
            <div className={'sync-dot' + (syncState === 'syncing' ? ' syncing' : syncState === 'error' ? ' error' : '')} />
            <span id="sync-text">{syncState === 'syncing' ? 'Loading...' : syncState === 'error' ? 'Error' : 'Synced'}</span>
          </div>
        </header>

        <main id="main-content">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
