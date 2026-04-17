'use client'
import { useState, useCallback, Component } from 'react'
import { useAccountsData } from '@/hooks/useAccountsData'
import { deleteAccountCascade } from '@/lib/db'
import { useAppModal } from '@/components/shared/AppModal'
import Sidebar from './Sidebar'
import Topbar from '@/components/layout/Topbar'
import Filterbar from './Filterbar'
import PortfolioView from './PortfolioView'
import AccountView from './AccountView'
import ExportPanel from './ExportPanel'
import ChatbotPanel from './ChatbotPanel'
import { SyncContext } from '@/lib/sync-context'
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

export default function AccountsApp() {
  const { data, setData, loading, error, syncState, reportSync, saveAccount, addAccount } = useAccountsData()
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [currentEngagementId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
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

  const handleRenameAccount = useCallback(async (id: string, name: string) => {
    const acct = data.accounts.find(a => a.account_id === id)
    if (!acct || name === acct.account_name) return
    await saveAccount({ ...acct, account_name: name })
  }, [data.accounts, saveAccount])

  const handleAddAccount = useCallback(async () => {
    const { buttonValue, inputValue } = await showModal({
      title: 'New account',
      inputPlaceholder: 'Account name',
      confirmLabel: 'Create',
    })
    if (buttonValue !== 'confirm' || !inputValue.trim()) return
    const rec = await addAccount(inputValue.trim())
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
  }, [showModal])

  const currentAccount = data.accounts.find(a => a.account_id === currentAccountId)
  const engagement = currentEngagementId
    ? data.engagements.find(e => e.engagement_id === currentEngagementId)
    : null

  const topbarTitle = currentAccountId ? (currentAccount?.account_name || 'Account') : 'Account Strategy'
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
        onRenameAccount={handleRenameAccount}
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
        />

        <Filterbar
          show={currentAccountId !== null}
          search={filterSearch}
          onSearch={setFilterSearch}
          onReset={handleFilterReset}
        />

        <main className="main" id="main-content">
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
      {currentAccountId && (
        <ChatbotPanel accountId={currentAccountId} data={data} />
      )}
    </div>
    </SyncContext.Provider>
  )
}
