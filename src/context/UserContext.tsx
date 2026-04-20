'use client'

/* Intentional bypass until app_users is seeded in Supabase and auth is wired.
   useUser() returns a default context (no user, no permissions) — Hub/Admin
   pages use this to show all modules to everyone.
   When activating permissions: restore UserProvider here, wrap children in
   layout.tsx, and add back MSAL-backed AuthContext. */

import { createContext, useContext } from 'react'
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

export function useUser() {
  return useContext(UserContext)
}
