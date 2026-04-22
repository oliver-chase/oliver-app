'use client'

import { useMemo } from 'react'
/* NOTE: visibleModules MUST be memoized. oliverConfig depends on it, and
   useRegisterOliver writes config into OliverProvider state on every change.
   An unstable array ref here = infinite render loop = Links stop working.
   Do not inline the filter into render body. */
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useUser } from '@/context/UserContext'
import { ModuleCard } from '@/components/hub/ModuleCard'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
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
  const { appUser, isAdmin, hasPermission } = useUser()
  const { account, logout } = useAuth()

  // TODO: remove bypass once app_users table is created in Supabase and permissions are configured.
  // Run: scripts/setup-app-users.sql, then seed the current user as admin via /admin.
  const permissionsReady = appUser !== null
  const visibleModules = useMemo(
    () => ALL_MODULES.filter(m => {
      if (m.comingSoon) return isAdmin
      if (!permissionsReady) return true
      return hasPermission(m.id as PagePermission)
    }),
    [isAdmin, permissionsReady, hasPermission],
  )

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = []
    return {
      pageLabel: 'Hub',
      placeholder: 'Where do you want to go?',
      greeting: "Hi, I'm Oliver. Pick a module below, or ask which one fits your task.",
      actions,
      quickConvos: [
        'Which module should I use for client meeting notes?',
        'What can HR & People Ops do?',
        'Summarise what ships this week across modules.',
      ],
      contextPayload: () => ({ visibleModules: visibleModules.map(m => m.id), isAdmin }),
    }
  }, [isAdmin, visibleModules])

  useRegisterOliver(oliverConfig)

  return (
    <>
      {account && (
        <div className={styles.sessionBar}>
          <span className={styles.sessionEmail}>{account.username}</span>
          <button type="button" className={styles.adminBtn} onClick={() => logout()}>
            Sign out
          </button>
        </div>
      )}

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
        <div className={styles.adminLinks}>
          <Link href="/design-system" className={styles.adminBtn}>Design System</Link>
          <Link href="/admin" className={styles.adminBtn}>Admin</Link>
        </div>
      )}

      <div className={styles.footer}>V.TWO &middot; 2026</div>
    </>
  )
}
