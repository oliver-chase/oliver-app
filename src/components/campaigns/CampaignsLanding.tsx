'use client'

const WORKSPACE_CARDS = [
  {
    title: 'Campaign Dashboard',
    detail: 'Role-aware at-a-glance status for review queue, available content, my claims, and today posting activity.',
  },
  {
    title: 'Content Lifecycle',
    detail: 'Draft -> Needs Review -> Unclaimed -> Claimed -> Posted with backend-enforced transitions and audit history.',
  },
  {
    title: 'Claim and Posting',
    detail: 'Self-claiming-only design with default schedule/channel, calendar reminder support, and mark-posted closure.',
  },
  {
    title: 'Reporting and Export',
    detail: 'Campaign execution reporting with date/campaign filters and export-ready summaries.',
  },
]

export function CampaignsLanding() {
  return (
    <div className="campaign-shell">
      <div className="coming-soon">
        <div className="coming-soon-badge">Workspace Live</div>
        <div className="coming-soon-title">Campaign Content &amp; Posting</div>
        <div className="coming-soon-sub">
          Campaigns, content lifecycle actions, review queue, claiming, calendar reminders, and reporting are now active.
        </div>
      </div>

      <section id="campaigns-overview" className="campaign-section">
        <h2 className="campaign-section-title">Workspace Overview</h2>
        <p className="campaign-section-subtitle">
          This module will provide campaign planning, content execution lifecycle, reminders, and reporting in one workflow.
        </p>
        <div className="campaign-grid">
          {WORKSPACE_CARDS.map(card => (
            <article key={card.title} className="card campaign-card">
              <h3 className="campaign-card-title">{card.title}</h3>
              <p className="campaign-card-copy">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
