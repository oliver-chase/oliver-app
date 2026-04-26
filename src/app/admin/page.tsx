'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { useAuth } from '@/context/AuthContext'
import { UserManager } from '@/components/admin/UserManager'
import { AdminShell } from '@/components/admin/AdminShell'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig, OliverAction } from '@/components/shared/OliverContext'
import { ADMIN_COMMANDS } from '@/app/admin/commands'
import { buildAdminFlows } from '@/app/admin/flows'
import { listUsers } from '@/lib/users'
import { getAccountMicrosoftIdentity } from '@/lib/microsoft-identity'
import type { AppUser } from '@/types/auth'
import { getConversationPath } from '@/lib/chatbot-conversation-paths'
import styles from './admin.module.css'

export default function AdminPage() {
  const { isAdmin, appUser, isLoading, loadError } = useUser()
  const { account } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AppUser[]>([])
  const canAccessAdmin = !isLoading && !loadError && !!appUser && isAdmin
  const actorIdentity = useMemo(
    () => (appUser ? { userId: appUser.user_id, email: appUser.email, ...getAccountMicrosoftIdentity(account) } : undefined),
    [account, appUser],
  )

  useEffect(() => {
    if (!isLoading && !canAccessAdmin) {
      router.replace('/')
    }
  }, [canAccessAdmin, isLoading, router])

  const loadAdminData = useCallback(async () => {
    if (!canAccessAdmin) return
    try {
      const rows = await listUsers(actorIdentity)
      setUsers(rows)
    } catch {
      // Keep admin chat available even if user list loading fails.
    }
  }, [actorIdentity, canAccessAdmin])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const oliverConfig = useMemo<OliverConfig>(() => {
    const actions: OliverAction[] = ADMIN_COMMANDS.map(c => {
      let run: () => void
      switch (c.id) {
        case 'tab-users':
          run = () => {
            const usersHeading = document.getElementById('admin-user-access')
            usersHeading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          break
        case 'open-design-system':
          run = () => router.push('/design-system')
          break
        default:
          run = () => {}
      }
      return { ...c, run }
    })
    const flows = buildAdminFlows({
      users,
      refetch: loadAdminData,
      actorIdentity,
    })
    return {
      pageLabel: 'Admin',
      placeholder: 'What do you want to do?',
      greeting: "Hi, I'm Oliver. Ask about admin actions — user access and design system navigation.",
      actions,
      flows,
      conversationPath: getConversationPath('admin'),
      quickConvos: [
        'How do I add a new admin user?',
        'Open the design system workspace.',
      ],
      contextPayload: () => ({ users: users.length }),
    }
  }, [users, loadAdminData, router])

  useRegisterOliver(oliverConfig)

  if (!canAccessAdmin) return null

  return (
    <AdminShell title="Admin Dashboard">
      <div className={styles.body}>
        <div className={styles.adminIntro}>
          <h1 id="admin-user-access" className={styles.adminHeading}>User Access</h1>
          <p className={styles.adminSubheading}>
            Manage roles and module permissions. Design system editing now lives in the Design System admin workspace.
          </p>
        </div>
        <UserManager />
      </div>
    </AdminShell>
  )
}
