'use client'
import { useState, useEffect, useId } from 'react'
import type { Candidate, HrList } from './types'
import { getList } from './types'
import CustomPicker from '@/components/shared/CustomPicker'

interface Props {
  candidate: Candidate
  lists: HrList[]
  onSave: (updated: Candidate) => void
  onCancel: () => void
  onDelete?: () => void
}

export default function EditCandidateModal({ candidate, lists, onSave, onCancel, onDelete }: Props) {
  const titleId = useId()
  const [c, setC] = useState<Candidate>({ ...candidate })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function update<K extends keyof Candidate>(k: K, v: Candidate[K]) { setC(prev => ({ ...prev, [k]: v })) }

  const statuses = getList(lists, 'candStatus')
  const depts    = getList(lists, 'dept')
  const sources  = getList(lists, 'source')
  const sens     = getList(lists, 'seniority')
  const etypes   = getList(lists, 'empType')

  function selectField<K extends keyof Candidate>(label: string, key: K, opts: string[]) {
    return (
      <div className="cand-edit-group">
        <label className="app-modal-label">{label}</label>
        <CustomPicker
          options={[{ value: '', label: '\u2014' }, ...opts.map(o => ({ value: o, label: o }))]}
          selected={String(c[key] ?? '')}
          onChange={v => update(key, v as Candidate[K])}
          showUnassigned={false}
          searchable={false}
        />
      </div>
    )
  }
  function inputField<K extends keyof Candidate>(label: string, key: K, type: string = 'text', placeholder?: string) {
    return (
      <div className="cand-edit-group">
        <label className="app-modal-label">{label}</label>
        <input
          className="app-modal-input"
          type={type}
          placeholder={placeholder}
          value={String(c[key] ?? '')}
          onChange={e => update(key, e.currentTarget.value as Candidate[K])}
        />
      </div>
    )
  }

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="app-modal app-modal-lg" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={onCancel}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>{'Edit \u2014 '}{c.name}</h2>
        <div className="app-modal-body cand-edit-body">
          {inputField('Name', 'name')}
          <div className="cand-edit-row">
            {inputField('Role', 'role')}
            {selectField('Seniority', 'seniority', sens)}
          </div>
          <div className="cand-edit-row">
            {selectField('Department', 'dept', depts)}
            {selectField('Source', 'source', sources)}
          </div>
          <div className="cand-edit-row">
            {selectField('Status', 'candStatus', statuses)}
            {selectField('Employment Type', 'empType', etypes)}
          </div>
          <div className="cand-edit-row">
            <div className="cand-edit-group">
              <label className="app-modal-label">Comp Type</label>
              <CustomPicker
                options={[{ value: '', label: '\u2014' }, { value: 'salary', label: 'Salary' }, { value: 'hourly', label: 'Hourly' }]}
                selected={c.compType}
                onChange={v => update('compType', v as string)}
                showUnassigned={false}
                searchable={false}
              />
            </div>
            {inputField('Amount ($)', 'compAmount', 'number')}
          </div>
          <div className="cand-edit-row cand-edit-row-3">
            {inputField('City', 'city')}
            {inputField('State', 'state')}
            {inputField('Country', 'country')}
          </div>
          {inputField('Client', 'client')}
          {inputField('Email', 'email', 'email')}
          {inputField('Resume Link', 'resumeLink', 'url')}
          {c.candStatus === 'Closed' && inputField('Rejection Reason', 'rejectionReason', 'text', 'Why closed?')}
          <div className="cand-edit-group">
            <label className="app-modal-label">Notes</label>
            <textarea
              className="app-modal-input"
              rows={3}
              value={c.notes || ''}
              onChange={e => update('notes', e.currentTarget.value)}
            />
          </div>
        </div>
        <div className="app-modal-actions">
          {onDelete && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} type="button" onClick={onDelete}>Delete</button>}
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" type="button" disabled={!c.name.trim()} onClick={() => onSave({ ...c, updatedAt: new Date().toISOString() })}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}
