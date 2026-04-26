import type { OliverFlow } from '@/components/shared/OliverContext'
import type { AppUser, PagePermission } from '@/types/auth'
import { upsertUser, updateUserPermissions, updateUserRole, type UserRequestActor } from '@/lib/users'
import { upsertToken } from '@/lib/tokens'
import { getPermissionModules } from '@/modules/registry'

type Ctx = {
  users: AppUser[]
  refetch: () => Promise<void> | void
  actorIdentity?: UserRequestActor
}

const PERMISSIONS: PagePermission[] = getPermissionModules().map(module => module.id)
const TOKEN_NAMES = [
  '--color-brand-purple',
  '--color-brand-pink',
  '--color-brand-pink-light',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-placeholder',
  '--color-bg-page',
  '--color-bg-card',
  '--color-bg-input',
  '--color-bg-hover',
  '--color-border',
  '--color-border-focus',
  '--color-nav-bg',
  '--color-nav-bg-deep',
  '--color-nav-text',
  '--color-nav-text-muted',
  '--color-nav-text-faint',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-full',
]

const asString = (v: unknown) => (v == null ? '' : String(v).trim())

function parsePermissions(value: string): PagePermission[] {
  const wanted = value
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
  return PERMISSIONS.filter(p => wanted.includes(p))
}

function tokenCategory(name: string): string {
  if (name.startsWith('--color-brand')) return 'brand'
  if (name.startsWith('--color-text')) return 'text'
  if (name.startsWith('--color-bg')) return 'background'
  if (name.startsWith('--color-border')) return 'border'
  if (name.startsWith('--color-nav')) return 'nav'
  if (name.startsWith('--radius')) return 'radius'
  return 'other'
}

export function buildAdminFlows(ctx: Ctx): OliverFlow[] {
  const { users, refetch, actorIdentity } = ctx

  return [
    {
      id: 'upsert-admin-user',
      label: 'Add / Upsert User',
      aliases: ['add user', 'create user', 'upsert user'],
      steps: [
        { id: 'user_id', prompt: 'User ID (AAD oid/sub)?', kind: 'text', placeholder: 'aad-user-id' },
        { id: 'email', prompt: 'Email?', kind: 'text', placeholder: 'name@company.com' },
        { id: 'name', prompt: 'Display name? (optional)', kind: 'text', placeholder: 'Full name', optional: true },
        {
          id: 'role', prompt: 'Role? (optional)', kind: 'choice', optional: true,
          choices: [
            { label: 'user', value: 'user' },
            { label: 'admin', value: 'admin' },
          ],
        },
        {
          id: 'permissions',
          prompt: 'Permissions CSV if role=user (optional). Example: accounts,hr,sdr',
          kind: 'text',
          placeholder: 'accounts,hr',
          optional: true,
        },
      ],
      run: async (answers) => {
        const userId = asString(answers.user_id)
        const email = asString(answers.email)
        if (!userId || !email) return 'user_id and email are required.'
        const name = asString(answers.name)
        const role = asString(answers.role)
        const permissions = parsePermissions(asString(answers.permissions))
        await upsertUser({ user_id: userId, email, name }, undefined, actorIdentity)
        if (role === 'admin' || role === 'user') await updateUserRole(userId, role, actorIdentity)
        if (permissions.length > 0) await updateUserPermissions(userId, permissions, actorIdentity)
        await refetch()
        return `User upserted: ${email}.`
      },
    },
    {
      id: 'set-user-role',
      label: 'Set User Role',
      aliases: ['change role', 'make admin', 'make user'],
      steps: [
        {
          id: 'user_id', prompt: 'Which user?', kind: 'entity',
          options: () => users.map(user => ({
            label: `${user.name || user.email} — ${user.email} (${user.role}${user.is_owner ? ', owner' : ''})`,
            value: user.user_id,
          })),
        },
        {
          id: 'role', prompt: 'Set role to?', kind: 'choice',
          choices: [
            { label: 'admin', value: 'admin' },
            { label: 'user', value: 'user' },
          ],
        },
      ],
      run: async (answers) => {
        const userId = asString(answers.user_id)
        const role = asString(answers.role)
        const user = users.find(u => u.user_id === userId)
        if (user?.is_owner) return 'Owner role is immutable.'
        if (role !== 'admin' && role !== 'user') return 'Invalid role.'
        await updateUserRole(userId, role, actorIdentity)
        await refetch()
        return `Role updated to ${role}.`
      },
    },
    {
      id: 'grant-user-permission',
      label: 'Grant Module Permission',
      aliases: ['grant permission', 'allow module access'],
      steps: [
        {
          id: 'user_id', prompt: 'Which user?', kind: 'entity',
          options: () => users.map(user => ({
            label: `${user.name || user.email} — ${user.email}`,
            value: user.user_id,
          })),
        },
        {
          id: 'permission', prompt: 'Which module permission?', kind: 'choice',
          choices: PERMISSIONS.map(p => ({ label: p, value: p })),
        },
      ],
      run: async (answers) => {
        const userId = asString(answers.user_id)
        const permission = asString(answers.permission) as PagePermission
        const user = users.find(u => u.user_id === userId)
        if (!user) return 'User not found.'
        if (user.is_owner) return 'Owner permissions are immutable.'
        if (user.role === 'admin') return 'Admins already have all module access.'
        const updated = Array.from(new Set([...user.page_permissions, permission]))
        await updateUserPermissions(userId, updated, actorIdentity)
        await refetch()
        return `Granted ${permission} to ${user.email}.`
      },
    },
    {
      id: 'revoke-user-permission',
      label: 'Revoke Module Permission',
      aliases: ['remove permission', 'revoke access'],
      steps: [
        {
          id: 'user_id', prompt: 'Which user?', kind: 'entity',
          options: () => users.map(user => ({
            label: `${user.name || user.email} — ${user.email}`,
            value: user.user_id,
          })),
        },
        {
          id: 'permission', prompt: 'Which module permission to revoke?', kind: 'choice',
          choices: PERMISSIONS.map(p => ({ label: p, value: p })),
        },
      ],
      run: async (answers) => {
        const userId = asString(answers.user_id)
        const permission = asString(answers.permission)
        const user = users.find(u => u.user_id === userId)
        if (!user) return 'User not found.'
        if (user.is_owner) return 'Owner permissions are immutable.'
        if (user.role === 'admin') return 'Downgrade role from admin first if you need scoped permissions.'
        const updated = user.page_permissions.filter(p => p !== permission)
        await updateUserPermissions(userId, updated, actorIdentity)
        await refetch()
        return `Revoked ${permission} from ${user.email}.`
      },
    },
    {
      id: 'update-design-token',
      label: 'Update Design Token',
      aliases: ['set token', 'change token', 'edit design token'],
      steps: [
        {
          id: 'token_name', prompt: 'Which token?', kind: 'choice',
          choices: TOKEN_NAMES.map(name => ({ label: name, value: name })),
        },
        { id: 'token_value', prompt: 'New token value?', kind: 'text', placeholder: 'var(--color-brand-pink) or var(--spacing-10)' },
      ],
      run: async (answers) => {
        const tokenName = asString(answers.token_name)
        const tokenValue = asString(answers.token_value)
        if (!tokenName || !tokenValue) return 'Token name and value are required.'
        await upsertToken(tokenName, tokenValue, tokenCategory(tokenName))
        await refetch()
        return `Updated ${tokenName}.`
      },
    },
  ]
}
