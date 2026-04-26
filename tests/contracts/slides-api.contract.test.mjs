import test from 'node:test'
import assert from 'node:assert/strict'

import { onRequestGet } from '../../functions/api/slides.js'

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

function withMockedFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = originalFetch
    })
}

test('slides API contract: missing identity returns structured 401 envelope', { concurrency: false }, async () => {
  await withMockedFetch(async () => {
    throw new Error('fetch should not be called when actor identity is missing')
  }, async () => {
    const request = new Request('https://oliver-app.local/api/slides?resource=slides')
    const response = await onRequestGet({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 401)
    assert.equal(body.ok, false)
    assert.match(String(body.error || ''), /missing verified actor identity/i)
    assert.match(String(body.error_detail?.correlation_id || ''), /^slides-/)
    assert.equal(body.error_detail?.failure_class, 'unauthenticated')
    assert.equal(typeof body.error_detail?.retryable, 'boolean')
  })
})

test('slides API contract: upstream HTML failure is sanitized with ray + correlation metadata', { concurrency: false }, async () => {
  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()

    if (url.pathname === '/rest/v1/app_users' && method === 'GET') {
      return jsonResponse([{
        user_id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        page_permissions: ['slides'],
      }])
    }

    if (url.pathname === '/rest/v1/slides' && method === 'GET') {
      return new Response('<!doctype html><html><body>Worker exception. Ray ID: abc123xyz</body></html>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const request = new Request(
      'https://oliver-app.local/api/slides?resource=slides&user_id=admin-1&user_email=admin%40example.com',
    )
    const response = await onRequestGet({
      request,
      env: {
        ...BASE_ENV,
        SLIDES_TRUST_CLIENT_IDENTITY: '1',
      },
    })
    const body = await response.json()

    assert.equal(response.status, 500)
    assert.equal(body.ok, false)
    assert.match(String(body.error || ''), /runtime exception/i)
    assert.equal(String(body.error || '').includes('<html'), false)
    assert.match(String(body.error_detail?.correlation_id || ''), /^slides-/)
    assert.equal(body.error_detail?.ray_id, 'abc123xyz')
    assert.equal(body.error_detail?.endpoint, '/api/slides')
  })
})
