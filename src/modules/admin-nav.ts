export interface AdminNavItem {
  id: string
  label: string
  href: string
  description: string
  enabledByDefault?: boolean
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Admin Dashboard',
    href: '/admin',
    description: 'User roles, permissions, and privileged workspace access.',
  },
  {
    id: 'design-system',
    label: 'Design System',
    href: '/design-system',
    description: 'Reference and edit workspace for design tokens and component contracts.',
  },
]

export function getAdminNavItems(): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter(item => item.enabledByDefault !== false)
}
