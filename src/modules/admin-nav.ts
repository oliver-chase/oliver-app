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
    description: 'User management, token overrides, and component controls.',
  },
  {
    id: 'design-system',
    label: 'Design System',
    href: '/design-system',
    description: 'Token, component, and layout contract reference.',
  },
]

export function getAdminNavItems(): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter(item => item.enabledByDefault !== false)
}

