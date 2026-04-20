'use client'
import { useState, useCallback, useMemo, useRef, Component } from 'react'
import { useRouter } from 'next/navigation'
import { useAccountsData } from '@/hooks/useAccountsData'
import { deleteAccountCascade } from '@/lib/db'
import { useAppModal } from '@/components/shared/AppModal'
import Sidebar from './Sidebar'
import Topbar from '@/components/layout/Topbar'
import Filterbar from './Filterbar'
import PortfolioView from './PortfolioView'
import AccountView from './AccountView'
import ExportPanel from './ExportPanel'
import { SyncContext } from '@/lib/sync-context'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import type { Account } from '@/types'

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return <pre style={{ color: 'red', padding: 16, whiteSpace: 'pre-wrap' }}>AccountView crash: {this.state.error}</pre>
    }
    return this.props.children
  }
}

function buildSummaryText(result: unknown, docType: 'image' | 'document'): string {
  const r = result as Record<string, unknown>
  if (docType === 'image') {
    const people = (r.people as Array<Record<string, string>>) || []
    return people.map(p => {
      const parts: string[] = [p.name]
      if (p.title) parts.push(p.title)
      if (p.department) parts.push(p.department)
      if (p.reports_to) parts.push('reports to ' + p.reports_to)
      return parts.join(' | ')
    }).join('\n') || 'No people found.'
  }
  const meta = (r.metadata as Record<string, unknown>) || {}
  const lines: string[] = []
  if (meta.title) lines.push('Meeting: ' + meta.title)
  if (meta.date) lines.push('Date: ' + meta.date)
  const attendees = meta.attendees as string[] | undefined
  if (attendees?.length) lines.push('Attendees: ' + attendees.join(', '))
  const actions = r.actions as Array<Record<string, string>> | undefined
  if (actions?.length) {
    lines.push(''); lines.push('Actions (' + actions.length + '):')
    actions.forEach(a => lines.push('  - ' + a.task + (a.owner ? ' (' + a.owner + ')' : '')))
  }
  const decisions = r.decisions as Array<Record<string, string>> | undefined
  if (decisions?.length) {
    lines.push(''); lines.push('Decisions (' + decisions.length + '):')
    decisions.forEach(d => lines.push('  - ' + d.decision))
  }
  return lines.join('\n') || JSON.stringify(result, null, 2).slice(0, 500)
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AccountsApp() {
  const { data, setData, loading, error, syncState, reportSync, saveAccount, addAccount, refetch } = useAccountsData()
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [currentEngagementId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActionStatus, setFilterActionStatus] = useState('open-progress')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterExec, setFilterExec] = useState(false)
  const [filterIncomplete, setFilterIncomplete] = useState(false)
  const [filterVTwoOwner, setFilterVTwoOwner] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const { modal, showModal } = useAppModal()

  const handleSelectAccount = useCallback((id: string) => {
    setCurrentAccountId(id)
    setSidebarOpen(false)
  }, [])

  const handleSelectAll = useCallback(() => {
    setCurrentAccountId(null)
    setSidebarOpen(false)
  }, [])

  const handleAddAccount = useCallback(async () => {
    const { buttonValue, inputValue, secondInputValue } = await showModal({
      title: 'New account',
      inputLabel: 'Short name',
      inputPlaceholder: 'e.g. NCL',
      secondInputLabel: 'Full client name',
      secondInputPlaceholder: 'e.g. Norwegian Cruise Line',
      confirmLabel: 'Create',
    })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const rec = await addAccount(inputValue.trim(), secondInputValue.trim())
    setCurrentAccountId(rec.account_id)
  }, [addAccount, showModal])

  const handleUpdateAccount = useCallback(async (account: Account) => {
    await saveAccount(account)
  }, [saveAccount])

  const handleArchive = useCallback(async () => {
    const acct = data.accounts.find(a => a.account_id === currentAccountId)
    if (!acct) return
    const isArchived = acct.status === 'Archived'
    const { buttonValue } = await showModal({
      title: isArchived ? 'Unarchive account' : 'Archive account',
      message: isArchived
        ? '"' + acct.account_name + '" will be restored to active status.'
        : '"' + acct.account_name + '" will remain in the portfolio but sorted to the bottom and visually dimmed.',
      confirmLabel: isArchived ? 'Unarchive' : 'Archive',
    })
    if (buttonValue !== 'confirm') return
    await saveAccount({ ...acct, status: isArchived ? 'Active' : 'Archived' })
  }, [currentAccountId, data.accounts, saveAccount, showModal])

  const handleDelete = useCallback(async () => {
    const acct = data.accounts.find(a => a.account_id === currentAccountId)
    if (!acct) return
    const { buttonValue } = await showModal({
      title: 'Delete account',
      message: 'Consider archiving instead — archived accounts remain visible and can be restored. Permanently delete "' + acct.account_name + '" and all its data? This cannot be undone.',
      confirmLabel: 'Delete',
      dangerConfirm: true,
    })
    if (buttonValue !== 'confirm') return
    const id = currentAccountId!
    try {
      await deleteAccountCascade(id)
      setData(prev => ({
        ...prev,
        stakeholders: prev.stakeholders.filter(x => x.account_id !== id),
        actions: prev.actions.filter(x => x.account_id !== id),
        notes: prev.notes.filter(x => x.account_id !== id),
        opportunities: prev.opportunities.filter(x => x.account_id !== id),
        projects: prev.projects.filter(x => x.account_id !== id),
        background: prev.background.filter(x => x.account_id !== id),
        engagements: prev.engagements.filter(x => x.account_id !== id),
        accounts: prev.accounts.filter(a => a.account_id !== id),
      }))
      setCurrentAccountId(null)
    } catch (e) {
      console.error('[deleteAccount] failed:', e)
    }
  }, [currentAccountId, data.accounts, setData, showModal])

  const handleFilterReset = useCallback(async () => {
    const { buttonValue } = await showModal({
      title: 'Reset filters',
      message: 'Clear all active filters and return to default view?',
      confirmLabel: 'Reset',
    })
    if (buttonValue !== 'confirm') return
    setFilterSearch('')
    setFilterActionStatus('open-progress')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterExec(false)
    setFilterIncomplete(false)
    setFilterVTwoOwner('')
  }, [showModal])

  const currentAccount = data.accounts.find(a => a.account_id === currentAccountId)
  const engagement = currentEngagementId
    ? data.engagements.find(e => e.engagement_id === currentEngagementId)
    : null

  const router = useRouter()
  const dataRef = useRef(data); dataRef.current = data
  const accountIdRef = useRef(currentAccountId); accountIdRef.current = currentAccountId

  const oliverConfig = useMemo<OliverConfig>(() => {
    const scoped: OliverAction[] = currentAccountId ? [
      { id: 'export',  label: 'Export account plan\u2026',   group: 'Create',   hint: 'Open export panel',            run: () => setExportOpen(true) },
      { id: 'archive', label: currentAccount?.status === 'Archived' ? 'Unarchive account' : 'Archive account', group: 'Create', hint: 'Toggle archive status', run: () => handleArchive() },
      { id: 'delete',  label: 'Delete account\u2026',         group: 'Create',   hint: 'Permanent \u2014 archive first', run: () => handleDelete() },
      { id: 'all',     label: 'Back to portfolio',            group: 'Navigate', hint: 'Show all accounts',            run: () => setCurrentAccountId(null) },
    ] : []
    const actions: OliverAction[] = [
      { id: 'add-account', label: 'Add account\u2026',            group: 'Create',   hint: 'Quick-add to portfolio',      run: () => handleAddAccount() },
      ...scoped,
      { id: 'nav-hr',    label: 'Go to HR & People Ops', group: 'Navigate', run: () => router.push('/hr') },
      { id: 'nav-sdr',   label: 'Go to SDR',             group: 'Navigate', run: () => router.push('/sdr') },
      { id: 'nav-hub',   label: 'Go to Hub',             group: 'Navigate', run: () => router.push('/') },
      { id: 'nav-admin', label: 'Go to Admin',           group: 'Navigate', run: () => router.push('/admin') },
    ]
    const greeting = currentAccountId
      ? "Hi, I'm Oliver! I can answer questions about your accounts, make updates, and add notes. Upload a meeting transcript or org chart screenshot and I'll update your account plan."
      : "Hi, I'm Oliver. Pick an account in the sidebar, or add a new one."
    const upload = currentAccountId ? {
      accepts: '.docx,.txt,.pdf,image/jpeg,image/png,image/gif,image/webp',
      hint: '.docx .txt .pdf or image',
      parse: async (file: File) => {
        const isImage = file.type.startsWith('image/')
        if (isImage) {
          const base64 = await readAsBase64(file)
          const res = await fetch('/api/parse-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
          })
          const d = await res.json()
          if (d.error) throw new Error(d.error)
          return { title: 'Extracted People', summary: buildSummaryText(d.result, 'image'), model: d.model, payload: d.result }
        }
        const text = await readAsText(file)
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, filename: file.name }),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        return { title: 'Extracted Meeting Data', summary: buildSummaryText(d.result, 'document'), model: d.model, payload: d.result }
      },
      dryRun: async (payload: unknown) => {
        const id = accountIdRef.current
        const res = await fetch('/api/confirm-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: id, payload, dryRun: true }),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        return { conflicts: d.conflicts, summary: d.summary }
      },
      commit: async (payload: unknown) => {
        const id = accountIdRef.current
        const res = await fetch('/api/confirm-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: id, payload, dryRun: false }),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        return { message: d.message || 'Done. Data written.' }
      },
    } : undefined
    return {
      pageLabel: 'Account Planning',
      placeholder: 'Type a message or pick a command...',
      greeting,
      actions,
      upload,
      quickConvos: currentAccountId ? [
        'Summarise recent activity on this account.',
        'Which actions are overdue?',
        'Who are the key stakeholders?',
      ] : [
        'Which accounts need attention this week?',
        'Summarise the portfolio.',
      ],
      contextPayload: () => {
        const id = accountIdRef.current
        const d = dataRef.current
        if (!id) return { view: 'portfolio', accounts: d.accounts.length }
        const acct = d.accounts.find(a => a.account_id === id)
        const bg = d.background?.find(b => b.account_id === id && !b.engagement_id)
        return {
          view: 'account',
          account: acct,
          background: bg,
          stakeholders: d.stakeholders?.filter(s => s.account_id === id) ?? [],
          actions:     d.actions?.filter(a => a.account_id === id) ?? [],
          opportunities: d.opportunities?.filter(o => o.account_id === id) ?? [],
          projects:    d.projects?.filter(p => p.account_id === id) ?? [],
        }
      },
      onChatRefresh: () => { refetch() },
    }
  }, [currentAccountId, currentAccount?.status, handleAddAccount, handleArchive, handleDelete, router, refetch])

  useRegisterOliver(oliverConfig)

  const topbarTitle = currentAccountId ? (currentAccount?.account_name || 'Account') : 'All Accounts'
  const syncStatus = syncState === 'syncing' ? 'syncing' : syncState === 'error' ? 'err' : 'ok'
  const syncText = syncState === 'syncing' ? 'Saving\u2026' : syncState === 'error' ? 'Error' : 'Synced'

  if (error) {
    return (
      <div className="app-error">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <SyncContext.Provider value={reportSync}>
    <div className="app-layout">
      {modal}
      <Sidebar
        accounts={data.accounts}
        currentAccountId={currentAccountId}
        onSelectAll={handleSelectAll}
        onSelectAccount={handleSelectAccount}
        onAddAccount={handleAddAccount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-layout-content">
        <Topbar
          accountName={topbarTitle}
          engagementName={engagement?.engagement_name}
          currentAccountId={currentAccountId}
          syncStatus={syncStatus}
          syncText={syncText}
          onExportClick={() => setExportOpen(true)}
          onHamburgerClick={() => setSidebarOpen(s => !s)}
          sidebarOpen={sidebarOpen}
          onAccountNameChange={currentAccount ? (name => handleUpdateAccount({ ...currentAccount, account_name: name })) : undefined}
        />

        <Filterbar
          show={currentAccountId !== null}
          search={filterSearch}
          onSearch={setFilterSearch}
          onReset={handleFilterReset}
        />

        <main className={'main' + (currentAccountId ? ' main-with-filterbar' : '')} id="main-content">
          {loading ? (
            <div className="section-loading">Loading…</div>
          ) : currentAccountId ? (
            <ErrorBoundary>
              <AccountView
                accountId={currentAccountId}
                data={data}
                setData={setData}
                onUpdateAccount={handleUpdateAccount}
                onArchive={handleArchive}
                onDelete={handleDelete}
                filterSearch={filterSearch}
                filterActionStatus={filterActionStatus}
                onFilterActionStatusChange={setFilterActionStatus}
                filterDateFrom={filterDateFrom}
                onFilterDateFromChange={setFilterDateFrom}
                filterDateTo={filterDateTo}
                onFilterDateToChange={setFilterDateTo}
                filterExec={filterExec}
                onFilterExecChange={setFilterExec}
                filterIncomplete={filterIncomplete}
                onFilterIncompleteChange={setFilterIncomplete}
                filterVTwoOwner={filterVTwoOwner}
                onFilterVTwoOwnerChange={setFilterVTwoOwner}
              />
            </ErrorBoundary>
          ) : (
            <PortfolioView
                accounts={data.accounts}
                background={data.background}
                stakeholders={data.stakeholders}
                actions={data.actions}
                projects={data.projects}
                onSelectAccount={handleSelectAccount}
                onUpdateAccount={handleUpdateAccount}
              />
          )}
        </main>
      </div>
      {exportOpen && currentAccountId && (
        <ExportPanel
          accountId={currentAccountId}
          data={data}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
    </SyncContext.Provider>
  )
}
