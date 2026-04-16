'use client'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const PUBLIC_PATHS = ['/login']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_PATHS.some(p => pathname?.startsWith(p))

  useEffect(() => {
    if (inProgress !== 'none') return
    if (!isAuthenticated && !isPublic) {
      router.replace('/login')
    }
    if (isAuthenticated && isPublic) {
      router.replace('/accounts')
    }
  }, [isAuthenticated, inProgress, isPublic, router])

  if (inProgress !== 'none') return null

  if (!isAuthenticated && !isPublic) return null

  return <>{children}</>
}
