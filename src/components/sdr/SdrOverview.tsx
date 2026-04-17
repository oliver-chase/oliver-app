'use client'
import type { SdrProspect, SdrApprovalItem, SdrSend } from './types'
import { PROSPECT_STATUS_LABEL, CLOSED_STATUSES } from './types'

const PIPELINE_ORDER = ['new','email_discovered','draft_generated','awaiting_approval','email_sent','followup_due','ooo_pending','closed_positive','closed_negative','closed_no_reply','bounced_no_alt']

interface Props {
  prospects: SdrProspect[]
  approvalItems: SdrApprovalItem[]
  sends: SdrSend[]
  onGoToDrafts: () => void
}

export default function SdrOverview({ prospects, approvalItems, sends, onGoToDrafts }: Props) {
  const total = prospects.length
  const active = prospects.filter(p => !CLOSED_STATUSES.has(p.st)).length
  const pending = approvalItems.filter(x => x.status === 'pending_approval').length
  const replied = sends.filter(s => s.status === 'replied').length
  const rate = sends.length > 0 ? Math.round((replied / sends.length) * 100) : 0

  const statusBreakdown: Record<string, number> = {}
  prospects.forEach(p => { statusBreakdown[p.st] = (statusBreakdown[p.st] || 0) + 1 })

  return (
    <div id="sdr-section-overview" className="sdr-section">
      <div className="sdr-section-header"><h2>Overview</h2></div>

      <div className="sdr-stat-row">
        <div className="sdr-stat">
          <span className="sdr-stat-value">{total}</span>
          <span className="sdr-stat-label">Total Prospects</span>
        </div>
        <div className="sdr-stat">
          <span className="sdr-stat-value">{active}</span>
          <span className="sdr-stat-label">Active</span>
        </div>
        <div className="sdr-stat">
          <span className="sdr-stat-value">{sends.length}</span>
          <span className="sdr-stat-label">Sent</span>
        </div>
        <div className="sdr-stat">
          <span className="sdr-stat-value">{rate}%</span>
          <span className="sdr-stat-label">Reply Rate</span>
        </div>
      </div>

      {pending > 0 && (
        <div className="sdr-alert">
          <span className="sdr-alert-text">
            {pending} draft{pending !== 1 ? 's' : ''} awaiting approval
          </span>
          <button className="btn btn-primary btn-sm" onClick={onGoToDrafts}>Review Drafts</button>
        </div>
      )}

      {PIPELINE_ORDER.some(s => statusBreakdown[s]) && (
        <div className="sdr-overview-breakdown">
          <h3>Pipeline</h3>
          <div className="sdr-pipeline">
            {PIPELINE_ORDER.filter(s => statusBreakdown[s]).map(s => (
              <div key={s} className="sdr-pipeline-row">
                <span className="sdr-pipeline-label">{PROSPECT_STATUS_LABEL[s] || s}</span>
                <span className="sdr-pipeline-count">{statusBreakdown[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
