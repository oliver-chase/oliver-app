'use client'
import { useEffect } from 'react'
import { applyTokenOverrides } from '@/lib/tokens'

export default function TokenOverridesLoader() {
  useEffect(() => {
    applyTokenOverrides().catch(() => {})
  }, [])
  return null
}
