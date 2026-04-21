'use client'
import { useState, useEffect, useId } from 'react'

interface ActionItem { task: string; owner: string; due: string }
interface Decision { decision: string; context: string }
interface Note { topic: string; content: string; speaker: string }
interface Metadata { title: string; date: string; attendees: string[] }

interface ParsedPayload {
  metadata?: Partial<Metadata>
  actions?: Array<Partial<ActionItem>>
  decisions?: Array<Partial<Decision>>
  notes?: Array<Partial<Note>>
  [key: string]: unknown
}

interface Props {
  payload: unknown
  onConfirm: (edited: unknown) => void
  onCancel: () => void
}

function toStr(v: unknown): string { return typeof v === 'string' ? v : '' }

function buildState(raw: unknown) {
  const p = (raw as ParsedPayload) ?? {}
  const meta: Metadata = {
    title: toStr(p.metadata?.title),
    date: toStr(p.metadata?.date),
    attendees: Array.isArray(p.metadata?.attendees) ? (p.metadata!.attendees as string[]) : [],
  }
  const actions: ActionItem[] = (p.actions ?? []).map(a => ({
    task: toStr(a.task),
    owner: toStr(a.owner),
    due: toStr(a.due),
  }))
  const decisions: Decision[] = (p.decisions ?? []).map(d => ({
    decision: toStr(d.decision),
    context: toStr(d.context),
  }))
  const notes: Note[] = (p.notes ?? []).map(n => ({
    topic: toStr(n.topic),
    content: toStr(n.content),
    speaker: toStr(n.speaker),
  }))
  return { meta, actions, decisions, notes }
}

function mergeBack(original: unknown, meta: Metadata, actions: ActionItem[], decisions: Decision[], notes: Note[]): unknown {
  const p = (original as ParsedPayload) ?? {}
  return {
    ...p,
    metadata: { ...p.metadata, title: meta.title, date: meta.date, attendees: meta.attendees.filter(Boolean) },
    actions: actions.filter(a => a.task.trim()),
    decisions: decisions.filter(d => d.decision.trim()),
    notes: notes.filter(n => n.topic.trim() || n.content.trim()),
  }
}

