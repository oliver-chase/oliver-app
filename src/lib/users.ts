import type { AppUser, PagePermission, Role } from '@/types/auth'

// app_users is read/written only through /api/users (CF Function, service role).
// Supabase RLS denies client (anon/authenticated) access to the table.
// Never import supabase-js here — the browser must not touch app_users directly.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${init?.method || 'GET'} ${path} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

export async function getUser(userId: string): Promise<AppUser | null> {
  return request<AppUser | null>(`/api/users?user_id=${encodeURIComponent(userId)}`)
}

export async function upsertUser(
  user: Pick<AppUser, 'user_id' | 'email' | 'name'>,
): Promise<AppUser | null> {
  return request<AppUser | null>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  })
}

export async function listUsers(): Promise<AppUser[]> {
  return request<AppUser[]>('/api/users')
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  await request<{ ok: true }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify({ user_id: userId, role }),
  })
}

export async function updateUserPermissions(
  userId: string,
  page_permissions: PagePermission[],
): Promise<void> {
  await request<{ ok: true }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify({ user_id: userId, page_permissions }),
  })
}
