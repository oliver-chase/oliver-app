'use client'
import { useRef } from 'react'
import type { Account } from '@/types'

interface Props {
  accounts: Account[]
  currentAccountId: string | null
  onSelectAll: () => void
  onSelectAccount: (id: string) => void
  onRenameAccount: (id: string, name: string) => void
  onAddAccount: () => void
  open: boolean
  onClose: () => void
}

export default function Sidebar({
  accounts, currentAccountId, onSelectAll, onSelectAccount,
  onRenameAccount, onAddAccount, open, onClose,
}: Props) {
  return (
    <>
      <aside className={`app-sidebar${open ? ' open' : ''}`} id="sidebar">
        <div className="app-sidebar-logo">Account Strategy</div>
        <a href="/" className="sidebar-back">&#8592; Back to Hub</a>

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
                onRename={name => onRenameAccount(acc.account_id, name)}
              />
            ))}
          </div>
        </div>

        <button className="sidebar-add-btn" id="btn-add-account" onClick={onAddAccount}>
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

function SidebarAccount({ account, active, onSelect, onRename }: {
  account: Account
  active: boolean
  onSelect: () => void
  onRename: (name: string) => void
}) {
  const spanRef = useRef<HTMLSpanElement>(null)

  return (
    <div
      className={`app-sidebar-item${active ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <span
        ref={spanRef}
        className="app-sidebar-item-label"
        contentEditable
        suppressContentEditableWarning
        aria-label="Account name"
        role="textbox"
        onMouseDown={e => e.stopPropagation()}
        onFocus={() => { if (spanRef.current) spanRef.current.style.background = 'var(--color-bg-sidebar-focus)' }}
        onBlur={() => {
          if (spanRef.current) spanRef.current.style.background = ''
          const v = spanRef.current?.textContent?.trim() || ''
          if (v && v !== account.account_name) onRename(v)
          else if (spanRef.current) spanRef.current.textContent = account.account_name
        }}
      >
        {account.account_name}
      </span>
    </div>
  )
}
