import { supabase } from './supabase'
import type { AppUser, PagePermission, Role } from '@/types/auth'

export async function getUser(userId: string): Promise<AppUser | null> {
  const { data } = await supabase
    .from('app_users')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data ?? null
}

export async function upsertUser(user: Pick<AppUser, 'user_id' | 'email' | 'name'>): Promise<AppUser | null> {
  // Fast path — row already exists with this user_id (real OID)
  const existing = await getUser(user.user_id)
  if (existing) return existing

  // First login after seeding: row exists by email but user_id is a placeholder.
  // Update user_id to the real Azure AD OID so subsequent logins hit the fast path.
  const { data: byEmail } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()

  if (byEmail) {
    await supabase
      .from('app_users')
      .update({ user_id: user.user_id, name: user.name, updated_at: new Date().toISOString() })
      .eq('email', user.email)
    return getUser(user.user_id)
  }

  // Brand-new user — insert with defaults (role='user', page_permissions='{}')
  const { data } = await supabase
    .from('app_users')
    .insert({ ...user })
    .select()
    .single()
  return data ?? null
}

export async function listUsers(): Promise<AppUser[]> {
  const { data } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  await supabase.from('app_users').update({ role }).eq('user_id', userId)
}

export async function updateUserPermissions(userId: string, page_permissions: PagePermission[]): Promise<void> {
  await supabase.from('app_users').update({ page_permissions }).eq('user_id', userId)
}
