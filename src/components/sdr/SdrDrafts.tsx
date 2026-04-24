'use client'
import { useState } from 'react'
import type { SdrApprovalItem } from './types'

interface Batch {
  date: string
  items: SdrApprovalItem[]
}

function approvalBatches(items: SdrApprovalItem[]): Batch[] {
  const map: Record<string, SdrApprovalItem[]> = {}
  items.forEach(x => {
    const d = x.batch_date || x.created_at?.slice(0, 10) || 'Unknown'
    if (!map[d]) map[d] = []
    map[d].push(x)
  })
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

interface Props {
  approvalItems: SdrApprovalItem[]
  onItemsChange: (items: SdrApprovalItem[]) => void
  actor?: {
    userId?: string
    userEmail?: string
  }
}

export default function SdrDrafts({ approvalItems, onItemsChange, actor }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = approvalItems.filter(x => x.status === 'pending_approval').length
  const batches = approvalBatches(approvalItems)

  async function handleAction(itemId: string, action: 'approve' | 'reject') {
    setLoading(itemId + action)
    setError(null)
    try {
      const r = await fetch('/api/sdr-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          action,
          user_id: actor?.userId || undefined,
          user_email: actor?.userEmail || undefined,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Request failed')
      }
      onItemsChange(approvalItems.map(x =>
        x.id === itemId ? { ...x, status: action === 'approve' ? 'approved' : 'rejected' } : x
      ))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Draft action failed.'
      setError(msg)
      console.error('[SDR] draft action:', e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page page--split">
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Drafts</div>
            {pending > 0 && <div className="page-subtitle">{pending} pending approval</div>}
            {error && <div className="iv-date-past" style={{ marginTop: 'var(--spacing-xs)' }}>{error}</div>}
          </div>
        </div>
      </div>
      <div className="page-body">

      {batches.length === 0 ? (
        <div className="sdr-empty">No drafts yet. Run the daily draft step in v-two-sdr to generate.</div>
      ) : batches.map(batch => {
        const approvedN = batch.items.filter(x => x.status === 'approved').length
        const rejectedN = batch.items.filter(x => x.status === 'rejected').length
        const pendingN  = batch.items.filter(x => x.status === 'pending_approval').length
        const sentN     = batch.items.filter(x => x.status === 'sent').length
        return (
          <div key={batch.date} className="sdr-batch-card">
            <div className="sdr-batch-header">
              <span className="sdr-batch-date">{batch.date}</span>
              <div className="sdr-batch-meta">
                {pendingN > 0  && <span className="sdr-batch-stat pending">{pendingN} pending</span>}
                {approvedN > 0 && <span className="sdr-batch-stat approved">{approvedN} approved</span>}
                {sentN > 0     && <span className="sdr-batch-stat sent">{sentN} sent</span>}
                {rejectedN > 0 && <span className="sdr-batch-stat rejected">{rejectedN} rejected</span>}
              </div>
            </div>
            {batch.items.map(item => {
              const isPending  = item.status === 'pending_approval'
              const isApproved = item.status === 'approved'
              const isRejected = item.status === 'rejected'
              const statusCls  = isPending ? 'pending' : isApproved ? 'approved' : isRejected ? 'rejected' : 'sent'
              const statusLabel = isPending ? 'Pending' : isApproved ? 'Queued for Send' : isRejected ? 'Rejected' : 'Sent'
              const busy = loading !== null
              return (
                <div key={item.id} className="sdr-draft-card">
                  <div className="sdr-draft-header">
                    <div className="sdr-draft-who">
                      <span className="sdr-draft-name">{item.fn || item.nm || 'Unknown'}</span>
                      {item.co && <span className="sdr-draft-co">{item.co}</span>}
                      {item.touch && <span className="sdr-touch-chip">{item.touch}</span>}
                    </div>
                    <span className={'sdr-status-badge sdr-status--' + statusCls}>{statusLabel}</span>
                  </div>
                  {item.subject && <div className="sdr-draft-subject">{item.subject}</div>}
                  {item.body && <div className="sdr-draft-body">{item.body}</div>}
                  {item.gen === 'llm' && <div className="sdr-draft-gen">AI-generated</div>}
                  {isPending && (
                    <div className="sdr-draft-actions">
                      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => handleAction(item.id, 'approve')}>
                        {loading === item.id + 'approve' ? 'Approving...' : 'Approve'}
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handleAction(item.id, 'reject')}>
                        {loading === item.id + 'reject' ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
      </div>
    </div>
  )
}
