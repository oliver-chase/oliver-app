export interface DesignComponentRecord {
  id: string
  name: string
  group: string
  source: string
  status: 'active' | 'planned' | 'deprecated'
  notes: string
}

export const DESIGN_COMPONENT_CATALOG: DesignComponentRecord[] = [
  {
    id: 'hub-module-list',
    name: 'HubModuleList',
    group: 'Hub',
    source: 'src/components/hub/HubModuleList.tsx',
    status: 'active',
    notes: 'Adaptive module layout (<=4 single column, 5+ split columns).',
  },
  {
    id: 'hub-module-card',
    name: 'ModuleCard',
    group: 'Hub',
    source: 'src/components/shared/ModuleCard.tsx',
    status: 'active',
    notes: 'Standard module navigation card reused by hub and admin component library.',
  },
  {
    id: 'module-sidebar-header',
    name: 'ModuleSidebarHeader',
    group: 'Layout',
    source: 'src/components/shared/ModuleSidebarHeader.tsx',
    status: 'active',
    notes: 'Shared module sidebar title + back-link header contract.',
  },
  {
    id: 'module-topbar',
    name: 'ModuleTopbar',
    group: 'Layout',
    source: 'src/components/shared/ModuleTopbar.tsx',
    status: 'active',
    notes: 'Shared module topbar shell with hamburger and right-slot actions.',
  },
  {
    id: 'app-notice',
    name: 'AppNotice',
    group: 'Feedback',
    source: 'src/components/shared/AppNotice.tsx',
    status: 'active',
    notes: 'Shared status/alert banner used across hub, admin, and slides surfaces.',
  },
  {
    id: 'admin-shell',
    name: 'AdminShell',
    group: 'Admin',
    source: 'src/components/admin/AdminShell.tsx',
    status: 'active',
    notes: 'Shared admin sidebar/topbar shell for admin pages.',
  },
  {
    id: 'admin-entry-button',
    name: 'AdminEntryButton',
    group: 'Admin',
    source: 'src/components/admin/AdminEntryButton.tsx',
    status: 'active',
    notes: 'Top-left global entry for admin-capable users.',
  },
  {
    id: 'slides-html-import',
    name: 'Slide HTML Import',
    group: 'Slides',
    source: 'src/components/slides/html-import.ts',
    status: 'active',
    notes: 'HTML-to-component conversion foundation.',
  },
]
