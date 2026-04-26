import test from 'node:test'
import assert from 'node:assert/strict'

import { onRequestGet, onRequestPost } from '../../functions/api/slides.js'

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

test('slides API contract: save write returns normalized slide payload for authorized actor', { concurrency: false }, async () => {
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

    if (url.pathname === '/rest/v1/slides' && method === 'POST') {
      return jsonResponse([{
        id: 'slide-1',
        owner_user_id: 'admin-1',
        title: 'Contract Save',
        canvas: { width: 1920, height: 1080 },
        components_json: [{ id: 'cmp-1', type: 'heading', x: 100, y: 100, width: 600, content: 'Hello', style: {} }],
        metadata: { warning_count: 0 },
        revision: 1,
        source: 'import',
        source_template_id: null,
        deleted_at: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }], 201)
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      return jsonResponse([], 201)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const request = new Request('https://oliver-app.local/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide: {
          title: 'Contract Save',
          canvas: { width: 1920, height: 1080 },
          components: [{ id: 'cmp-1', type: 'heading', x: 100, y: 100, width: 600, content: 'Hello', style: {} }],
          metadata: { warning_count: 0 },
        },
      }),
    })

    const response = await onRequestPost({
      request,
      env: {
        ...BASE_ENV,
        SLIDES_TRUST_CLIENT_IDENTITY: '1',
      },
    })
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(typeof body.slide?.id, 'string')
    assert.equal(body.slide?.title, 'Contract Save')
    assert.equal(body.slide?.owner_user_id, 'admin-1')
    assert.equal(Array.isArray(body.slide?.components), true)
  })
})

test('slides API contract: audits read supports high-volume pagination envelope', { concurrency: false }, async () => {
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

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'GET') {
      const rows = Array.from({ length: 201 }, (_, index) => ({
        id: `audit-${index + 1}`,
        entity_type: 'slide',
        entity_id: `slide-${index + 1}`,
        action: 'save',
        outcome: 'success',
        actor_user_id: 'admin-1',
        actor_email: 'admin@example.com',
        details: {},
        created_at: `2026-04-26T00:${String(index % 60).padStart(2, '0')}:00.000Z`,
      }))
      return jsonResponse(rows)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const request = new Request(
      'https://oliver-app.local/api/slides?resource=audits&limit=200&offset=0&user_id=admin-1&user_email=admin%40example.com',
    )
    const response = await onRequestGet({
      request,
      env: {
        ...BASE_ENV,
        SLIDES_TRUST_CLIENT_IDENTITY: '1',
      },
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(Array.isArray(body.items), true)
    assert.equal(body.items.length, 200)
    assert.equal(body.pagination?.offset, 0)
    assert.equal(body.pagination?.limit, 200)
    assert.equal(body.pagination?.has_more, true)
    assert.equal(body.pagination?.next_offset, 200)
  })
})
