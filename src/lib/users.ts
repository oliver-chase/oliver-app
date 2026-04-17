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
  const { data } = await supabase
    .from('app_users')
    .upsert({ ...user }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select()
    .single()
  if (data) return data

  // If upsert returned nothing (duplicate ignored), fetch existing
  return getUser(user.user_id)
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
