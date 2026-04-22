'use client'
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface OliverAction {
  id: string
  label: string
  group: 'Create' | 'Search' | 'Quick' | 'Edit'
  hint?: string
  /** If true, action is hidden from the chip row and only surfaces via fuzzy typeahead. */
  granular?: boolean
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

/**
 * A single step in a chat-driven stepper.
 * - 'choice' steps render a fixed list of picker buttons.
 * - 'entity'  steps render a data-driven list (user's stakeholders, actions,
 *             etc.) plus accept typed input as a fallback.
 * - 'text'   | 'number' collect free-typed input.
 */
export type OliverFlowStep =
  | {
      id: string
      prompt: string | ((answers: Record<string, unknown>) => string)
      kind: 'choice'
      choices: Array<{ label: string; value: string }>
      optional?: boolean
      skipIf?: (answers: Record<string, unknown>) => boolean
    }
  | {
      id: string
      prompt: string | ((answers: Record<string, unknown>) => string)
      kind: 'entity'
      /** Produces the option list from current state (live data). */
      options: () => Array<{ label: string; value: string }>
      placeholder?: string
      optional?: boolean
      skipIf?: (answers: Record<string, unknown>) => boolean
    }
  | {
      id: string
      prompt: string | ((answers: Record<string, unknown>) => string)
      kind: 'text' | 'number'
      placeholder?: string
      optional?: boolean
      skipIf?: (answers: Record<string, unknown>) => boolean
    }

export interface OliverFlow {
  /** Stable id. Also used as the action id if triggered via a chip/alias. */
  id: string
  label: string
  /** What the user sees as the "you picked this" echo. */
  hint?: string
  /** Synonyms so the fuzzy matcher can route typed intent. */
  aliases?: string[]
  /** Ordered list of steps. Each step writes into answers[step.id]. */
  steps: OliverFlowStep[]
  /** Invoked when all steps are answered. Return the bot's confirmation line. */
  run: (answers: Record<string, unknown>) => Promise<string> | string
  /** Optional undo — shown after run() resolves. */
  undo?: (answers: Record<string, unknown>) => Promise<void> | void
}

export interface OliverConfig {
  pageLabel: string
  placeholder: string
  greeting?: string
  actions: OliverAction[]
  /** Chat-driven stepper flows registered by the page/module. */
  flows?: OliverFlow[]
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