export default function TranscriptReviewModal({ payload, onConfirm, onCancel }: Props) {
  const titleId = useId()
  const init = buildState(payload)
  const [meta, setMeta] = useState<Metadata>(init.meta)
  const [actions, setActions] = useState<ActionItem[]>(init.actions)
  const [decisions, setDecisions] = useState<Decision[]>(init.decisions)
  const [notes, setNotes] = useState<Note[]>(init.notes)
  const [attendeeInput, setAttendeeInput] = useState(init.meta.attendees.join(', '))
  const [notesOpen, setNotesOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function updateMeta(k: keyof Metadata, v: string) {
    if (k === 'attendees') {
      setMeta(m => ({ ...m, attendees: v.split(',').map(s => s.trim()).filter(Boolean) }))
      setAttendeeInput(v)
    } else {
      setMeta(m => ({ ...m, [k]: v }))
    }
  }

  function updateAction(i: number, k: keyof ActionItem, v: string) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, [k]: v } : a))
  }

  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i))
  }

  function addAction() {
    setActions(prev => [...prev, { task: '', owner: '', due: '' }])
  }

  function updateDecision(i: number, k: keyof Decision, v: string) {
    setDecisions(prev => prev.map((d, idx) => idx === i ? { ...d, [k]: v } : d))
  }

  function removeDecision(i: number) {
    setDecisions(prev => prev.filter((_, idx) => idx !== i))
  }

  function addDecision() {
    setDecisions(prev => [...prev, { decision: '', context: '' }])
  }

  function updateNote(i: number, k: keyof Note, v: string) {
    setNotes(prev => prev.map((n, idx) => idx === i ? { ...n, [k]: v } : n))
  }

  function removeNote(i: number) {
    setNotes(prev => prev.filter((_, idx) => idx !== i))
  }

  function addNote() {
    setNotes(prev => [...prev, { topic: '', content: '', speaker: '' }])
  }

  function handleConfirm() {
    onConfirm(mergeBack(payload, { ...meta, attendees: attendeeInput.split(',').map(s => s.trim()).filter(Boolean) }, actions, decisions, notes))
  }

  return (
    <div
      className="app-modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="app-modal app-modal-lg" role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ maxHeight: '85vh' }}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onCancel}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>Review Transcript</h2>

        <div className="app-modal-body" style={{ gap: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column' }}>

          {/* Metadata */}
          <section>
            <div className="app-modal-label" style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meeting Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
              <div>
                <label className="app-modal-label">Title</label>
                <input className="app-modal-input" value={meta.title} onChange={e => updateMeta('title', e.target.value)} placeholder="Meeting title" />
              </div>
              <div>
                <label className="app-modal-label">Date</label>
                <input className="app-modal-input" value={meta.date} onChange={e => updateMeta('date', e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
            </div>
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              <label className="app-modal-label">Attendees (comma-separated)</label>
              <input className="app-modal-input" value={attendeeInput} onChange={e => updateMeta('attendees', e.target.value)} placeholder="Alice, Bob, Carol" />
            </div>
          </section>

          {/* Actions */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
              <div className="app-modal-label" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Action Items ({actions.length})
              </div>
              <button type="button" className="btn btn-ghost btn--compact" onClick={addAction}>+ Add</button>
            </div>
            {actions.length === 0 && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>No action items extracted. Add one above.</p>
            )}
            {actions.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)', alignItems: 'center' }}>
                <input className="app-modal-input" value={a.task} onChange={e => updateAction(i, 'task', e.target.value)} placeholder="Task" />
                <input className="app-modal-input" value={a.owner} onChange={e => updateAction(i, 'owner', e.target.value)} placeholder="Owner" />
                <input className="app-modal-input" value={a.due} onChange={e => updateAction(i, 'due', e.target.value)} placeholder="Due date" />
                <button type="button" className="btn btn-ghost btn--compact" aria-label="Remove" onClick={() => removeAction(i)} style={{ flexShrink: 0 }}>&times;</button>
              </div>
            ))}
          </section>

          {/* Decisions */}
          {(decisions.length > 0 || true) && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <div className="app-modal-label" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Decisions ({decisions.length})
                </div>
                <button type="button" className="btn btn-ghost btn--compact" onClick={addDecision}>+ Add</button>
              </div>
              {decisions.length === 0 && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>No decisions extracted.</p>
              )}
              {decisions.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)', alignItems: 'start' }}>
                  <div>
                    <input className="app-modal-input" value={d.decision} onChange={e => updateDecision(i, 'decision', e.target.value)} placeholder="Decision" style={{ marginBottom: 'var(--spacing-xs)' }} />
                    <input className="app-modal-input" value={d.context} onChange={e => updateDecision(i, 'context', e.target.value)} placeholder="Context (optional)" />
                  </div>
                  <button type="button" className="btn btn-ghost btn--compact" aria-label="Remove" onClick={() => removeDecision(i)}>&times;</button>
                </div>
              ))}
            </section>
          )}

          {/* Notes — collapsible */}
          <section>
            <button
              type="button"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', width: '100%', justifyContent: 'space-between' }}
              onClick={() => setNotesOpen(o => !o)}
              aria-expanded={notesOpen}
            >
              <div className="app-modal-label" style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Notes ({notes.length})
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{notesOpen ? 'Hide' : 'Show'}</span>
            </button>
            {notesOpen && (
              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-xs)' }}>
                  <button type="button" className="btn btn-ghost btn--compact" onClick={addNote}>+ Add</button>
                </div>
                {notes.map((n, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', alignItems: 'start' }}>
                    <input className="app-modal-input" value={n.topic} onChange={e => updateNote(i, 'topic', e.target.value)} placeholder="Topic" />
                    <input className="app-modal-input" value={n.speaker} onChange={e => updateNote(i, 'speaker', e.target.value)} placeholder="Speaker" />
                    <button type="button" className="btn btn-ghost btn--compact" aria-label="Remove" onClick={() => removeNote(i)}>&times;</button>
                    <textarea
                      className="app-modal-input"
                      value={n.content}
                      onChange={e => updateNote(i, 'content', e.target.value)}
                      placeholder="Content"
                      rows={2}
                      style={{ gridColumn: '1 / 3', resize: 'vertical' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        <div className="app-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>Save &amp; Continue</button>
        </div>
      </div>
    </div>
  )
}
