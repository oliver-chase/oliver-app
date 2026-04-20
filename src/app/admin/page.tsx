'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { UserManager } from '@/components/admin/UserManager'
import { TokenEditor } from '@/components/admin/TokenEditor'
import { ComponentLibrary } from '@/components/admin/ComponentLibrary'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import styles from './admin.module.css'

type Tab = 'users' | 'tokens' | 'components'

export default function AdminPage() {
  const { isAdmin, appUser } = useUser()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')

  useEffect(() => {
    if (appUser !== null && !isAdmin) {
      router.replace('/')
    }
  }, [isAdmin, appUser, router])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = [
      { id: 'tab-users',      label: 'Open Users',        group: 'Navigate', run: () => setTab('users') },
      { id: 'tab-tokens',     label: 'Open Design Tokens',group: 'Navigate', run: () => setTab('tokens') },
      { id: 'tab-components', label: 'Open Components',   group: 'Navigate', run: () => setTab('components') },
      { id: 'nav-ds',         label: 'Go to Design System', group: 'Navigate', run: () => router.push('/design-system') },
      { id: 'nav-hub',        label: 'Back to Hub',        group: 'Navigate', run: () => router.push('/') },
    ]
    return {
      pageLabel: 'Admin',
      placeholder: 'What do you want to do?',
      greeting: "Hi, I'm Oliver. Ask about admin actions — users, tokens, components.",
      actions,
      quickConvos: [
        'How do I add a new admin user?',
        'Which tokens control brand pink and purple?',
      ],
      contextPayload: () => ({ currentTab: tab }),
    }
  }, [router, tab])

  useRegisterOliver(oliverConfig)

  if (appUser !== null && !isAdmin) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backLink}>
              &larr; Hub
            </Link>
            <h1 className={styles.title}>Admin</h1>
          </div>
          <Link href="/design-system" className={styles.backLink} style={{ marginLeft: 'auto' }}>
            Design System &rarr;
          </Link>
          <div className={styles.tabs}>
            <button
              className={tab === 'users' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab('users')}
            >
              Users
            </button>
            <button
              className={tab === 'tokens' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab('tokens')}
            >
              Design Tokens
            </button>
            <button
              className={tab === 'components' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab('components')}
            >
              Components
            </button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {tab === 'users' && <UserManager />}
        {tab === 'tokens' && <TokenEditor />}
        {tab === 'components' && <ComponentLibrary />}
      </div>
    </div>
  )
}
