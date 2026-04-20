'use client'
import { useEffect, useRef, useState } from 'react'
import type { SdrProspect, SdrSend, SdrApprovalItem } from './types'
import { PROSPECT_STATUS_LABEL, TRACK_LABEL } from './types'

interface Props {
  prospect: SdrProspect | null
  sends: SdrSend[]
  approvalItems?: SdrApprovalItem[]
  onClose: () => void
  onRefresh?: () => void | Promise<void>
}

export default function SdrProspectDetail({ prospect, sends, approvalItems = [], onClose, onRefresh }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  useEffect(() => {
    if (prospect) {
      document.body.style.overflow = 'hidden'
      closeRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [prospect])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!prospect) return null
  const p = prospect

  const stClass   = 'sdr-status--' + (p.st || 'new').replace(/_/g, '-')
  const stLabel   = PROSPECT_STATUS_LABEL[p.st] || p.st || 'New'
  const track     = TRACK_LABEL[p.tr] || p.tr || ''
  const touchN    = parseInt(p.fuc, 10) || 0
  const location  = [p.city, p.state, p.country].filter(Boolean).join(', ')
  const pSends    = sends.filter(s => s.prospect_id === p.id)
  const pQueued   = approvalItems.filter(a => a.prospect_id === p.id && (a.status === 'approved' || a.status === 'pending'))
  const queuedCount = pQueued.length

  function copyEmail() {
    if (p.em) navigator.clipboard.writeText(p.em).catch(() => null)
  }

  return (
    <>
      <div className="sdr-detail-backdrop open" onClick={onClose} />
      <div className="sdr-detail-panel open" role="dialog" aria-modal="true" aria-label="Prospect details">
        <div className="sdr-detail-header">
          <div>
            <div className="sdr-detail-name">{p.nm || p.fn || 'Unknown'}</div>
            <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
              <span className={'sdr-status-badge ' + stClass}>{stLabel}</span>
              {queuedCount > 0 && (
                <span className="sdr-status-badge sdr-status--approved">Queued {queuedCount}</span>
              )}
            </div>
          </div>
          <button ref={closeRef} className="sdr-detail-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="sdr-detail-body">
          {p.ti && <Field label="Title" value={p.ti} />}
          {p.co && <Field label="Company" value={p.co} />}
          {p.em && <Field label="Email"><a href={'mailto:' + p.em}>{p.em}</a></Field>}
          {p.dm && <Field label="Domain"><a href={'https://' + p.dm} target="_blank" rel="noopener">{p.dm}</a></Field>}
          {p.ind && <Field label="Industry" value={p.ind} />}
          {p.sig && <Field label="Signal" value={p.sig} />}
          {location && <Field label="Location" value={location} />}
          {p.sz && <Field label="Company Size" value={p.sz} />}
          {p.rev && <Field label="Revenue" value={p.rev} />}
          {(track || touchN > 0) && (
            <div className="sdr-detail-row">
              <div className="sdr-detail-label">Tags</div>
              <div className="sdr-detail-chips">
                {track && <span className="sdr-track-chip">{track}</span>}
                {touchN > 0 && <span className="sdr-touch-chip">Touch {touchN}</span>}
              </div>
            </div>
          )}
          {p.nfu && <Field label="Next Follow-up" value={p.nfu} />}
          {p.fc && <Field label="First Contact" value={p.fc} />}
          {p.lc && <Field label="Last Contact" value={p.lc} />}
          {pSends.length > 0 && (
            <div className="sdr-detail-row">
              <div className="sdr-detail-label">Send History</div>
              {pSends.map(s => {
                const date = s.sent_at ? new Date(s.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
                const cls  = s.status === 'replied' ? 'sdr-status--replied' : s.status === 'bounced' ? 'sdr-status--bounced' : 'sdr-status--sent'
                return (
                  <div key={s.id} className="sdr-detail-value" style={{ marginTop: 'var(--spacing-xs)' }}>
                    <span className={'sdr-status-badge ' + cls}>{s.status || 'sent'}</span>
                    {date && <span style={{ color: 'var(--gray)', marginLeft: 'var(--spacing-6)' }}>{date}</span>}
                    {s.subject && <> — {s.subject}</>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="sdr-detail-footer">
          {p.em && <button className="btn btn-ghost btn-sm" onClick={copyEmail}>Copy Email</button>}
          {onRefresh && (
            <button className="sdr-refresh-btn" aria-label="Refresh" title="Refresh" disabled={refreshing} onClick={refresh}>
              {refreshing ? '\u2026' : '\u21bb'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="sdr-detail-row">
      <div className="sdr-detail-label">{label}</div>
      <div className="sdr-detail-value">{children ?? value}</div>
    </div>
  )
}
