'use client'

import { ModuleCard } from '@/components/hub/ModuleCard'
import type { ModuleDefinition } from '@/modules/registry'
import styles from './HubModuleList.module.css'

interface HubModuleListProps {
  modules: ModuleDefinition[]
}

function splitColumns(modules: ModuleDefinition[]) {
  if (modules.length <= 4) {
    return { left: modules, right: [] as ModuleDefinition[] }
  }
  return {
    left: modules.slice(0, 4),
    right: modules.slice(4),
  }
}

export function HubModuleList({ modules }: HubModuleListProps) {
  const { left, right } = splitColumns(modules)
  const twoColumn = right.length > 0

  return (
    <div className={styles.wrap}>
      <div
        className={styles.grid}
        data-hub-columns={twoColumn ? '2' : '1'}
      >
        <div className={styles.column} data-hub-col="left">
          {left.map(module => (
            <ModuleCard
              key={module.id}
              name={module.name}
              description={module.description}
              href={module.href}
              comingSoon={module.comingSoon}
            />
          ))}
        </div>

        {twoColumn && (
          <div className={styles.column} data-hub-col="right">
            {right.map(module => (
              <ModuleCard
                key={module.id}
                name={module.name}
                description={module.description}
                href={module.href}
                comingSoon={module.comingSoon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

