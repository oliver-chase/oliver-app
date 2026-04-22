'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SdrOverview from '@/components/sdr/SdrOverview'
import SdrProspects from '@/components/sdr/SdrProspects'
import SdrDrafts from '@/components/sdr/SdrDrafts'
import SdrOutreach from '@/components/sdr/SdrOutreach'
import SdrProspectDetail from '@/components/sdr/SdrProspectDetail'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import { SDR_COMMANDS } from '@/app/sdr/commands'
import { buildSdrFlows } from '@/app/sdr/flows'
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

  const prospectsRef = useRef(prospects);         prospectsRef.current = prospects
  const approvalItemsRef = useRef(approvalItems); approvalItemsRef.current = approvalItems
  const sendsRef = useRef(sends);                 sendsRef.current = sends
  const tabRef = useRef(tab);                     tabRef.current = tab

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = SDR_COMMANDS.map(c => {
      let run: () => void
      switch (c.id) {
        case 'log-call':      run = () => navTo('prospects'); break
        case 'add-opp':       run = () => navTo('prospects'); break
        case 'view-pipeline': run = () => navTo('prospects'); break
        case 'change-pw':     run = () => { window.open('https://mysignins.microsoft.com/security-info', '_blank', 'noopener,noreferrer') }; break
        default:              run = () => {}
      }
      return { ...c, run }
    })
    const flows = buildSdrFlows({
      prospects: prospectsRef.current,
      approvalItems: approvalItemsRef.current,
      refetch: loadData,
    })
    return {
      pageLabel: 'SDR & Outreach',
      placeholder: 'What do you want to do?',
      greeting: "Hi, I'm Oliver. You're viewing SDR. You can log a call, add an opportunity, view your pipeline, or ask me anything. What would you like to do?",
      actions,
      flows,
      contextPayload: () => ({
        currentTab: tabRef.current,
        summary: {
          prospects: prospectsRef.current.length,
          drafts_pending: approvalItemsRef.current.filter(a => a.status === 'pending').length,
          sends_total: sendsRef.current.length,
        },
      }),
      onChatRefresh: () => { loadData() },
    }
  }, [loadData])

  useRegisterOliver(oliverConfig)

  function patchFilters(f: Partial<SdrFilters>) {
    setFilters(prev => ({ ...prev, ...f }))
  }

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
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

        <main id="main-content">
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
        approvalItems={approvalItems}
        onClose={() => setSelectedProspect(null)}
        onRefresh={loadData}
      />
    </div>
  )
}
