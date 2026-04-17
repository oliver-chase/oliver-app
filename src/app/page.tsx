'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { ModuleCard } from '@/components/hub/ModuleCard'
import type { PagePermission } from '@/types/auth'
import styles from './hub.module.css'

interface Module {
  id: PagePermission | 'crm'
  name: string
  description: string
  href: string
  comingSoon?: boolean
}

const ALL_MODULES: Module[] = [
  {
    id: 'accounts',
    name: 'Account Strategy & Planning',
    description: 'Strategic account planning, stakeholder mapping, meeting notes, and action tracking.',
    href: '/accounts',
  },
  {
    id: 'hr',
    name: 'HR & People Ops',
    description: 'Applicant tracking, employee directory, onboarding, and device management.',
    href: '/hr',
  },
  {
    id: 'sdr',
    name: 'SDR & Outreach',
    description: 'Prospect pipeline, outreach sequences, and engagement tracking.',
    href: '/sdr',
  },
  {
    id: 'crm',
    name: 'CRM & Business Development',
    description: 'Client relationships, opportunity tracking, and proposal management.',
    href: '/crm',
    comingSoon: true,
  },
]

export default function HubPage() {
  const { isAdmin, hasPermission } = useUser()

  const visibleModules = ALL_MODULES.filter(m => {
    if (m.comingSoon) return isAdmin
    return hasPermission(m.id as PagePermission)
  })

  return (
    <>
      <div className={styles.hub}>
        <div className={styles.brand}>
          <div className={styles.wordmark}>V.Two Ops</div>
          <div className={styles.subtitle}>Internal Operations Hub</div>
        </div>

        <div className={styles.cards}>
          {visibleModules.map(m => (
            <ModuleCard
              key={m.id}
              name={m.name}
              description={m.description}
              href={m.href}
              comingSoon={m.comingSoon}
            />
          ))}
          {visibleModules.length === 0 && (
            <p className={styles.empty}>No modules assigned. Contact your administrator.</p>
          )}
        </div>
      </div>

      {isAdmin && (
        <Link href="/admin" className={styles.adminBtn}>
          Admin
        </Link>
      )}

      <div className={styles.footer}>V.TWO &middot; 2026</div>
    </>
  )
}
