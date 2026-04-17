'use client'
import { useState, useCallback, Component } from 'react'
import { useAccountsData } from '@/hooks/useAccountsData'
import Sidebar from './Sidebar'
import Topbar from '@/components/layout/Topbar'
import Filterbar from './Filterbar'
import PortfolioView from './PortfolioView'
import AccountView from './AccountView'
import ExportPanel from './ExportPanel'
import ChatbotPanel from './ChatbotPanel'
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
  const { data, setData, loading, error, syncState, saveAccount, addAccount } = useAccountsData()
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [currentEngagementId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

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
    const name = window.prompt('Account name')?.trim()
    if (!name) return
    const rec = await addAccount(name)
    setCurrentAccountId(rec.account_id)
  }, [addAccount])

  const handleUpdateAccount = useCallback(async (account: Account) => {
    await saveAccount(account)
  }, [saveAccount])

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
    <div className="app-layout">
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
          onReset={() => setFilterSearch('')}
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
                onArchive={() => {
                  const acct = currentAccount
                  if (!acct) return
                  const isArchived = acct.status === 'Archived'
                  saveAccount({ ...acct, status: isArchived ? 'Active' : 'Archived' })
                }}
                onDelete={async () => {
                  if (!currentAccount) return
                  const confirmed = window.confirm(`Delete "${currentAccount.account_name}"? This cannot be undone.`)
                  if (!confirmed) return
                  // TODO: delete account + related records
                  setCurrentAccountId(null)
                }}
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
  )
}
