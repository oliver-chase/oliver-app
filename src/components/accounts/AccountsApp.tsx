'use client'
import { useState, useCallback } from 'react'
import { useAccountsData } from '@/hooks/useAccountsData'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import PortfolioView from './PortfolioView'
import AccountView from './AccountView'
import type { Account } from '@/types'

export default function AccountsApp() {
  const { data, setData, loading, error, syncState, saveAccount, addAccount } = useAccountsData()
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [currentEngagementId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          title={topbarTitle}
          editable={!!currentAccountId}
          onTitleChange={v => {
            if (currentAccount) handleUpdateAccount({ ...currentAccount, account_name: v })
          }}
          engagementName={engagement?.engagement_name}
          showNav={!!currentAccountId}
          syncState={syncState}
          onHamburger={() => setSidebarOpen(s => !s)}
        />

        <main
          className="main"
          style={{ paddingTop: 'var(--topbar-h)' }}
        >
          {loading ? (
            <div className="section-loading">Loading…</div>
          ) : currentAccountId ? (
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
          ) : (
            <>
              <div className="app-section-header portfolio-section-header">
                <div className="app-section-title">All Accounts</div>
              </div>
              <PortfolioView
                accounts={data.accounts}
                background={data.background}
                stakeholders={data.stakeholders}
                actions={data.actions}
                projects={data.projects}
                onSelectAccount={handleSelectAccount}
                onUpdateAccount={handleUpdateAccount}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
