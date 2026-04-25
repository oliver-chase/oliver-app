import type { AppUser, PagePermission, Role } from '@/types/auth'

// app_users is read/written only through /api/users (CF Function, service role).
// Supabase RLS denies client (anon/authenticated) access to the table.
// Never import supabase-js here — the browser must not touch app_users directly.

export type UserRequestActor = {
  userId?: string | null
  email?: string | null
  microsoftOid?: string | null
  microsoftTid?: string | null
  microsoftSub?: string | null
}

export type MicrosoftIdentityInput = {
  microsoftOid?: string | null
  microsoftTid?: string | null
  microsoftSub?: string | null
}

function actorHeaders(actor?: UserRequestActor): HeadersInit {
  if (!actor) return {}
  const headers: Record<string, string> = {}
  const actorEmail = actor.email?.trim()
  const actorUserId = actor.userId?.trim()
  const actorMicrosoftOid = actor.microsoftOid?.trim()
  const actorMicrosoftTid = actor.microsoftTid?.trim()
  const actorMicrosoftSub = actor.microsoftSub?.trim()
  if (actorEmail) headers['x-user-email'] = actorEmail
  if (actorUserId) headers['x-user-id'] = actorUserId
  if (actorMicrosoftOid) headers['x-user-microsoft-oid'] = actorMicrosoftOid
  if (actorMicrosoftTid) headers['x-user-microsoft-tid'] = actorMicrosoftTid
  if (actorMicrosoftSub) headers['x-user-microsoft-sub'] = actorMicrosoftSub
  return headers
}

async function request<T>(path: string, init?: RequestInit, actor?: UserRequestActor): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...actorHeaders(actor),
      ...(init?.headers || {}),
    },
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
  const actorMicrosoftOid = actor?.microsoftOid?.trim()
  const actorMicrosoftTid = actor?.microsoftTid?.trim()
  const actorMicrosoftSub = actor?.microsoftSub?.trim()
  if (actorEmail) params.set('actor_email', actorEmail)
  if (actorUserId) params.set('actor_user_id', actorUserId)
  if (actorMicrosoftOid) params.set('actor_microsoft_oid', actorMicrosoftOid)
  if (actorMicrosoftTid) params.set('actor_microsoft_tid', actorMicrosoftTid)
  if (actorMicrosoftSub) params.set('actor_microsoft_sub', actorMicrosoftSub)
}

function withActorBody<T extends Record<string, unknown>>(body: T, actor?: UserRequestActor) {
  const next: Record<string, unknown> = { ...body }
  const actorEmail = actor?.email?.trim()
  const actorUserId = actor?.userId?.trim()
  const actorMicrosoftOid = actor?.microsoftOid?.trim()
  const actorMicrosoftTid = actor?.microsoftTid?.trim()
  const actorMicrosoftSub = actor?.microsoftSub?.trim()
  if (actorEmail) next.actor_email = actorEmail
  if (actorUserId) next.actor_user_id = actorUserId
  if (actorMicrosoftOid) next.actor_microsoft_oid = actorMicrosoftOid
  if (actorMicrosoftTid) next.actor_microsoft_tid = actorMicrosoftTid
  if (actorMicrosoftSub) next.actor_microsoft_sub = actorMicrosoftSub
  return next
}

function withMicrosoftIdentityParams(params: URLSearchParams, identity?: MicrosoftIdentityInput) {
  const microsoftOid = identity?.microsoftOid?.trim()
  const microsoftTid = identity?.microsoftTid?.trim()
  const microsoftSub = identity?.microsoftSub?.trim()
  if (microsoftOid) params.set('microsoft_oid', microsoftOid)
  if (microsoftTid) params.set('microsoft_tid', microsoftTid)
  if (microsoftSub) params.set('microsoft_sub', microsoftSub)
}

function withMicrosoftIdentityBody<T extends Record<string, unknown>>(body: T, identity?: MicrosoftIdentityInput) {
  const next: Record<string, unknown> = { ...body }
  const microsoftOid = identity?.microsoftOid?.trim()
  const microsoftTid = identity?.microsoftTid?.trim()
  const microsoftSub = identity?.microsoftSub?.trim()
  if (microsoftOid) next.microsoft_oid = microsoftOid
  if (microsoftTid) next.microsoft_tid = microsoftTid
  if (microsoftSub) next.microsoft_sub = microsoftSub
  return next
}

export async function getUser(userId: string, actor?: UserRequestActor): Promise<AppUser | null> {
  const params = new URLSearchParams({ user_id: userId })
  addActorParams(params, actor)
  return request<AppUser | null>(`/api/users?${params.toString()}`, undefined, actor)
}

export async function getUserByIdentity(userId: string, email: string, actor?: UserRequestActor): Promise<AppUser | null> {
  const params = new URLSearchParams({ user_id: userId, email })
  addActorParams(params, actor)
  withMicrosoftIdentityParams(params, actor)
  return request<AppUser | null>(`/api/users?${params.toString()}`, undefined, actor)
}

export async function upsertUser(
  user: Pick<AppUser, 'user_id' | 'email' | 'name'>,
  identity?: MicrosoftIdentityInput,
  actor?: UserRequestActor,
): Promise<AppUser | null> {
  return request<AppUser | null>('/api/users', {
    method: 'POST',
    body: JSON.stringify(withActorBody(withMicrosoftIdentityBody(user, identity), actor)),
  }, actor)
}

export async function listUsers(actor?: UserRequestActor): Promise<AppUser[]> {
  const params = new URLSearchParams()
  addActorParams(params, actor)
  const suffix = params.toString()
  return request<AppUser[]>(suffix ? `/api/users?${suffix}` : '/api/users', undefined, actor)
}

export async function updateUserRole(userId: string, role: Role, actor?: UserRequestActor): Promise<void> {
  await request<{ ok: true; user?: AppUser | null }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify(withActorBody({ user_id: userId, role }, actor)),
  }, actor)
}

export async function updateUserPermissions(
  userId: string,
  page_permissions: PagePermission[],
  actor?: UserRequestActor,
): Promise<void> {
  await request<{ ok: true; user?: AppUser | null }>('/api/users', {
    method: 'PATCH',
    body: JSON.stringify(withActorBody({ user_id: userId, page_permissions }, actor)),
  }, actor)
}
