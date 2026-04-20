'use client'
import Link from 'next/link'
import type { Account } from '@/types'

interface Props {
  accounts: Account[]
  currentAccountId: string | null
  onSelectAll: () => void
  onSelectAccount: (id: string) => void
  onAddAccount: () => void
  open: boolean
  onClose: () => void
}

export default function Sidebar({
  accounts, currentAccountId, onSelectAll, onSelectAccount,
  onAddAccount, open, onClose,
}: Props) {
  return (
    <>
      <aside className={`app-sidebar${open ? ' open' : ''}`} id="sidebar">
        <div className="app-sidebar-logo">Account Strategy</div>
        <Link href="/" className="sidebar-back">&#8592; Back to Hub</Link>

        <div className="app-sidebar-section">
          <div
            className={`app-sidebar-item${currentAccountId === null ? ' active' : ''}`}
            id="sidebar-all"
            role="button"
            tabIndex={0}
            onClick={onSelectAll}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectAll() } }}
          >
            All Accounts
          </div>
        </div>

        <div className="app-sidebar-section">
          <div className="app-sidebar-section-label">Accounts</div>
          <div id="sidebar-accounts">
            {accounts.map(acc => (
              <SidebarAccount
                key={acc.account_id}
                account={acc}
                active={acc.account_id === currentAccountId}
                onSelect={() => onSelectAccount(acc.account_id)}
              />
            ))}
          </div>
        </div>

        <button className="btn-link" id="btn-add-account" style={{ display: 'block', padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }} onClick={onAddAccount}>
          + Add Account
        </button>
      </aside>
      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        id="sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  )
}

function SidebarAccount({ account, active, onSelect }: {
  account: Account
  active: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={`app-sidebar-item${active ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <span className="app-sidebar-item-label">{account.account_name}</span>
    </div>
  )
}
