'use client';

interface Account {
  account_id: string;
  account_name: string;
}

interface SidebarProps {
  accounts: Account[];
  currentAccountId: string | null;
  onSelectAll: () => void;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  accounts,
  currentAccountId,
  onSelectAll,
  onSelectAccount,
  onAddAccount,
  isOpen,
  onClose,
}: SidebarProps) {
  const sidebarClass = ['app-sidebar', isOpen ? 'open' : undefined].filter(Boolean).join(' ');
  const backdropClass = ['sidebar-backdrop', isOpen ? 'open' : undefined].filter(Boolean).join(' ');

  return (
    <>
      <aside className={sidebarClass} id="sidebar">
        <div className="app-sidebar-logo">Account Strategy</div>

        <a href="/" className="sidebar-back">&#8592; Back to Hub</a>

        <nav className="app-sidebar-nav">
          <div className="app-sidebar-section">
            <button
              className={`app-sidebar-item${currentAccountId === null ? ' active' : ''}`}
              id="sidebar-all"
              role="button"
              onClick={onSelectAll}
              type="button"
            >
              All Accounts
            </button>
          </div>

          <div className="app-sidebar-section">
            <div className="app-sidebar-section-label">Accounts</div>
            {accounts.map((acc) => (
              <button
                key={acc.account_id}
                className={`app-sidebar-item${acc.account_id === currentAccountId ? ' active' : ''}`}
                role="button"
                onClick={() => onSelectAccount(acc.account_id)}
                type="button"
              >
                {/* NOTE: source renders account_name as contentEditable span.
                    Add onAccountNameChange prop when inline rename is ported. */}
                <span className="app-sidebar-item-label">{acc.account_name}</span>
              </button>
            ))}
          </div>
        </nav>

        <button
          className="sidebar-add-btn"
          id="btn-add-account"
          onClick={onAddAccount}
          type="button"
        >
          + Add Account
        </button>
      </aside>

      <div
        className={backdropClass}
        id="sidebar-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
