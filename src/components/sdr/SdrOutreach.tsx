'use client'
import type { SdrSend } from './types'

interface Props { sends: SdrSend[] }

export default function SdrOutreach({ sends }: Props) {
  const sorted = [...sends].sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
  const replied = sends.filter(s => s.status === 'replied').length
  const rate = sends.length > 0 ? Math.round((replied / sends.length) * 100) : 0

  return (
    <div className="page page--split">
      <div className="section-header">
        <div className="page-header">
          <div>
            <div className="page-title">Outreach</div>
            <div className="page-subtitle">{sends.length} send{sends.length !== 1 ? 's' : ''} &middot; {rate}% reply rate</div>
          </div>
        </div>
      </div>
      <div className="page-body">

      {sends.length > 0 && (
        <div className="sdr-stat-row">
          <div className="sdr-stat"><span className="sdr-stat-value">{sends.length}</span><span className="sdr-stat-label">Total Sent</span></div>
          <div className="sdr-stat"><span className="sdr-stat-value">{replied}</span><span className="sdr-stat-label">Replies</span></div>
          <div className="sdr-stat"><span className="sdr-stat-value">{rate}%</span><span className="sdr-stat-label">Reply Rate</span></div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="sdr-empty">No sends yet.</div>
      ) : (
        <div className="sdr-send-list">
          {sorted.map(s => {
            const statusCls   = s.status === 'replied' ? 'replied' : s.status === 'bounced' ? 'bounced' : 'sent'
            const statusLabel = s.status === 'replied' ? 'Replied' : s.status === 'bounced' ? 'Bounced' : 'Sent'
            const sentDate    = s.sent_at ? new Date(s.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
            return (
              <div key={s.id} className="sdr-send-card">
                <div className="sdr-send-header">
                  <div className="sdr-send-who">
                    <span className="sdr-draft-name">{s.nm || s.fn || 'Unknown'}</span>
                    {s.co && <span className="sdr-draft-co">{s.co}</span>}
                    {s.ti && <span className="sdr-prospect-meta">{s.ti}</span>}
                  </div>
                  <div className="sdr-send-right">
                    <span className={'sdr-status-badge sdr-status--' + statusCls}>{statusLabel}</span>
                    {sentDate && <span className="sdr-send-date">{sentDate}</span>}
                  </div>
                </div>
                {s.subject && <div className="sdr-draft-subject">{s.subject}</div>}
                {s.em && <div className="sdr-prospect-email">{s.em}</div>}
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
