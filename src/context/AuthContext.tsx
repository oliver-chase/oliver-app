'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { PublicClientApplication, AccountInfo } from '@azure/msal-browser'

type AuthContextType = {
  account: AccountInfo | null
  login: () => Promise<void>
  logout: () => Promise<void>
  isReady: boolean
}

const AuthContext = createContext<AuthContextType>({
  account: null,
  login: async () => {},
  logout: async () => {},
  isReady: false,
})

const E2E_AUTH_BYPASS = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1'

function getBypassAccount(): AccountInfo {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('qa-auth-account')
    if (raw) {
      try {
        return JSON.parse(raw) as AccountInfo
      } catch {
        window.localStorage.removeItem('qa-auth-account')
      }
    }
  }

  return {
    homeAccountId: 'qa-home-account',
    environment: 'qa.local',
    tenantId: 'qa-tenant',
    username: 'qa-admin@example.com',
    localAccountId: 'qa-local-account',
    name: 'QA Admin',
    idTokenClaims: {
      oid: 'qa-admin-user',
      sub: 'qa-admin-user',
    },
  } as AccountInfo
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [isReady, setIsReady] = useState(false)
  const msalRef = useRef<PublicClientApplication | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (E2E_AUTH_BYPASS) {
        setAccount(getBypassAccount())
        setIsReady(true)
        return
      }

      const { PublicClientApplication } = await import('@azure/msal-browser')
      const { getMsalConfig } = await import('@/lib/msalConfig')
      const instance = new PublicClientApplication(getMsalConfig())
      await instance.initialize()

      // Handle redirect after OAuth
      const response = await instance.handleRedirectPromise()
      if (cancelled) return

      msalRef.current = instance

      if (response?.account) {
        instance.setActiveAccount(response.account)
        setAccount(response.account)
      } else {
        const active = instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? null
        instance.setActiveAccount(active)
        setAccount(active)
      }

      setIsReady(true)
    }

    init().catch(console.error)
    return () => { cancelled = true }
  }, [])

  async function login() {
    if (E2E_AUTH_BYPASS) return
    if (!msalRef.current) return
    const { LOGIN_SCOPES } = await import('@/lib/msalConfig')
    await msalRef.current.loginRedirect({ scopes: LOGIN_SCOPES })
  }

  async function logout() {
    if (E2E_AUTH_BYPASS) {
      setAccount(null)
      return
    }
    if (!msalRef.current) return
    await msalRef.current.logoutRedirect()
  }

  return (
    <AuthContext.Provider value={{ account, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
