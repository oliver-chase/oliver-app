'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { useAuth } from '@/context/AuthContext'
import { getUser, upsertUser } from '@/lib/users'
import type { AppUser, PagePermission } from '@/types/auth'

type UserContextType = {
  appUser: AppUser | null
  isAdmin: boolean
  hasPermission: (page: PagePermission) => boolean
  refreshUser: () => Promise<void>
  isLoading: boolean
  loadError: string | null
}

const UserContext = createContext<UserContextType>({
  appUser: null,
  isAdmin: false,
  hasPermission: () => false,
  refreshUser: async () => {},
  isLoading: false,
  loadError: null,
})

const E2E_AUTH_BYPASS = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1'

function getAccountOid(account: AccountInfo | null) {
  if (!account) return null
  const claims = account.idTokenClaims as Record<string, unknown> | undefined
  if (typeof claims?.oid === 'string' && claims.oid) return claims.oid
  if (typeof claims?.sub === 'string' && claims.sub) return claims.sub
  if (account.localAccountId) return account.localAccountId
  if (account.homeAccountId) return account.homeAccountId
  return null
}

function getAccountName(account: AccountInfo | null) {
  if (!account) return ''
  return account.name || account.username || ''
}

function getBypassUser(account: AccountInfo | null): AppUser {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('qa-app-user')
    if (raw) {
      try {
        return JSON.parse(raw) as AppUser
      } catch {
        window.localStorage.removeItem('qa-app-user')
      }
    }
  }

  const now = new Date().toISOString()
  return {
    user_id: getAccountOid(account) || 'qa-admin-user',
    email: account?.username || 'qa-admin@example.com',
    name: getAccountName(account) || 'QA Admin',
    role: 'admin',
    page_permissions: ['accounts', 'hr', 'sdr', 'crm'],
    created_at: now,
    updated_at: now,
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { account, isReady } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadUser = useCallback(async () => {
    if (!isReady) return
    if (!account) {
      setAppUser(null)
      setLoadError(null)
      setIsLoading(false)
      return
    }

    if (E2E_AUTH_BYPASS) {
      setAppUser(getBypassUser(account))
      setLoadError(null)
      setIsLoading(false)
      return
    }

    const userId = getAccountOid(account)
    if (!userId) {
      setAppUser(null)
      setLoadError('Missing Azure user identifier')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      let row = await getUser(userId)
      if (!row && account.username) {
        row = await upsertUser({
          user_id: userId,
          email: account.username,
          name: getAccountName(account),
        })
      }
      setAppUser(row)
    } catch (err) {
      setAppUser(null)
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [account, isReady])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  const value = useMemo<UserContextType>(() => {
    const isAdmin = appUser?.role === 'admin'
    return {
      appUser,
      isAdmin,
      hasPermission: (page) => isAdmin || !!appUser?.page_permissions.includes(page),
      refreshUser: loadUser,
      isLoading,
      loadError,
    }
  }, [appUser, isLoading, loadError, loadUser])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
