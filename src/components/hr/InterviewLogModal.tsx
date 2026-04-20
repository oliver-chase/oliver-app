'use client'
import { useState, useEffect, useRef, useId } from 'react'
import type { Candidate, HrList } from './types'
import { getList } from './types'

interface Props {
  candidate: Candidate
  lists: HrList[]
  initial?: { date: string; score: string; interviewers: string; notes: string }
  onSave: (values: { date: string; score: string; interviewers: string; notes: string }) => void
  onCancel: () => void
}

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function InterviewLogModal({ candidate, lists, initial, onSave, onCancel }: Props) {
  const titleId = useId()
  const [date, setDate] = useState(initial?.date || todayStr())
  const [score, setScore] = useState(initial?.score || '')
  const [interviewers, setInterviewers] = useState(initial?.interviewers || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const dateRef = useRef<HTMLInputElement>(null)
  const scores = getList(lists, 'interviewScore')

  useEffect(() => { dateRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function submit() {
    if (!date) return
    onSave({ date, score, interviewers, notes })
  }

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onCancel}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>{initial ? 'Edit Interview' : 'Log Interview'}{' \u2014 '}{candidate.name}</h2>
        <div className="app-modal-body">
          <label className="app-modal-label">Date</label>
          <input ref={dateRef} className="app-modal-input" type="date" value={date} onChange={e => setDate(e.currentTarget.value)} />

          <label className="app-modal-label app-modal-label--spaced">Score</label>
          <select className="app-modal-input" value={score} onChange={e => setScore(e.currentTarget.value)}>
            <option value="">{'\u2014 No score \u2014'}</option>
            {scores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="app-modal-label app-modal-label--spaced">Interviewer(s)</label>
          <input
            className="app-modal-input"
            type="text"
            placeholder="Jordan Lee, Nina Patel"
            value={interviewers}
            onChange={e => setInterviewers(e.currentTarget.value)}
          />

          <label className="app-modal-label app-modal-label--spaced">Notes / Comments</label>
          <textarea
            className="app-modal-input"
            rows={4}
            placeholder={'Key observations, strengths, concerns\u2026'}
            value={notes}
            onChange={e => setNotes(e.currentTarget.value)}
          />
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" type="button" disabled={!date} onClick={submit}>{initial ? 'Save Changes' : 'Save Interview'}</button>
        </div>
      </div>
    </div>
  )
}
