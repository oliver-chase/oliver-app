'use client'

import { useAuth } from '@/context/AuthContext'
import styles from './login.module.css'

export default function LoginPage() {
  const { login, isReady } = useAuth()

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.wordmark}>V.Two Ops</div>
        <div className={styles.subtitle}>Internal Operations Hub</div>
        <button
          className={styles.msBtn}
          onClick={() => login()}
          disabled={!isReady}
        >
          <MicrosoftIcon />
          Sign in with Microsoft
        </button>
      </div>
      <div className={styles.footer}>V.TWO &middot; 2026</div>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="7.5" height="7.5" fill="#f35325" />
      <rect x="9.5" y="1" width="7.5" height="7.5" fill="#81bc06" />
      <rect x="1" y="9.5" width="7.5" height="7.5" fill="#05a6f0" />
      <rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#ffba08" />
    </svg>
  )
}
