import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const ADMIN_COMMANDS: CommandMeta[] = [
  {
    id: 'upsert-admin-user',
    label: 'Add / Upsert User',
    group: 'Create',
    hint: 'Create or update an app user record',
  },
  {
    id: 'set-user-role',
    label: 'Set User Role',
    group: 'Edit',
    hint: 'Change user role between user/admin',
  },
  {
    id: 'grant-user-permission',
    label: 'Grant Module Permission',
    group: 'Edit',
    hint: 'Grant module access to a user',
  },
  {
    id: 'revoke-user-permission',
    label: 'Revoke Module Permission',
    group: 'Edit',
    hint: 'Revoke module access from a user',
  },
  {
    id: 'update-design-token',
    label: 'Update Design Token',
    group: 'Edit',
    hint: 'Set a design token override value',
  },
  {
    id: 'tab-users',
    label: 'Open Users',
    group: 'Quick',
    hint: 'Manage user access and roles',
  },
  {
    id: 'tab-tokens',
    label: 'Open Design Tokens',
    group: 'Quick',
    hint: 'Review and edit design token values',
  },
  {
    id: 'tab-components',
    label: 'Open Components',
    group: 'Quick',
    hint: 'Browse shared component docs',
  },
]
