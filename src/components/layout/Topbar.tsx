'use client';

import Link from 'next/link';
import SyncDot from '@/components/shared/SyncDot';

type SyncStatus = 'syncing' | 'ok' | 'err';

const NAV_ITEMS = [
  { label: 'Overview',      href: '#overview' },
  { label: 'People',        href: '#people' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Projects',      href: '#projects' },
  { label: 'Actions',       href: '#actions' },
  { label: 'Notes',         href: '#notes' },
] as const;

interface TopbarProps {
  syncStatus: SyncStatus;
  syncText: string;
  onExportClick: () => void;
  currentAccountId: string | null;
  // Additional props required by the source structure — not in original spec
  accountName?: string;           // shown in topbar-account; defaults to 'Account Strategy'
  onHamburgerClick?: () => void;  // mobile sidebar toggle
  activeSection?: string;         // e.g. 'overview' — drives .active on nav links
  // NOTE: source makes accountName contentEditable with blur-save.
  // Add onAccountNameChange?: (name: string) => void when implementing editable account name.
}

export default function Topbar({
  syncStatus,
  syncText,
  onExportClick,
  currentAccountId,
  accountName,
  onHamburgerClick,
  activeSection,
}: TopbarProps) {
  const showDetail = currentAccountId !== null;
  const title = showDetail ? (accountName ?? 'Account') : 'Account Strategy';

  return (
    <header className="topbar">
      <button
        className="topbar-hamburger"
        aria-label="Open navigation"
        aria-expanded="false"
        aria-controls="sidebar"
        onClick={onHamburgerClick}
        type="button"
      >
        &#9776;
      </button>

      <div className="topbar-account">{title}</div>

      {showDetail && (
        <nav className="topbar-nav" id="topbar-nav">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={activeSection === href.slice(1) ? 'active' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div className="topbar-right">
        {showDetail && (
          <button
            className="btn-link"
            id="btn-export-plan"
            onClick={onExportClick}
            type="button"
          >
            Export Plan
          </button>
        )}
        <SyncDot status={syncStatus} />
        <span
          className="sync-text"
          aria-live="polite"
          aria-atomic="true"
        >
          {syncText}
        </span>
      </div>
    </header>
  );
}
