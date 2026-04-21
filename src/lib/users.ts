import { supabase } from './supabase'
import type { AppUser, PagePermission, Role } from '@/types/auth'

// supabase-js v2 never throws on failure — callers must inspect `error`.
// These wrappers throw when the write fails so admin UI can surface the problem
// instead of silently claiming success.

export async function getUser(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[users] getUser', error.message)
  return data ?? null
}

export async function upsertUser(user: Pick<AppUser, 'user_id' | 'email' | 'name'>): Promise<AppUser | null> {
  const existing = await getUser(user.user_id)
  if (existing) return existing

  const { data: byEmail, error: byEmailErr } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()
  if (byEmailErr) console.error('[users] upsertUser lookup', byEmailErr.message)

  if (byEmail) {
    const { error } = await supabase
      .from('app_users')
      .update({ user_id: user.user_id, name: user.name, updated_at: new Date().toISOString() })
      .eq('email', user.email)
    if (error) throw new Error('upsertUser update: ' + error.message)
    return getUser(user.user_id)
  }

  const { data, error } = await supabase
    .from('app_users')
    .insert({ ...user })
    .select()
    .single()
  if (error) throw new Error('upsertUser insert: ' + error.message)
  return data ?? null
}

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error('listUsers: ' + error.message)
  return data ?? []
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.from('app_users').update({ role }).eq('user_id', userId)
  if (error) throw new Error('updateUserRole: ' + error.message)
}

export async function updateUserPermissions(userId: string, page_permissions: PagePermission[]): Promise<void> {
  const { error } = await supabase.from('app_users').update({ page_permissions }).eq('user_id', userId)
  if (error) throw new Error('updateUserPermissions: ' + error.message)
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error) console.error('[users] getUserByEmail', error.message)
  return data ?? null
}

export async function updateSecurityQuestions(
  userId: string,
  q1: string, a1Hash: string,
  q2: string, a2Hash: string,
  q3: string, a3Hash: string,
): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .update({
      security_q1: q1 || null,
      security_a1: a1Hash || null,
      security_q2: q2 || null,
      security_a2: a2Hash || null,
      security_q3: q3 || null,
      security_a3: a3Hash || null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw new Error('updateSecurityQuestions: ' + error.message)
}
