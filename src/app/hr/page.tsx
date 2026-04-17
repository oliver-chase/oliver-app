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
import type { HrDB, HrPage } from '@/components/hr/types'

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
      case 'hiring':      return <HrHiring db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'directory':   return <HrDirectory db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'onboarding':  return <HrOnboarding type="onboarding" db={db} setDb={setDb} setSyncState={setSyncState} onNav={navTo} />
      case 'offboarding': return <HrOnboarding type="offboarding" db={db} setDb={setDb} setSyncState={setSyncState} onNav={navTo} />
      case 'inventory':   return <HrInventory db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'assignments': return <HrAssignments db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'tracks':      return <HrTracks db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'reports':     return <HrReports db={db} setDb={setDb} setSyncState={setSyncState} />
      case 'settings':    return <HrSettings db={db} setDb={setDb} setSyncState={setSyncState} />
      default:            return null
    }
  }

  return (
    <div className="app show-hamburger">
      <div
        className="sidebar-backdrop"
        style={{ display: sidebarOpen ? 'block' : 'none', pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        onClick={() => setSidebarOpen(false)}
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
          <div className="gs-wrap" style={{ flex: 1 }} />
          <div className="sync-status" aria-live="polite">
            <div className={'sync-dot' + (syncState === 'syncing' ? ' syncing' : syncState === 'error' ? ' error' : '')} />
            <span id="sync-text">{syncState === 'syncing' ? 'Syncing...' : syncState === 'error' ? 'Error' : 'Synced'}</span>
          </div>
        </header>

        <main id="main-content">
          {renderPage()}
        </main>

        <nav className="bottom-nav" id="bottom-nav" aria-label="Bottom navigation">
          {['dashboard', 'hiring', 'directory', 'onboarding', 'offboarding'].map(p => (
            <div
              key={p}
              className={'bottom-nav-item' + (page === p ? ' active' : '')}
              data-page={p}
              onClick={() => navTo(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
