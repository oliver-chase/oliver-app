'use client'

import Link from 'next/link'
import styles from './ModuleCard.module.css'

interface ModuleCardProps {
  name: string
  description: string
  href: string
  comingSoon?: boolean
}

export function ModuleCard({ name, description, href, comingSoon }: ModuleCardProps) {
  if (comingSoon) {
    return (
      <div className={`${styles.card} ${styles.disabled}`}>
        <div className={styles.cardName}>
          {name}
          <span className={styles.badge}>Coming Soon</span>
        </div>
        <div className={styles.cardDesc}>{description}</div>
      </div>
    )
  }

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cardName}>{name}</div>
      <div className={styles.cardDesc}>{description}</div>
    </Link>
  )
}
