// DEPRECATED — AccountsApp now uses src/components/layout/Topbar.tsx
// Kept for reference during migration. Delete after visual QA passes.
'use client'
import { useRef } from 'react'
import Link from 'next/link'

interface Props {
  title: string
  editable?: boolean
  onTitleChange?: (v: string) => void
  engagementName?: string
  showNav?: boolean
  activeSection?: string
  syncState?: 'idle' | 'syncing' | 'ok' | 'error'
  onHamburger: () => void
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'actions', label: 'Actions' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'projects', label: 'Projects' },
  { id: 'notes', label: 'Notes' },
]

export default function Topbar({
  title, editable, onTitleChange, engagementName, showNav,
  activeSection, syncState, onHamburger,
}: Props) {
  const titleRef = useRef<HTMLDivElement>(null)

  const syncClass = syncState === 'syncing' ? 'syncing' : syncState === 'ok' ? 'ok' : syncState === 'error' ? 'err' : ''
  const syncLabel = syncState === 'syncing' ? 'Saving…' : syncState === 'error' ? 'Error' : 'Synced'

  return (
    <header className="topbar">
      <button
        className="topbar-hamburger"
        id="btn-hamburger"
        aria-label="Open navigation"
        onClick={onHamburger}
      >
        &#9776;
      </button>

      <div
        ref={titleRef}
        className="topbar-account"
        id="topbar-account"
        contentEditable={editable}
        suppressContentEditableWarning
        title={editable ? 'Click to edit account name' : undefined}
        onBlur={() => {
          if (editable && titleRef.current && onTitleChange) {
            onTitleChange(titleRef.current.textContent?.trim() || title)
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() } }}
      >
        {title}
      </div>

      {engagementName && (
        <>
          <span className="topbar-sep">/</span>
          <div className="topbar-engagement">{engagementName}</div>
        </>
      )}

      {showNav && (
        <nav className="topbar-nav" aria-label="Account sections">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={activeSection === item.id ? 'active' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}

      <div className="topbar-right">
        <div className={`sync-dot${syncClass ? ' ' + syncClass : ''}`} />
        <span className="sync-text">{syncLabel}</span>
      </div>
    </header>
  )
}
