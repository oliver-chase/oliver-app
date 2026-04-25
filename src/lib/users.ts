import type { AppUser, PagePermission, Role } from '@/types/auth'

// app_users is read/written only through /api/users (CF Function, service role).
// Supabase RLS denies client (anon/authenticated) access to the table.
// Never import supabase-js here — the browser must not touch app_users directly.

export type UserRequestActor = {
  userId?: string | null
  email?: string | null
}

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

function addActorParams(params: URLSearchParams, actor?: UserRequestActor) {
  const actorEmail = actor?.email?.trim()
  const actorUserId = actor?.userId?.trim()
  if (actorEmail) params.set('actor_email', actorEmail)
  if (actorUserId) params.set('actor_user_id', actorUserId)
}

function withActorBody<T extends Record<string, unknown>>(body: T, actor?: UserRequestActor) {
  const next: Record<string, unknown> = { ...body }
  const actorEmail = actor?.email?.trim()
  const actorUserId = actor?.userId?.trim()
  if (actorEmail) next.actor_email = actorEmail
  if (actorUserId) next.actor_user_id = actorUserId
  return next
}

export async function getUser(userId: string, actor?: UserRequestActor): Promise<AppUser | null> {
  const params = new URLSearchParams({ user_id: userId })
  addActorParams(params, actor)
  return request<AppUser | null>(`/api/users?${params.toString()}`)
}

export async function getUserByIdentity(userId: string, email: string, actor?: UserRequestActor): Promise<AppUser | null> {
  const params = new URLSearchParams({ user_id: userId, email })
  addActorParams(params, actor)
  return request<AppUser | null>(`/api/users?${params.toString()}`)
}

export async function upsertUser(
  user: Pick<AppUser, 'user_id' | 'email' | 'name'>,
  actor?: UserRequestActor,
): Promise<AppUser | null> {
  return request<AppUser | null>('/api/users', {
    method: 'POST',
    body: JSON.stringify(withActorBody(user, actor)),
  })
}

export async function listUsers(actor?: UserRequestActor): Promise<AppUser[]> {
  const params = new URLSearchParams()
  addActorParams(params, actor)
  const suffix = params.toString()
  return request<AppUser[]>(suffix ? `/api/users?${suffix}` : '/api/users')
}

export async function updateUserRole(userId: string, role: Role, actor?: UserRequestActor): Promise<void> {
  await request<{ ok: true; user?: AppUser | null }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify(withActorBody({ user_id: userId, role }, actor)),
  })
}

export async function updateUserPermissions(
  userId: string,
  page_permissions: PagePermission[],
  actor?: UserRequestActor,
): Promise<void> {
  await request<{ ok: true; user?: AppUser | null }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify(withActorBody({ user_id: userId, page_permissions }, actor)),
  })
}
