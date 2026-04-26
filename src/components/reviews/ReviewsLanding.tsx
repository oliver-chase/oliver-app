'use client'

const FOCUS_AREAS = [
  {
    name: 'Legacy',
    question: 'What are you building or improving that creates value beyond the immediate task?',
  },
  {
    name: 'Craftsmanship / Quality',
    question: 'How are you improving the quality, reliability, and clarity of what you deliver?',
  },
  {
    name: 'Client Focus',
    question: 'How are you helping clients feel informed, supported, and successful?',
  },
  {
    name: 'Growth & Ownership',
    question: 'How are you expanding ownership, impact, and continuous improvement?',
  },
]

export function ReviewsLanding() {
  return (
    <div className="review-shell">
      <div className="coming-soon">
        <div className="coming-soon-badge">Workspace Live</div>
        <div className="coming-soon-title">Self-Led Growth &amp; Review System</div>
        <div className="coming-soon-sub">
          Shared chatbot/design-system standards are active with module-local goals, updates, and reflection workflows.
        </div>
      </div>

      <section id="reviews-focus-areas" className="review-section">
        <h2 className="review-section-title">Focus Areas</h2>
        <p className="review-section-subtitle">
          Company-wide framework for goals, updates, evidence, and reflections.
        </p>
        <div className="review-grid">
          {FOCUS_AREAS.map(area => (
            <article key={area.name} className="card review-card">
              <h3 className="review-card-title">{area.name}</h3>
              <p className="review-card-copy">{area.question}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="reviews-cycles" className="review-section">
        <h2 className="review-section-title">Review Cycles</h2>
        <p className="review-section-subtitle">
          Continuous capture during the year, then quarterly and annual synthesis for reviewers.
        </p>
        <div className="card review-cycle-card">
          <ul className="review-bullets">
            <li>Continuous capture: goals, actions, wins, lessons, and feedback.</li>
            <li>Quarterly prompts: structured reflection and progress check-ins.</li>
            <li>Annual self-review: consolidated packet for reviewer preparation.</li>
            <li>Future-ready reviewer assignment and permission model.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
