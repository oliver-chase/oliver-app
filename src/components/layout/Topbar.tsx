'use client';

import { useRef } from 'react';
import SyncDot from '@/components/shared/SyncDot';

type SyncStatus = 'syncing' | 'ok' | 'err';

const NAV_ITEMS = [
  { label: 'Overview',      href: '#overview' },
  { label: 'People',        href: '#people' },
  { label: 'Actions',       href: '#actions' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Projects',      href: '#projects' },
  { label: 'Notes',         href: '#notes' },
] as const;

interface TopbarProps {
  syncStatus: SyncStatus;
  syncText: string;
  onExportClick: () => void;
  currentAccountId: string | null;
  accountName?: string;
  engagementName?: string;
  onHamburgerClick?: () => void;
  sidebarOpen?: boolean;
  activeSection?: string;
  onSectionSelect?: (section: string) => void;
  onAccountNameChange?: (name: string) => void;
}

export default function Topbar({
  syncStatus,
  syncText,
  onExportClick,
  currentAccountId,
  accountName,
  engagementName,
  onHamburgerClick,
  sidebarOpen,
  activeSection,
  onSectionSelect,
  onAccountNameChange,
}: TopbarProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const showDetail = currentAccountId !== null;
  const editable = showDetail && !!onAccountNameChange;
  const title = showDetail ? (accountName ?? 'Account') : 'All Accounts';

  return (
    <header className="topbar">
      <button
        id="btn-hamburger"
        className="topbar-hamburger"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen ?? false}
        aria-controls="sidebar"
        onClick={onHamburgerClick}
        type="button"
      >
        &#9776;
      </button>

      <div
        ref={titleRef}
        id="topbar-account"
        className="topbar-account"
        contentEditable={editable || undefined}
        suppressContentEditableWarning
        title={editable ? 'Click to edit account name' : undefined}
        onBlur={() => {
          if (editable && titleRef.current && onAccountNameChange) {
            const v = titleRef.current.textContent?.trim() || ''
            if (v) onAccountNameChange(v)
            else titleRef.current.textContent = title
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() } }}
      >
        {title}
      </div>

      <span
        id="topbar-sep"
        className="topbar-sep"
        style={{ display: engagementName ? '' : 'none' }}
      >
        /
      </span>
      <div
        id="topbar-engagement"
        className="topbar-engagement"
        style={{ display: engagementName ? '' : 'none' }}
      >
        {engagementName}
      </div>

      <nav
        id="topbar-nav"
        className="topbar-nav"
        aria-label="Account sections"
        style={{ display: showDetail ? '' : 'none' }}
      >
        {NAV_ITEMS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className={activeSection === href.slice(1) ? 'active' : undefined}
            onClick={() => onSectionSelect?.(href.slice(1))}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="topbar-right">
        <button
          className="btn-link"
          id="btn-export-plan"
          style={{ display: showDetail ? '' : 'none' }}
          onClick={onExportClick}
          type="button"
        >
          Export Plan
        </button>
        <SyncDot status={syncStatus} />
        <span
          id="sync-text"
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
