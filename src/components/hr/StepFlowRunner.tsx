'use client'
import { useState, useEffect, useId } from 'react'
import type { Flow, FlowCtx } from './step-flow-types'

interface Props<D> {
  flow: Flow<D>
  ctx: FlowCtx
  onClose: () => void
}

export default function StepFlowRunner<D>({ flow, ctx, onClose }: Props<D>) {
  const titleId = useId()
  const [draft, setDraft] = useState<D>(() => flow.initialDraft(ctx))
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const step = flow.steps[stepIdx]
  const isFirst = stepIdx === 0
  const isLast = stepIdx === flow.steps.length - 1

  function back() {
    setError(null)
    setStepIdx(i => Math.max(0, i - 1))
  }

  async function next() {
    setError(null)
    if (step.validate) {
      const v = step.validate(draft)
      if (v) { setError(v); return }
    }
    if (isLast) {
      setBusy(true)
      try {
        await flow.finalize(draft, ctx)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
        setBusy(false)
      }
      return
    }
    setStepIdx(i => i + 1)
  }

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="app-modal app-modal-lg" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onClose} disabled={busy}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>{flow.title}</h2>
        <div className="step-flow-progress" aria-hidden="true">
          {flow.steps.map((s, i) => (
            <div
              key={s.title + i}
              className={'step-flow-progress-dot' + (i === stepIdx ? ' step-flow-progress-dot--active' : '') + (i < stepIdx ? ' step-flow-progress-dot--done' : '')}
              title={s.title}
            />
          ))}
          <span className="step-flow-progress-label">Step {stepIdx + 1} of {flow.steps.length} {'\u2014'} {step.title}</span>
        </div>
        <div className="app-modal-body">
          {step.description && <p className="step-flow-description">{step.description}</p>}
          {step.render({ draft, setDraft, ctx })}
          {error && <div className="step-flow-error">{error}</div>}
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          {!isFirst && <button className="btn btn-secondary" type="button" onClick={back} disabled={busy}>Back</button>}
          <button className="btn btn-primary" type="button" onClick={next} disabled={busy}>
            {busy ? 'Saving\u2026' : isLast ? 'Confirm' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
