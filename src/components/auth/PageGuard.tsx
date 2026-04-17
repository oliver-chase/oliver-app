'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import type { PagePermission } from '@/types/auth'

interface PageGuardProps {
  page: PagePermission
  children: React.ReactNode
}

export function PageGuard({ page, children }: PageGuardProps) {
  const { appUser, isAdmin, hasPermission } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (appUser === null) return   // still loading
    if (!hasPermission(page)) {
      router.replace('/')
    }
  }, [appUser, isAdmin, page, router, hasPermission])

  if (!appUser) return null
  if (!hasPermission(page)) return null

  return <>{children}</>
}
