'use client'
import { useState, useEffect, useId, useRef } from 'react'
import type { Candidate, HrList } from './types'
import { getList } from './types'
import CustomPicker from '@/components/shared/CustomPicker'
import {
  createFileAsset,
  createLinkAsset,
  filenameForDownload,
  parseResumeAssets,
  serializeResumeAssets,
  sortAssetsNewestFirst,
  type StoredDocumentAsset,
} from '@/lib/hr-assets'

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
  const [resumeAssets, setResumeAssets] = useState<StoredDocumentAsset[]>(() => parseResumeAssets(candidate.resumeLink))
  const [resumeUrlInput, setResumeUrlInput] = useState('')
  const [resumeError, setResumeError] = useState('')
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onCancel() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  useEffect(() => {
    setC({ ...candidate })
    setResumeAssets(parseResumeAssets(candidate.resumeLink))
    setResumeUrlInput('')
    setResumeError('')
  }, [candidate])

  function update<K extends keyof Candidate>(k: K, v: Candidate[K]) { setC(prev => ({ ...prev, [k]: v })) }

  const statuses = getList(lists, 'candStatus')
  const depts    = getList(lists, 'dept')
  const sources  = getList(lists, 'source')
  const sens     = getList(lists, 'seniority')
  const etypes   = getList(lists, 'empType')
  const hasResumes = resumeAssets.length > 0

  async function handleResumeFile(file: File) {
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      setResumeError('Resume exceeds 5 MB. Upload a smaller file or use a link.')
      return
    }
    setResumeError('')
    try {
      const asset = await createFileAsset(file, 'Resume')
      setResumeAssets(prev => sortAssetsNewestFirst([...prev, asset]))
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not read the selected file.')
    }
  }

  function addResumeLink() {
    const url = resumeUrlInput.trim()
    if (!url) {
      setResumeError('Enter a valid resume URL first.')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      setResumeError('Resume links must begin with http:// or https://.')
      return
    }
    setResumeError('')
    const asset = createLinkAsset(url, 'Resume Link')
    setResumeAssets(prev => sortAssetsNewestFirst([...prev, asset]))
    setResumeUrlInput('')
  }

  function removeResume(assetId: string) {
    if (!window.confirm('Delete this resume version?')) return
    setResumeAssets(prev => prev.filter(asset => asset.id !== assetId))
  }

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
          <div className="cand-edit-group">
            <label className="app-modal-label">Resumes</label>
            <div className="cand-edit-row">
              <input
                className="app-modal-input"
                type="url"
                placeholder="https://sharepoint/... or other resume URL"
                value={resumeUrlInput}
                onChange={e => setResumeUrlInput(e.currentTarget.value)}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addResumeLink}>Add Link</button>
              <input
                ref={uploadRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void handleResumeFile(file)
                  e.currentTarget.value = ''
                }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => uploadRef.current?.click()}>Upload File</button>
            </div>
            {resumeError && <div className="iv-date-past" style={{ marginTop: 'var(--spacing-xs)' }}>{resumeError}</div>}
            {!hasResumes && (
              <div className="iv-empty" style={{ marginTop: 'var(--spacing-xs)' }}>No resume versions yet.</div>
            )}
            {hasResumes && (
              <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {resumeAssets.map(asset => (
                  <div key={asset.id} className="detail-row">
                    <span className="detail-key">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </span>
                    <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-accent-sm"
                        download={asset.kind === 'file' ? filenameForDownload(asset, 'resume') : undefined}
                      >
                        {asset.name}
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        aria-label="Delete resume version"
                        onClick={() => removeResume(asset.id)}
                      >
                        &times;
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          <button
            className="btn btn-primary"
            type="button"
            disabled={!c.name.trim()}
            onClick={() => onSave({
              ...c,
              resumeLink: serializeResumeAssets(resumeAssets),
              updatedAt: new Date().toISOString(),
            })}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
