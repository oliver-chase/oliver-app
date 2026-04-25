'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import type { ModuleId } from '@/modules/registry'
import { getModuleById, isModuleEnabled } from '@/modules/registry'

export function useModuleAccess(moduleId: ModuleId) {
  const router = useRouter()
  const { appUser, isAdmin, hasPermission, isLoading } = useUser()

  const module = useMemo(() => getModuleById(moduleId), [moduleId])
  const permissionsReady = !isLoading && appUser !== null
  const enabled = isModuleEnabled(moduleId)

  const canAccess = permissionsReady
    && (module.comingSoon ? isAdmin : hasPermission(moduleId))

  const allowRender = permissionsReady && enabled && canAccess

  useEffect(() => {
    if (isLoading) return
    if (!enabled || !canAccess) router.replace('/')
  }, [canAccess, enabled, isLoading, router])

  return { allowRender, canAccess, enabled }
}
