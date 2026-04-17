'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import type { AppUser, PagePermission } from '@/types/auth'

type UserContextType = {
  appUser: AppUser | null
  isAdmin: boolean
  hasPermission: (page: PagePermission) => boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  appUser: null,
  isAdmin: false,
  hasPermission: () => false,
  refreshUser: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { account, isReady } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)

  async function loadUser() {
    if (!account) {
      setAppUser(null)
      return
    }

    const { upsertUser } = await import('@/lib/users')

    // Azure AD oid is in the account's localAccountId or idTokenClaims.oid
    const userId = (account.idTokenClaims as Record<string, string> | undefined)?.oid
      ?? account.localAccountId

    const user = await upsertUser({
      user_id: userId,
      email: account.username,
      name: account.name ?? account.username,
    })
    setAppUser(user)
  }

  useEffect(() => {
    if (isReady) loadUser()
  }, [account, isReady])

  const isAdmin = appUser?.role === 'admin'

  function hasPermission(page: PagePermission) {
    if (isAdmin) return true
    return appUser?.page_permissions.includes(page) ?? false
  }

  return (
    <UserContext.Provider value={{ appUser, isAdmin, hasPermission, refreshUser: loadUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
