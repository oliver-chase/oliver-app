'use client'
import { useEffect } from 'react'
import { applyTokenOverrides } from '@/lib/tokens'

export default function TokenOverridesLoader() {
  useEffect(() => {
    applyTokenOverrides().catch(err => {
      console.error('[TokenOverridesLoader]', err instanceof Error ? err.message : String(err))
    })
  }, [])
  return null
}
