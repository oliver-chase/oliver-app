'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAdminNavItems } from '@/modules/admin-nav'
import styles from './AdminShell.module.css'

interface AdminShellProps {
  title: string
  children: React.ReactNode
}

export function AdminShell({ title, children }: AdminShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = useMemo(() => getAdminNavItems(), [])

  return (
    <div className={styles.wrap}>
      <div
        className={styles.backdrop + (sidebarOpen ? ' ' + styles.backdropOpen : '')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <nav className={'app-sidebar' + (sidebarOpen ? ' open' : '')} id="admin-sidebar" aria-label="Admin navigation">
        <div className="app-sidebar-logo">Admin</div>
        <Link href="/" className="sidebar-back">← Back to Hub</Link>
        <div className="app-sidebar-section">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={styles.navLink}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={'app-sidebar-item' + (active ? ' active' : '')}>
                  <span className="app-sidebar-item-label">{item.label}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.hamburger}
            aria-label="Toggle admin navigation"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
            onClick={() => setSidebarOpen(open => !open)}
          >
            &#9776;
          </button>
          <span className={styles.title}>{title}</span>
        </header>
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

