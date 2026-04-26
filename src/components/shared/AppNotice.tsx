'use client'

import type { ReactNode } from 'react'
import styles from './AppNotice.module.css'

type AppNoticeTone = 'info' | 'error' | 'warning' | 'success'

interface AppNoticeProps {
  tone?: AppNoticeTone
  title?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  role?: 'alert' | 'status'
}

export function AppNotice({
  tone = 'info',
  title,
  children,
  actions,
  className = '',
  role,
}: AppNoticeProps) {
  const toneClass = tone === 'error'
    ? styles.toneError
    : tone === 'warning'
      ? styles.toneWarning
      : tone === 'success'
        ? styles.toneSuccess
        : styles.toneInfo

  const resolvedRole = role || (tone === 'error' ? 'alert' : 'status')
  const mergedClassName = [styles.notice, toneClass, className].filter(Boolean).join(' ')

  return (
    <div className={mergedClassName} role={resolvedRole} aria-live={resolvedRole === 'alert' ? 'assertive' : 'polite'}>
      {title && <div className={styles.title}>{title}</div>}
      <div>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  )
}
