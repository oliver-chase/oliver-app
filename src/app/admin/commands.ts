import type { OliverAction } from '@/components/shared/OliverContext'

export type CommandMeta = Omit<OliverAction, 'run'>

export const ADMIN_COMMANDS: CommandMeta[] = [
  {
    id: 'upsert-admin-user',
    label: 'Add / Upsert User',
    group: 'Create',
    hint: 'Create or update an app user record',
    aliases: ['add user', 'create user', 'update user'],
  },
  {
    id: 'set-user-role',
    label: 'Set User Role',
    group: 'Edit',
    hint: 'Change user role between user/admin',
    aliases: ['change user role', 'make admin', 'remove admin'],
  },
  {
    id: 'grant-user-permission',
    label: 'Grant Module Permission',
    group: 'Edit',
    hint: 'Grant module access to a user',
    aliases: ['grant access', 'add module permission', 'allow module'],
  },
  {
    id: 'revoke-user-permission',
    label: 'Revoke Module Permission',
    group: 'Edit',
    hint: 'Revoke module access from a user',
    aliases: ['remove access', 'revoke access', 'remove module permission'],
  },
  {
    id: 'update-design-token',
    label: 'Update Design Token',
    group: 'Edit',
    hint: 'Set a design token override value',
    aliases: ['edit token', 'change token', 'design token override'],
  },
  {
    id: 'tab-users',
    label: 'Open Users',
    group: 'Quick',
    hint: 'Manage user access and roles',
    aliases: ['user manager', 'manage users', 'open user access'],
  },
  {
    id: 'open-design-system',
    label: 'Open Design System',
    group: 'Quick',
    hint: 'Open the admin design system workspace',
    aliases: ['design system', 'open design system', 'design tokens', 'component library'],
  },
]
