import Link from 'next/link'
import styles from './hub.module.css'

export default function HubPage() {
  return (
    <>
      <div className={styles.hub}>
        <div className={styles.brand}>
          <div className={styles.wordmark}>V.Two Ops</div>
          <div className={styles.subtitle}>Internal Operations Hub</div>
        </div>

        <div className={styles.cards}>
          <Link href="/hr" className={styles.card}>
            <div className={styles.cardName}>HR &amp; People Ops</div>
            <div className={styles.cardDesc}>Applicant tracking, employee directory, onboarding, and device management.</div>
          </Link>

          <Link href="/accounts" className={styles.card}>
            <div className={styles.cardName}>Account Strategy &amp; Planning</div>
            <div className={styles.cardDesc}>Strategic account planning, stakeholder mapping, meeting notes, and action tracking.</div>
          </Link>

          <Link href="/sdr" className={styles.card}>
            <div className={styles.cardName}>SDR &amp; Outreach</div>
            <div className={styles.cardDesc}>Prospect pipeline, outreach sequences, and engagement tracking.</div>
          </Link>

          <div className={`${styles.card} ${styles.disabled}`}>
            <div className={styles.cardName}>
              CRM &amp; Business Development
              <span className={styles.badge}>Coming Soon</span>
            </div>
            <div className={styles.cardDesc}>Client relationships, opportunity tracking, and proposal management.</div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>V.TWO &middot; 2026</div>
    </>
  )
}
