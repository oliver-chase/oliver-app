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

test('slides API contract: restore-template returns normalized template payload and audit metadata', { concurrency: false }, async () => {
  let auditInserted = false

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

    if (url.pathname === '/rest/v1/slide_templates' && method === 'GET') {
      if (url.searchParams.get('id') === 'eq.template-restore-1' && url.searchParams.get('is_archived') === 'eq.true') {
        return jsonResponse([{
          id: 'template-restore-1',
          owner_user_id: 'admin-1',
          name: 'Archived Template',
          description: 'Template in archive',
          is_shared: false,
          is_archived: true,
          canvas: { width: 1920, height: 1080 },
          components_json: [],
          metadata: {},
          created_at: '2026-04-25T00:00:00.000Z',
          updated_at: '2026-04-25T00:00:00.000Z',
        }])
      }
    }

    if (url.pathname === '/rest/v1/slide_templates' && method === 'PATCH') {
      return jsonResponse([{
        id: 'template-restore-1',
        owner_user_id: 'admin-1',
        name: 'Archived Template',
        description: 'Template in archive',
        is_shared: false,
        is_archived: false,
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        created_at: '2026-04-25T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      auditInserted = true
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
        action: 'restore-template',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        template_id: 'template-restore-1',
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

    assert.equal(response.status, 200)
    assert.equal(body.template?.id, 'template-restore-1')
    assert.equal(body.template?.is_archived, false)
    assert.equal(auditInserted, true)
  })
})

test('slides API contract: permanent-delete-template enforces archived prerequisite and writes audit trail', { concurrency: false }, async () => {
  let collaboratorDeleteCalled = false
  let templateDeleteCalled = false
  let auditInserted = false

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

    if (url.pathname === '/rest/v1/slide_templates' && method === 'GET') {
      if (url.searchParams.get('id') === 'eq.template-delete-1') {
        return jsonResponse([{
          id: 'template-delete-1',
          owner_user_id: 'admin-1',
          name: 'Archived Template',
          description: 'Template in archive',
          is_shared: false,
          is_archived: true,
          canvas: { width: 1920, height: 1080 },
          components_json: [],
          metadata: {},
          created_at: '2026-04-25T00:00:00.000Z',
          updated_at: '2026-04-25T00:00:00.000Z',
        }])
      }
    }

    if (url.pathname === '/rest/v1/slide_template_collaborators' && method === 'DELETE') {
      collaboratorDeleteCalled = true
      return new Response(null, { status: 204 })
    }

    if (url.pathname === '/rest/v1/slide_templates' && method === 'DELETE') {
      templateDeleteCalled = true
      return new Response(null, { status: 204 })
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      auditInserted = true
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
        action: 'permanent-delete-template',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        template_id: 'template-delete-1',
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

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(collaboratorDeleteCalled, true)
    assert.equal(templateDeleteCalled, true)
    assert.equal(auditInserted, true)
  })
})

test('slides API contract: approval escalation includes configured routing channels and targets', { concurrency: false }, async () => {
  let patchedApprovalPayload = null
  let escalationAuditDetails = null

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

    if (url.pathname === '/rest/v1/slide_template_approvals' && method === 'GET') {
      return jsonResponse([{
        id: 'approval-1',
        template_id: 'template-1',
        requested_by_user_id: 'member-1',
        requested_by_email: 'member@example.com',
        approval_type: 'transfer-template',
        payload: {
          target_user_id: 'admin-1',
          target_user_email: 'admin@example.com',
        },
        status: 'pending',
        review_note: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        created_at: '2026-04-20T00:00:00.000Z',
        updated_at: '2026-04-20T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_templates' && method === 'GET') {
      return jsonResponse([{
        id: 'template-1',
        owner_user_id: 'member-1',
        name: 'Escalation Template',
        description: '',
        is_shared: false,
        is_archived: false,
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        created_at: '2026-04-20T00:00:00.000Z',
        updated_at: '2026-04-20T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_template_approvals' && method === 'PATCH') {
      const body = init.body ? JSON.parse(String(init.body)) : {}
      patchedApprovalPayload = body
      return jsonResponse([{
        id: 'approval-1',
        template_id: 'template-1',
        requested_by_user_id: 'member-1',
        requested_by_email: 'member@example.com',
        approval_type: 'transfer-template',
        payload: body.payload || {},
        status: 'pending',
        review_note: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        created_at: '2026-04-20T00:00:00.000Z',
        updated_at: body.updated_at || '2026-04-26T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      const body = init.body ? JSON.parse(String(init.body)) : {}
      escalationAuditDetails = body.details || null
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
        action: 'escalate-template-approval',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        approval_id: 'approval-1',
        reason: 'Escalate with configured channels.',
      }),
    })

    const response = await onRequestPost({
      request,
      env: {
        ...BASE_ENV,
        SLIDES_TRUST_CLIENT_IDENTITY: '1',
        SLIDES_APPROVAL_ESCALATION_CHANNELS: 'email,slack,in-app',
        SLIDES_APPROVAL_ESCALATION_TARGET_USER_IDS: 'admin-1,admin-2',
        SLIDES_APPROVAL_ESCALATION_TARGET_EMAILS: 'ops@example.com',
        SLIDES_APPROVAL_ESCALATION_EMAIL_FROM: 'slides-alerts@example.com',
        SLIDES_APPROVAL_ESCALATION_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/test/path',
      },
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(Array.isArray(body.approval?.payload?.escalations), true)
    assert.equal(Array.isArray(patchedApprovalPayload?.payload?.escalations), true)

    const escalation = body.approval.payload.escalations[0] || {}
    assert.deepEqual(escalation.routing?.channels, ['email', 'slack', 'in-app'])
    assert.equal(Array.isArray(escalation.routing?.targets), true)
    assert.equal(escalation.routing?.targets.length, 3)
    assert.equal(escalation.routing?.adapters?.email_enabled, true)
    assert.equal(escalation.routing?.adapters?.slack_enabled, true)
    assert.equal(escalation.routing?.adapters?.slack_webhook_configured, true)
    assert.equal(escalation.routing?.adapters?.email_from, 'slides-alerts@example.com')

    assert.equal(Array.isArray(escalationAuditDetails?.routing_channels), true)
    assert.equal(Array.isArray(escalationAuditDetails?.routing_targets), true)
    assert.equal(escalationAuditDetails?.routing_channels?.includes('slack'), true)
    assert.equal(escalationAuditDetails?.routing_targets?.length, 3)
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
