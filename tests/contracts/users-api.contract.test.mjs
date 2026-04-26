import test from 'node:test'
import assert from 'node:assert/strict'

import { onRequestGet, onRequestPatch } from '../../functions/api/users.js'

const BASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(text = 'mock error', status = 500) {
  return new Response(text, { status, headers: { 'Content-Type': 'text/plain' } })
}

function withMockedFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = originalFetch
    })
}

test('users API contract: valid admin save succeeds', { concurrency: false }, async () => {
  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()
    const search = url.search

    if (url.pathname === '/rest/v1/app_users' && method === 'GET' && search.includes('email=eq.admin%40example.com')) {
      return jsonResponse([{
        user_id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        page_permissions: ['accounts', 'hr'],
      }])
    }

    if (url.pathname === '/rest/v1/app_users' && method === 'GET' && search.includes('user_id=eq.member-1')) {
      return jsonResponse([{
        user_id: 'member-1',
        email: 'member@example.com',
        name: 'Member',
        role: 'user',
        page_permissions: ['accounts'],
      }])
    }

    if (url.pathname === '/rest/v1/app_users' && method === 'PATCH' && search.includes('user_id=eq.member-1')) {
      return jsonResponse([{
        user_id: 'member-1',
        email: 'member@example.com',
        name: 'Member',
        role: 'admin',
        page_permissions: ['accounts'],
      }])
    }

    return errorResponse(`Unhandled route ${method} ${url.pathname}${url.search}`, 500)
  }, async () => {
    const request = new Request('https://oliver-app.local/api/users', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'cf-access-authenticated-user-email': 'admin@example.com',
      },
      body: JSON.stringify({
        user_id: 'member-1',
        role: 'admin',
      }),
    })

    const response = await onRequestPatch({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.user?.role, 'admin')
  })
})

test('users API contract: missing identity returns 401', { concurrency: false }, async () => {
  await withMockedFetch(async () => {
    throw new Error('fetch should not be called for missing identity')
  }, async () => {
    const request = new Request('https://oliver-app.local/api/users?user_id=member-1')
    const response = await onRequestGet({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 401)
    assert.match(String(body.error || ''), /Missing verified actor identity/i)
  })
})

test('users API contract: spoofed non-admin read attempt returns 403', { concurrency: false }, async () => {
  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()
    const search = url.search

    if (url.pathname === '/rest/v1/app_users' && method === 'GET' && search.includes('email=eq.member%40example.com')) {
      return jsonResponse([{
        user_id: 'member-1',
        email: 'member@example.com',
        name: 'Member',
        role: 'user',
        page_permissions: ['accounts'],
      }])
    }

    return errorResponse(`Unhandled route ${method} ${url.pathname}${url.search}`, 500)
  }, async () => {
    const request = new Request(
      'https://oliver-app.local/api/users?email=admin%40example.com&actor_email=member%40example.com&actor_user_id=member-1',
    )
    const response = await onRequestGet({
      request,
      env: {
        ...BASE_ENV,
        USERS_TRUST_CLIENT_IDENTITY: '1',
      },
    })
    const body = await response.json()

    assert.equal(response.status, 403)
    assert.match(String(body.error || ''), /only read your own user profile/i)
  })
})

test('users API contract: identity-claim mismatch returns 403', { concurrency: false }, async () => {
  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()
    const search = url.search

    if (url.pathname === '/rest/v1/app_users' && method === 'GET' && search.includes('select=person_id')) {
      return jsonResponse([])
    }

    if (url.pathname === '/rest/v1/person_identities' && method === 'GET' && search.includes('subject_key=eq.oid-actor')) {
      return jsonResponse([])
    }

    if (url.pathname === '/rest/v1/app_users' && method === 'GET' && search.includes('or=(email.eq.member%40example.com,user_id.eq.member-1)')) {
      return jsonResponse([{
        user_id: 'member-1',
        email: 'member@example.com',
        name: 'Member',
        role: 'user',
        page_permissions: ['accounts'],
      }])
    }

    return errorResponse(`Unhandled route ${method} ${url.pathname}${url.search}`, 500)
  }, async () => {
    const request = new Request(
      'https://oliver-app.local/api/users?microsoft_tid=tid-1&microsoft_oid=oid-target',
      {
        headers: {
          'x-user-email': 'member@example.com',
          'x-user-id': 'member-1',
          'x-user-microsoft-oid': 'oid-actor',
          'x-user-microsoft-tid': 'tid-1',
        },
      },
    )

    const response = await onRequestGet({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 403)
    assert.match(String(body.error || ''), /only read your own microsoft identity profile/i)
  })
})
