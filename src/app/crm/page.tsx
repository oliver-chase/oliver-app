'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function CrmPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() { setSidebarOpen(o => !o) }
  function closeSidebar() { setSidebarOpen(false) }

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="CRM navigation">
        <div className="app-sidebar-logo">CRM &amp; Business Dev</div>
        <Link href="/" className="sidebar-back">← Back to Hub</Link>
        <div className="app-sidebar-section">
          <div className="app-sidebar-item active" role="button" tabIndex={0}>Overview</div>
        </div>
      </nav>
      <div className="main">
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            &#9776;
          </button>
          <span className="topbar-name">CRM &amp; Business Development</span>
        </header>
        <main className="page" id="main-content">
          <div className="coming-soon">
            <div className="coming-soon-badge">Coming Soon</div>
            <div className="coming-soon-title">CRM &amp; Business Development</div>
            <div className="coming-soon-sub">Client relationships, opportunity tracking, and proposal management.</div>
          </div>
        </main>
      </div>
    </div>
  )
}
