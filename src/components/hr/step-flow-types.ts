import type { HrDB } from './types'

export type EditTarget = 'candidate' | 'employee' | 'device'

export interface FlowCtx {
  db: HrDB
  setDb: React.Dispatch<React.SetStateAction<HrDB>>
  setSyncState: (s: 'ok' | 'syncing' | 'error') => void
  requestEdit: (target: EditTarget, id: string) => void
}

export interface StepRender<D> {
  draft: D
  setDraft: (next: D) => void
  ctx: FlowCtx
}

export interface Step<D> {
  title: string
  description?: string
  render: (props: StepRender<D>) => React.ReactNode
  validate?: (draft: D) => string | null
  /** When true, the Next button label becomes "Confirm" and the step is final */
  isFinal?: boolean
}

export interface Flow<D = Record<string, unknown>> {
  id: string
  title: string
  initialDraft: (ctx: FlowCtx) => D
  steps: Step<D>[]
  finalize: (draft: D, ctx: FlowCtx) => Promise<void>
}
