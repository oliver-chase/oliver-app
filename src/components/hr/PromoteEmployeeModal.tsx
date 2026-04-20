'use client'
import { useState, useId, useEffect, useRef } from 'react'
import CustomPicker from '@/components/shared/CustomPicker'
import type { Candidate } from './types'

interface Props {
  candidate: Candidate
  depts: string[]
  onConfirm: (dept: string, startDate: string) => void
  onCancel: () => void
}

function defaultStartDate() {
  return new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
}

export default function PromoteEmployeeModal({ candidate, depts, onConfirm, onCancel }: Props) {
  const titleId = useId()
  const [dept, setDept] = useState(candidate.dept || depts[0] || '')
  const [startDate, setStartDate] = useState(defaultStartDate())
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { confirmRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onCancel}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>Promote to Employee</h2>
        <div className="app-modal-body">
          <p>
            Promoting <strong>{candidate.name}</strong> to employee. They will appear in the Directory and be marked Hired in Hiring.
          </p>
          <label className="app-modal-label app-modal-label--spaced">Department</label>
          <CustomPicker
            selected={dept}
            options={depts.map(d => ({ value: d, label: d }))}
            onChange={v => setDept(Array.isArray(v) ? v[0] || '' : v)}
            placeholder="Select department"
            showUnassigned={false}
          />
          <label className="app-modal-label app-modal-label--spaced">Start Date</label>
          <input
            className="app-modal-input"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.currentTarget.value)}
          />
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
          <button
            ref={confirmRef}
            className="btn btn-primary"
            type="button"
            disabled={!dept || !startDate}
            onClick={() => onConfirm(dept, startDate)}
          >
            Confirm &amp; Promote
          </button>
        </div>
      </div>
    </div>
  )
}
