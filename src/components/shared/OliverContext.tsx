'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface OliverAction {
  id: string
  label: string
  group: 'Create' | 'Search' | 'Quick'
  hint?: string
  run: () => void | Promise<void>
}

export interface OliverUploadConflict {
  section: string
  field: string
  existing: string
  incoming: string
}

export interface OliverParseResult {
  title: string
  summary: string
  model: string
  payload: unknown
}

export interface OliverDryRunResult {
  conflicts?: OliverUploadConflict[]
  summary?: Record<string, number>
}

export interface OliverUpload {
  accepts: string
  hint: string
  guidance?: string
  parse: (file: File) => Promise<OliverParseResult>
  dryRun: (payload: unknown) => Promise<OliverDryRunResult>
  commit: (payload: unknown) => Promise<{ message: string }>
}

export interface OliverConfig {
  pageLabel: string
  placeholder: string
  greeting?: string
  actions: OliverAction[]
  quickConvos?: string[]
  upload?: OliverUpload
  contextPayload?: () => unknown
  onChatRefresh?: () => void
}

interface OliverContextValue {
  config: OliverConfig | null
  register: (c: OliverConfig) => void
  unregister: () => void
  requestOpen: () => void
  openSignal: number
}

const Ctx = createContext<OliverContextValue | null>(null)

export function OliverProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OliverConfig | null>(null)
  const [openSignal, setOpenSignal] = useState(0)

  const register = useCallback((c: OliverConfig) => { setConfig(c) }, [])
  const unregister = useCallback(() => { setConfig(null) }, [])
  const requestOpen = useCallback(() => { setOpenSignal(s => s + 1) }, [])

  return (
    <Ctx.Provider value={{ config, register, unregister, requestOpen, openSignal }}>
      {children}
    </Ctx.Provider>
  )
}

export function useOliverContext(): OliverContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useOliverContext must be used inside <OliverProvider>')
  return v
}

export function useRegisterOliver(config: OliverConfig | null) {
  const { register, unregister } = useOliverContext()
  const ref = useRef(config)
  ref.current = config

  useEffect(() => {
    if (ref.current) register(ref.current)
    return () => unregister()
  }, [register, unregister])

  useEffect(() => {
    if (config) register(config)
  }, [config, register])
}
