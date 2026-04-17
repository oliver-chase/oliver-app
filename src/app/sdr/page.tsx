'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SdrOverview from '@/components/sdr/SdrOverview'
import SdrProspects from '@/components/sdr/SdrProspects'
import SdrDrafts from '@/components/sdr/SdrDrafts'
import SdrOutreach from '@/components/sdr/SdrOutreach'
import SdrProspectDetail from '@/components/sdr/SdrProspectDetail'
import type { SdrProspect, SdrApprovalItem, SdrSend, SdrTab, SdrFilters } from '@/components/sdr/types'

const TABS: { id: SdrTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'prospects', label: 'Prospects' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'outreach', label: 'Outreach' },
]

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  return (data ?? []) as T[]
}

export default function SdrPage() {
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [tab, setTab]                         = useState<SdrTab>('overview')
  const [prospects, setProspects]             = useState<SdrProspect[]>([])
  const [approvalItems, setApprovalItems]     = useState<SdrApprovalItem[]>([])
  const [sends, setSends]                     = useState<SdrSend[]>([])
  const [loading, setLoading]                 = useState(true)
  const [syncState, setSyncState]             = useState<'ok' | 'syncing' | 'error'>('syncing')
  const [selectedProspect, setSelectedProspect] = useState<SdrProspect | null>(null)
  const [filters, setFilters]                 = useState<SdrFilters>({ status: 'all', search: '', track: '', page: 0 })

  const loadData = useCallback(async () => {
    setSyncState('syncing')
    try {
      const [p, a, s] = await Promise.all([
        fetchTable<SdrProspect>('sdr_prospects'),
        fetchTable<SdrApprovalItem>('sdr_approval_items'),
        fetchTable<SdrSend>('sdr_sends'),
      ])
      setProspects(p)
      setApprovalItems(a)
      setSends(s)
      setSyncState('ok')
    } catch {
      setSyncState('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function closeSidebar() { setSidebarOpen(false) }

  function navTo(t: SdrTab) {
    setTab(t)
    closeSidebar()
  }

  function patchFilters(f: Partial<SdrFilters>) {
    setFilters(prev => ({ ...prev, ...f }))
  }

  return (
    <div className="app show-hamburger">
      <div
        className="sidebar-backdrop"
        style={{ display: sidebarOpen ? 'block' : 'none', pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        onClick={closeSidebar}
      />
      <nav className="app-sidebar" id="sidebar" aria-label="SDR navigation">
        <div className="app-sidebar-logo">SDR &amp; Outreach</div>
        <Link href="/" className="sidebar-back">← Back to Hub</Link>
        <div className="app-sidebar-section">
          {TABS.map(t => (
            <div
              key={t.id}
              className={'app-sidebar-item' + (tab === t.id ? ' active' : '')}
              role="button"
              tabIndex={0}
              onClick={() => navTo(t.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo(t.id) } }}
            >
              {t.label}
            </div>
          ))}
        </div>
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
          <span className="topbar-name">SDR &amp; Outreach</span>
          <div className="sync-indicator">
            <div className={'sync-dot' + (syncState === 'syncing' ? ' syncing' : syncState === 'error' ? ' error' : '')} />
            <span>{syncState === 'syncing' ? 'Loading...' : syncState === 'error' ? 'Error' : 'Synced'}</span>
            <button
              className="sdr-refresh-btn"
              title="Refresh data"
              aria-label="Refresh data"
              onClick={async () => { await loadData() }}
            >
              &#8635;
            </button>
          </div>
        </header>

        <main className="page" id="main-content">
          {loading ? (
            <div className="sdr-empty">Loading...</div>
          ) : (
            <>
              {tab === 'overview' && (
                <SdrOverview
                  prospects={prospects}
                  approvalItems={approvalItems}
                  sends={sends}
                  onGoToDrafts={() => navTo('drafts')}
                />
              )}
              {tab === 'prospects' && (
                <SdrProspects
                  prospects={prospects}
                  filters={filters}
                  onFiltersChange={patchFilters}
                  onSelectProspect={setSelectedProspect}
                />
              )}
              {tab === 'drafts' && (
                <SdrDrafts
                  approvalItems={approvalItems}
                  onItemsChange={setApprovalItems}
                />
              )}
              {tab === 'outreach' && <SdrOutreach sends={sends} />}
            </>
          )}
        </main>
      </div>

      <SdrProspectDetail
        prospect={selectedProspect}
        sends={sends}
        onClose={() => setSelectedProspect(null)}
      />
    </div>
  )
}
