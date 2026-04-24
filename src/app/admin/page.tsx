'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { UserManager } from '@/components/admin/UserManager'
import { TokenEditor } from '@/components/admin/TokenEditor'
import { ComponentLibrary } from '@/components/admin/ComponentLibrary'
import { AdminShell } from '@/components/admin/AdminShell'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import { ADMIN_COMMANDS } from '@/app/admin/commands'
import { buildAdminFlows } from '@/app/admin/flows'
import { listUsers } from '@/lib/users'
import type { AppUser } from '@/types/auth'
import { getConversationPath } from '@/lib/chatbot-conversation-paths'
import styles from './admin.module.css'

type Tab = 'users' | 'tokens' | 'components'

export default function AdminPage() {
  const { isAdmin, appUser, isLoading, loadError } = useUser()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AppUser[]>([])
  const canAccessAdmin = !isLoading && !loadError && !!appUser && isAdmin

  useEffect(() => {
    if (!isLoading && !canAccessAdmin) {
      router.replace('/')
    }
  }, [canAccessAdmin, isLoading, router])

  const loadAdminData = useCallback(async () => {
    if (!canAccessAdmin) return
    try {
      const rows = await listUsers()
      setUsers(rows)
    } catch {
      // Keep admin chat available even if user list loading fails.
    }
  }, [canAccessAdmin])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = ADMIN_COMMANDS.map(c => {
      let run: () => void
      switch (c.id) {
        case 'tab-users':
          run = () => setTab('users')
          break
        case 'tab-tokens':
          run = () => setTab('tokens')
          break
        case 'tab-components':
          run = () => setTab('components')
          break
        default:
          run = () => {}
      }
      return { ...c, run }
    })
    const flows = buildAdminFlows({
      users,
      refetch: loadAdminData,
    })
    return {
      pageLabel: 'Admin',
      placeholder: 'What do you want to do?',
      greeting: "Hi, I'm Oliver. Ask about admin actions — users, tokens, components.",
      actions,
      flows,
      conversationPath: getConversationPath('admin'),
      quickConvos: [
        'How do I add a new admin user?',
        'Which tokens control brand pink and purple?',
      ],
      contextPayload: () => ({ currentTab: tab, users: users.length }),
    }
  }, [tab, users, loadAdminData])

  useRegisterOliver(oliverConfig)

  if (!canAccessAdmin) return null

  return (
    <AdminShell title="Admin Dashboard">
      <div className={styles.body}>
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
          <Link href="/design-system" className={styles.dsLink}>
            Open Design System
          </Link>
        </div>

        {tab === 'users' && <UserManager />}
        {tab === 'tokens' && <TokenEditor />}
        {tab === 'components' && <ComponentLibrary />}
      </div>
    </AdminShell>
  )
}
