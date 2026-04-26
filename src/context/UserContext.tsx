'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { useAuth } from '@/context/AuthContext'
import { getUserByIdentity, upsertUser } from '@/lib/users'
import { getAccountMicrosoftIdentity } from '@/lib/microsoft-identity'
import { recordStartupTiming } from '@/lib/startup-telemetry'
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
const USER_LOAD_RETRY_DELAYS_MS = [0, 1200, 3000]
const USER_WARM_CACHE_TTL_MS = 60_000
const BUILTIN_OWNER_EMAILS = new Set(['kiana.micari@vtwo.co'])
const OWNER_PERMISSIONS: PagePermission[] = ['accounts', 'hr', 'sdr', 'crm', 'slides', 'reviews', 'campaigns']

type UserWarmCacheEntry = {
  appUser: AppUser | null
  loadError: string | null
  atMs: number
}

const userWarmCache = new Map<string, UserWarmCacheEntry>()

function getAccountOid(account: AccountInfo | null) {
  const identity = getAccountMicrosoftIdentity(account)
  if (identity.microsoftOid) return identity.microsoftOid
  if (identity.microsoftSub) return identity.microsoftSub
  if (!account) return null
  if (account.localAccountId) return account.localAccountId
  if (account.homeAccountId) return account.homeAccountId
  return null
}

function getAccountName(account: AccountInfo | null) {
  if (!account) return ''
  return account.name || account.username || ''
}

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function isBuiltinOwnerAccount(account: AccountInfo | null) {
  return BUILTIN_OWNER_EMAILS.has(normalizeEmail(account?.username))
}

function getBuiltinOwnerUser(account: AccountInfo | null, userId?: string | null): AppUser {
  const now = new Date().toISOString()
  return {
    user_id: userId || account?.localAccountId || account?.homeAccountId || 'kiana-micari-owner',
    email: normalizeEmail(account?.username) || 'kiana.micari@vtwo.co',
    name: getAccountName(account) || 'Kiana Micari',
    role: 'admin',
    page_permissions: OWNER_PERMISSIONS,
    created_at: now,
    updated_at: now,
    is_owner: true,
    effective_role: 'admin',
    effective_page_permissions: OWNER_PERMISSIONS,
  }
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
    page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides', 'reviews', 'campaigns'],
    created_at: now,
    updated_at: now,
  }
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function buildUserWarmCacheKey(account: AccountInfo | null, userId: string | null) {
  const id = (userId || '').trim() || 'unknown'
  const email = normalizeEmail(account?.username) || 'unknown'
  return `${id}|${email}`
}

function readWarmCache(cacheKey: string): UserWarmCacheEntry | null {
  const cached = userWarmCache.get(cacheKey)
  if (!cached) return null
  if (Date.now() - cached.atMs > USER_WARM_CACHE_TTL_MS) {
    userWarmCache.delete(cacheKey)
    return null
  }
  return cached
}

function writeWarmCache(cacheKey: string, appUser: AppUser | null, loadError: string | null) {
  userWarmCache.set(cacheKey, {
    appUser,
    loadError,
    atMs: Date.now(),
  })
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { account, isReady } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const inFlightKeyRef = useRef<string | null>(null)

  const loadUser = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force === true
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
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
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
      recordStartupTiming('user_fetch_ms', elapsed, '/')
      return
    }

    const userId = getAccountOid(account)
    const cacheKey = buildUserWarmCacheKey(account, userId)

    if (!force) {
      const cached = readWarmCache(cacheKey)
      if (cached) {
        setAppUser(cached.appUser)
        setLoadError(cached.loadError)
        setIsLoading(false)
        return
      }
    }

    if (!force && inFlightRef.current && inFlightKeyRef.current === cacheKey) {
      await inFlightRef.current
      return
    }

    const run = async () => {
    if (!userId) {
      if (isBuiltinOwnerAccount(account)) {
        const ownerUser = getBuiltinOwnerUser(account)
        setAppUser(ownerUser)
        setLoadError(null)
        setIsLoading(false)
        writeWarmCache(cacheKey, ownerUser, null)
        return
      }
      setAppUser(null)
      setLoadError('Missing Azure user identifier')
      setIsLoading(false)
      writeWarmCache(cacheKey, null, 'Missing Azure user identifier')
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      let lastError: unknown = null

      for (let attempt = 0; attempt < USER_LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
        if (attempt > 0) await delay(USER_LOAD_RETRY_DELAYS_MS[attempt] || 0)
        try {
          const lookupEmail = account.username || ''
          const microsoftIdentity = getAccountMicrosoftIdentity(account)
          const actorIdentity = { userId, email: lookupEmail, ...microsoftIdentity }
          let row = await getUserByIdentity(userId, lookupEmail, actorIdentity)
          const needsIdentityReconcile = !!row && row.user_id !== userId
          if ((!row || needsIdentityReconcile) && account.username) {
            row = await upsertUser({
              user_id: userId,
              email: account.username,
              name: getAccountName(account),
            }, microsoftIdentity, actorIdentity)
          }
          setAppUser(row)
          setLoadError(null)
          writeWarmCache(cacheKey, row, null)
          return
        } catch (err) {
          lastError = err
        }
      }

      if (isBuiltinOwnerAccount(account)) {
        const ownerUser = getBuiltinOwnerUser(account, userId)
        setAppUser(ownerUser)
        setLoadError(null)
        writeWarmCache(cacheKey, ownerUser, null)
        return
      }

      setAppUser(null)
      const message = lastError instanceof Error ? lastError.message : String(lastError)
      setLoadError(message)
      writeWarmCache(cacheKey, null, message)
    } finally {
      setIsLoading(false)
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
      recordStartupTiming('user_fetch_ms', elapsed, '/')
    }
    }

    const runPromise = run()
    inFlightRef.current = runPromise
    inFlightKeyRef.current = cacheKey
    try {
      await runPromise
    } finally {
      if (inFlightRef.current === runPromise) {
        inFlightRef.current = null
        inFlightKeyRef.current = null
      }
    }
  }, [account, isReady])

  const refreshUser = useCallback(async () => {
    await loadUser({ force: true })
  }, [loadUser])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (!loadError || !account || E2E_AUTH_BYPASS) return
    const onFocus = () => { void loadUser({ force: true }) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [account, loadError, loadUser])

  const value = useMemo<UserContextType>(() => {
    const isAdmin = appUser?.role === 'admin'
    return {
      appUser,
      isAdmin,
      hasPermission: (page) => isAdmin || !!appUser?.page_permissions.includes(page),
      refreshUser,
      isLoading,
      loadError,
    }
  }, [appUser, isLoading, loadError, refreshUser])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
