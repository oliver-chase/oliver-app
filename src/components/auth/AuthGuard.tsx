'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const PUBLIC_PATHS = ['/login', '/login/']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { account, isReady } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isReady) return

    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))

    if (!account && !isPublic) {
      router.replace('/login/')
    } else if (account && isPublic) {
      router.replace('/')
    }
  }, [account, isReady, pathname, router])

  if (!isReady) return null

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
  if (!account && !isPublic) return null

  return <>{children}</>
}
