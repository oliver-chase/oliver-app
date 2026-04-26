'use client'

import { useState } from 'react'
import AppBadge from '@/components/shared/AppBadge'
import AppChip from '@/components/shared/AppChip'
import { ModuleCard } from '@/components/shared/ModuleCard'
import styles from './admin.module.css'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.clSection}>
      <div className={styles.clSectionTitle}>{title}</div>
      <div className={styles.clSectionContent}>{children}</div>
    </div>
  )
}

export function ComponentLibrary() {
  const [chips, setChips] = useState(['Design', 'System', 'Token'])

  return (
    <div className={styles.componentLibrary}>
      <Section title="Badges">
        <div className={styles.clRow}>
          {(['active', 'open', 'pursuing', 'won', 'lost', 'complete', 'identified', 'on-hold'] as const).map(v => (
            <AppBadge key={v} label={v} variant={v} />
          ))}
        </div>
      </Section>

      <Section title="Chips">
        <div className={styles.clRow}>
          {chips.map(c => (
            <AppChip key={c} label={c} onRemove={() => setChips(prev => prev.filter(x => x !== c))} />
          ))}
          {chips.length === 0 && (
            <button className="btn btn--secondary btn--sm" onClick={() => setChips(['Design', 'System', 'Token'])}>
              Reset
            </button>
          )}
        </div>
      </Section>

      <Section title="Buttons">
        <div className={styles.clRow}>
          <button className="btn btn--primary">Primary</button>
          <button className="btn btn--secondary">Secondary</button>
          <button className="btn btn--danger">Danger</button>
          <button className="btn btn--primary btn--sm">Small</button>
          <button className="btn btn--primary" disabled>Disabled</button>
        </div>
      </Section>

      <Section title="Module Card">
        <div style={{ maxWidth: 360 }}>
          <ModuleCard
            name="Example Module"
            description="This is an example module card from the component library."
            href="#"
          />
        </div>
      </Section>

      <Section title="Module Card — Coming Soon">
        <div style={{ maxWidth: 360 }}>
          <ModuleCard
            name="Future Module"
            description="Not yet available — shown only to admins."
            href="#"
            comingSoon
          />
        </div>
      </Section>
    </div>
  )
}
