'use client'
import { useState, useRef, useEffect, useId, useCallback } from 'react'
import type { Candidate } from './types'

interface ParsedCandidate {
  name: string
  role?: string
  seniority?: string
  dept?: string
  city?: string
  state?: string
  email?: string
  source?: string
}

interface Props {
  onCancel: () => void
  onConfirm: (candidates: Candidate[]) => Promise<void>
}

type Phase = 'pick' | 'processing' | 'review' | 'error'

async function xlsxToCsv(file: File): Promise<string> {
  const xlsx = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = xlsx.read(buf, { type: 'array' })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) throw new Error('Workbook has no sheets')
  const sheet = wb.Sheets[firstSheetName]
  return xlsx.utils.sheet_to_csv(sheet)
}

async function callParseApi(file: File, signal: AbortSignal): Promise<{ candidates: ParsedCandidate[]; model?: string }> {
  const isImage = file.type.startsWith('image/')
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isXlsx = ext === 'xlsx' || ext === 'xls'

  let body: BodyInit
  let endpoint: string
  let headers: HeadersInit

  if (isImage) {
    endpoint = '/api/parse-image'
    const fd = new FormData(); fd.append('file', file)
    body = fd
    headers = {}
  } else if (isXlsx) {
    endpoint = '/api/parse-document'
    body = await xlsxToCsv(file)
    headers = { 'Content-Type': 'text/plain' }
  } else {
    endpoint = '/api/parse-document'
    body = await file.text()
    headers = { 'Content-Type': 'text/plain' }
  }

  const res = await fetch(endpoint, { method: 'POST', body, headers, signal })
  if (!res.ok) throw new Error('Parse failed: HTTP ' + res.status)
  const data = await res.json()
  if (!data || !Array.isArray(data.candidates)) throw new Error('Parse returned no candidates')
  return data
}

export default function AIIntakeModal({ onCancel, onConfirm }: Props) {
  const titleId = useId()
  const [phase, setPhase] = useState<Phase>('pick')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedCandidate[]>([])
  const [model, setModel] = useState('')
  const [confirming, setConfirming] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const handleClose = useCallback(() => {
    if (confirming) return
    abortRef.current?.abort()
    onCancel()
  }, [onCancel, confirming])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); handleClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  useEffect(() => () => { mountedRef.current = false; abortRef.current?.abort() }, [])

  async function handleFile(file: File) {
    setPhase('processing')
    setError('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const result = await callParseApi(file, ctrl.signal)
      if (ctrl.signal.aborted) return
      setParsed(result.candidates)
      setModel(result.model || '')
      setPhase('review')
    } catch (e) {
      if (ctrl.signal.aborted) return
      setError(e instanceof Error ? e.message : 'Unknown error')
      setPhase('error')
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
    }
  }

  async function handleConfirm() {
    if (!parsed.length || confirming) return
    setConfirming(true)
    const now = new Date().toISOString()
    const records: Candidate[] = parsed.map(p => ({
      id: 'CAND-' + crypto.randomUUID(),
      name: p.name || 'Unknown',
      role: p.role || '', seniority: p.seniority || '', dept: p.dept || '',
      source: p.source || 'AI Intake', stage: 'sourced', candStatus: 'Active',
      empType: '', compType: '', compAmount: '', city: p.city || '', state: p.state || '',
      country: '', client: '', email: p.email || '', resumeLink: '', skills: '',
      addedAt: now, updatedAt: now, notes: '',
      rejectionReason: '', offerAmount: '', offerDate: '', offerStatus: '',
    }))
    try {
      await onConfirm(records)
    } finally {
      if (mountedRef.current) setConfirming(false)
    }
  }

  return (
    <div className="app-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="app-modal app-modal-lg" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="app-modal-close" aria-label="Close" onClick={handleClose} disabled={confirming}>&times;</button>
        <h2 className="app-modal-title" id={titleId}>Candidate Intake</h2>
        <div className="app-modal-body">
          {phase === 'pick' && (
            <>
              <p>Upload a CSV file or image of your candidate list. AI will extract and fill the gaps.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,image/jpeg,image/png,image/gif,image/webp"
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                onChange={e => { const f = e.currentTarget.files?.[0]; if (f) handleFile(f) }}
                aria-label="Upload candidate list"
              />
              <div
                className="ai-intake-drop"
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
              >
                <div className="ai-intake-drop-text">Drop file here or click to upload</div>
                <div className="ai-intake-drop-hint">{'CSV, Excel, or image \u00b7 Max 10 MB'}</div>
              </div>
            </>
          )}
          {phase === 'processing' && (
            <div className="ai-intake-processing">
              <div className="ai-intake-spinner" aria-hidden="true" />
              <div>{'Processing\u2026 the AI is reading your file.'}</div>
            </div>
          )}
          {phase === 'review' && (
            <>
              <p>{parsed.length} candidate{parsed.length === 1 ? '' : 's'} extracted{model ? ' (model: ' + model + ')' : ''}. Review and confirm to add to your pipeline.</p>
              <div className="ai-intake-results">
                {parsed.map((c, i) => (
                  <div key={i} className="ai-intake-row">
                    <strong>{c.name}</strong>
                    {c.role && <span>{' \u00b7 '}{c.role}</span>}
                    {c.seniority && <span>{' \u00b7 '}{c.seniority}</span>}
                    {c.dept && <span>{' \u00b7 '}{c.dept}</span>}
                    {c.city && <span>{' \u00b7 '}{c.city}{c.state ? ', ' + c.state : ''}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {phase === 'error' && (
            <div className="ai-intake-error">
              <div><strong>Could not parse the file.</strong></div>
              <div className="ai-intake-error-msg">{error}</div>
              <div className="ai-intake-error-hint">If the API is not yet configured, set <code>ANTHROPIC_API_KEY</code> via the admin panel and redeploy.</div>
            </div>
          )}
        </div>
        <div className="app-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={handleClose} disabled={confirming}>{phase === 'review' ? 'Discard' : 'Cancel'}</button>
          {phase === 'error' && <button className="btn btn-secondary" type="button" onClick={() => setPhase('pick')}>Try Again</button>}
          {phase === 'pick' && (
            <button className="btn btn-primary" type="button" onClick={() => fileInputRef.current?.click()}>Choose File</button>
          )}
          {phase === 'review' && (
            <button className="btn btn-primary" type="button" disabled={!parsed.length || confirming} onClick={handleConfirm}>
              {confirming ? 'Adding\u2026' : 'Add ' + parsed.length + ' Candidate' + (parsed.length === 1 ? '' : 's')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
