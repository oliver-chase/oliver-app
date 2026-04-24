'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import styles from './AdminEntryButton.module.css'

export default function AdminEntryButton() {
  const pathname = usePathname()
  const { isAdmin, isLoading, loadError } = useUser()

  if (isLoading || loadError || !isAdmin) return null
  if (pathname === '/login') return null

  const active = pathname === '/admin' || pathname === '/design-system'
  return (
    <Link
      href="/admin"
      className={styles.entry + (active ? ' ' + styles.entryActive : '')}
      aria-label="Open Admin dashboard"
    >
      ADMIN
    </Link>
  )
}

