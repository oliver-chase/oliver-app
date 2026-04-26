'use client'
import { useState, useMemo } from 'react'
import { useRegisterOliver } from '@/components/shared/OliverContext'
import type { OliverConfig } from '@/components/shared/OliverContext'
import { CRM_COMMANDS } from '@/app/crm/commands'
import { buildModuleOliverConfig } from '@/modules/oliver-config'
import { useModuleAccess } from '@/modules/use-module-access'
import { ModuleSidebarHeader } from '@/components/shared/ModuleSidebarHeader'
import { ModuleTopbar } from '@/components/shared/ModuleTopbar'

export default function CrmPage() {
  const { allowRender } = useModuleAccess('crm')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() { setSidebarOpen(o => !o) }
  function closeSidebar() { setSidebarOpen(false) }

  const oliverConfig = useMemo<OliverConfig>(() => (
    buildModuleOliverConfig('crm', {
      greeting: "Hi, I'm Oliver. CRM & Business Development is in the backlog — ask what it will cover or when it's expected.",
      actions: CRM_COMMANDS.map(c => ({ ...c, run: () => {} })),
      quickConvos: [
        'What will CRM include?',
        'When does CRM ship?',
      ],
    })
  ), [])

  useRegisterOliver(oliverConfig)

  if (!allowRender) return null

  return (
    <div className="app show-hamburger">
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' open' : '')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <nav className="app-sidebar" id="sidebar" aria-label="CRM navigation">
        <ModuleSidebarHeader title="CRM & Business Dev" />
        <div className="app-sidebar-section">
          <div className="app-sidebar-item active" role="button" tabIndex={0}>Overview</div>
        </div>
      </nav>
      <div className="main">
        <ModuleTopbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <main className="page" id="main-content">
          <div className="coming-soon">
            <div className="coming-soon-badge">Coming Soon</div>
            <div className="coming-soon-title">CRM &amp; Business Development</div>
            <div className="coming-soon-sub">Client relationships, opportunity tracking, and proposal management.</div>
          </div>
        </main>
      </div>
    </div>
  )
}
