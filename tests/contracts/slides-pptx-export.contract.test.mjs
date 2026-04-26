import test from 'node:test'
import assert from 'node:assert/strict'

import { onRequestGet, onRequestPost } from '../../functions/api/slides.js'

const BASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SLIDES_TRUST_CLIENT_IDENTITY: '1',
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

test('slides API contract: request-pptx-export-job returns succeeded job payload with warnings summary', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-1',
        owner_user_id: 'admin-1',
        title: 'Contract Slide',
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        revision: 2,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
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
        action: 'request-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide_ids: ['slide-1'],
        slides: [{
          id: 'slide-1',
          title: 'Contract Slide',
          canvas: { width: 1920, height: 1080 },
          components: [
            { id: 'cmp-1', type: 'heading', x: 100, y: 120, width: 800, content: 'Hello', style: {} },
            { id: 'cmp-2', type: 'unknown-widget', x: 120, y: 200, width: 400, content: 'Unsupported', style: {} },
          ],
        }],
        filename_prefix: 'contract-export',
        idempotency_key: 'contract-idempotency-1',
        max_attempts: 3,
      }),
    })

    const response = await onRequestPost({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(body.job?.status, 'succeeded')
    assert.equal(body.job?.slide_ids?.[0], 'slide-1')
    assert.equal(body.job?.warning_count > 0, true)
    assert.equal(Array.isArray(body.job?.native_objects), true)
    assert.equal(body.job?.artifact?.file_name?.endsWith('.pptx'), true)
  })
})

test('slides API contract: pptx-export-jobs listing and download enforce actor access', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-2',
        owner_user_id: 'admin-1',
        title: 'Stored Slide',
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      return jsonResponse([], 201)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const createReq = new Request('https://oliver-app.local/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide_ids: ['slide-2'],
        slides: [{
          id: 'slide-2',
          title: 'Stored Slide',
          canvas: { width: 1920, height: 1080 },
          components: [{ id: 'cmp-3', type: 'text', x: 90, y: 90, width: 500, content: 'Text', style: {} }],
        }],
      }),
    })
    const createRes = await onRequestPost({ request: createReq, env: { ...BASE_ENV } })
    const createBody = await createRes.json()
    const jobId = createBody.job?.id

    assert.equal(createRes.status, 201)
    assert.equal(typeof jobId, 'string')

    const listReq = new Request('https://oliver-app.local/api/slides?resource=pptx-export-jobs&user_id=admin-1&user_email=admin%40example.com')
    const listRes = await onRequestGet({ request: listReq, env: { ...BASE_ENV } })
    const listBody = await listRes.json()
    assert.equal(listRes.status, 200)
    assert.equal(Array.isArray(listBody.items), true)
    assert.equal(listBody.items.some((job) => job.id === jobId), true)

    const downloadReq = new Request('https://oliver-app.local/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'download-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        job_id: jobId,
      }),
    })
    const downloadRes = await onRequestPost({ request: downloadReq, env: { ...BASE_ENV } })
    const downloadBody = await downloadRes.json()
    assert.equal(downloadRes.status, 200)
    assert.equal(downloadBody.job?.id, jobId)
    assert.equal(downloadBody.job?.status, 'succeeded')
  })
})

test('slides API contract: request-pptx-export-job maps expanded native component types and warning codes', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-3',
        owner_user_id: 'admin-1',
        title: 'Extended Types',
        canvas: { width: 1920, height: 1080, background: 'linear-gradient(120deg, #111827 0%, #2563eb 100%)' },
        components_json: [],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
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
        action: 'request-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide_ids: ['slide-3'],
        slides: [{
          id: 'slide-3',
          title: 'Extended Types',
          canvas: { width: 1920, height: 1080, background: 'linear-gradient(120deg, #111827 0%, #2563eb 100%)' },
          components: [
            { id: 'cmp-subheading', type: 'subheading', x: 80, y: 90, width: 900, content: 'Subheading', style: {} },
            { id: 'cmp-panel', type: 'panel', x: 90, y: 180, width: 700, height: 260, content: 'Panel body', style: {} },
            { id: 'cmp-row', type: 'row', x: 100, y: 460, width: 900, height: 120, content: 'Row body', style: {} },
            { id: 'cmp-stat', type: 'stat', x: 1050, y: 220, width: 300, height: 220, content: '92%', style: {} },
            { id: 'cmp-logo', type: 'logo', x: 120, y: 40, width: 160, height: 60, content: '', style: {} },
            { id: 'cmp-unsupported', type: 'odd-widget', x: 220, y: 620, width: 360, height: 100, content: 'Unsupported', style: {} },
          ],
        }],
      }),
    })

    const response = await onRequestPost({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(body.job?.status, 'succeeded')

    const nativeObjects = Array.isArray(body.job?.native_objects) ? body.job.native_objects : []
    const nativeById = new Map(nativeObjects.map((entry) => [entry.component_id, entry]))
    assert.equal(nativeById.get('cmp-subheading')?.native_kind, 'text')
    assert.equal(nativeById.get('cmp-panel')?.native_kind, 'shape')
    assert.equal(nativeById.get('cmp-row')?.native_kind, 'shape')
    assert.equal(nativeById.get('cmp-stat')?.native_kind, 'shape')
    assert.equal(nativeById.get('cmp-logo')?.native_kind, 'image')
    assert.equal(nativeById.get('cmp-logo')?.editable, false)

    const warnings = Array.isArray(body.job?.warnings) ? body.job.warnings : []
    const warningCodes = warnings.map((warning) => warning.code)
    assert.equal(warningCodes.includes('image_rasterized'), true)
    assert.equal(warningCodes.includes('unsupported_component'), true)
  })
})

test('slides API contract: computed-style projection is deterministic and emits transform warnings', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-style-1',
        owner_user_id: 'admin-1',
        title: 'Style Projection',
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
    }

    if (url.pathname === '/rest/v1/slide_audit_events' && method === 'POST') {
      return jsonResponse([], 201)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const payload = {
      action: 'request-pptx-export-job',
      actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
      slide_ids: ['slide-style-1'],
      slides: [{
        id: 'slide-style-1',
        title: 'Style Projection',
        canvas: { width: 1920, height: 1080 },
        components: [
          {
            id: 'cmp-style-main',
            type: 'heading',
            x: 120,
            y: 160,
            width: 800,
            content: 'Computed style text',
            style: {
              color: '#111827',
              fontWeight: 700,
            },
            computed_style: {
              fontSize: '56px',
              lineHeight: '64px',
              transform: 'rotate(8deg)',
              fontFamily: 'Inter, sans-serif',
            },
          },
        ],
      }],
    }

    const reqOne = new Request('https://oliver-app.local/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idempotency_key: 'style-det-a' }),
    })
    const resOne = await onRequestPost({ request: reqOne, env: { ...BASE_ENV } })
    const bodyOne = await resOne.json()
    assert.equal(resOne.status, 201)

    const reqTwo = new Request('https://oliver-app.local/api/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idempotency_key: 'style-det-b' }),
    })
    const resTwo = await onRequestPost({ request: reqTwo, env: { ...BASE_ENV } })
    const bodyTwo = await resTwo.json()
    assert.equal(resTwo.status, 201)

    const objectsOne = Array.isArray(bodyOne.job?.native_objects) ? bodyOne.job.native_objects : []
    const objectsTwo = Array.isArray(bodyTwo.job?.native_objects) ? bodyTwo.job.native_objects : []
    assert.deepEqual(objectsOne, objectsTwo)

    const primary = objectsOne.find((entry) => entry.component_id === 'cmp-style-main')
    assert.equal(primary?.style_projection?.font_size_px, 56)
    assert.equal(primary?.style_projection?.line_height_px, 64)
    assert.equal(primary?.style_projection?.font_family, 'Inter, sans-serif')

    const warnings = Array.isArray(bodyOne.job?.warnings) ? bodyOne.job.warnings : []
    assert.equal(warnings.some((warning) => warning.code === 'unsupported_transform' && warning.component_id === 'cmp-style-main'), true)
  })
})

test('slides API contract: flex layout projection preserves key alignment fields and emits wrap warnings', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-flex-1',
        owner_user_id: 'admin-1',
        title: 'Flex Layout',
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
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
        action: 'request-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide_ids: ['slide-flex-1'],
        slides: [{
          id: 'slide-flex-1',
          title: 'Flex Layout',
          canvas: { width: 1920, height: 1080 },
          components: [
            {
              id: 'cmp-flex-parent',
              type: 'panel',
              x: 100,
              y: 180,
              width: 1100,
              height: 280,
              content: 'Container',
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '24px',
                flexDirection: 'row',
                flexWrap: 'wrap',
              },
            },
            {
              id: 'cmp-flex-child',
              type: 'text',
              x: 130,
              y: 220,
              width: 260,
              height: 80,
              content: 'Nested child',
              style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                flexDirection: 'column',
              },
            },
          ],
        }],
      }),
    })

    const response = await onRequestPost({ request, env: { ...BASE_ENV } })
    const body = await response.json()
    assert.equal(response.status, 201)

    const nativeObjects = Array.isArray(body.job?.native_objects) ? body.job.native_objects : []
    const parent = nativeObjects.find((entry) => entry.component_id === 'cmp-flex-parent')
    const child = nativeObjects.find((entry) => entry.component_id === 'cmp-flex-child')

    assert.equal(parent?.layout?.display, 'flex')
    assert.equal(parent?.layout?.flex?.justify_content, 'space-between')
    assert.equal(parent?.layout?.flex?.align_items, 'center')
    assert.equal(parent?.layout?.flex?.gap_px, 24)
    assert.equal(parent?.layout?.flex?.direction, 'row')
    assert.equal(child?.layout?.display, 'flex')
    assert.equal(child?.layout?.flex?.direction, 'column')

    const warnings = Array.isArray(body.job?.warnings) ? body.job.warnings : []
    assert.equal(warnings.some((warning) => warning.code === 'unsupported_flex_behavior' && warning.component_id === 'cmp-flex-parent'), true)
  })
})

test('slides API contract: effects projection maps gradients/shadows/radius and warns on unsupported combos', { concurrency: false }, async () => {
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
      return jsonResponse([{
        id: 'slide-effects-1',
        owner_user_id: 'admin-1',
        title: 'Effects Fidelity',
        canvas: { width: 1920, height: 1080 },
        components_json: [],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-26T00:00:00.000Z',
        updated_at: '2026-04-26T00:00:00.000Z',
        last_edited_at: '2026-04-26T00:00:00.000Z',
      }])
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
        action: 'request-pptx-export-job',
        actor: { user_id: 'admin-1', user_email: 'admin@example.com' },
        slide_ids: ['slide-effects-1'],
        slides: [{
          id: 'slide-effects-1',
          title: 'Effects Fidelity',
          canvas: { width: 1920, height: 1080 },
          components: [
            {
              id: 'cmp-linear-shadow',
              type: 'card',
              x: 120,
              y: 180,
              width: 600,
              height: 300,
              content: 'Linear gradient + shadow',
              style: {
                backgroundFill: 'linear-gradient(135deg, #111827 0%, #2563eb 100%)',
                boxShadow: '0px 12px 30px rgba(17,24,39,0.35)',
                borderRadius: 24,
              },
            },
            {
              id: 'cmp-radial',
              type: 'panel',
              x: 780,
              y: 180,
              width: 520,
              height: 300,
              content: 'Radial gradient',
              style: {
                backgroundFill: 'radial-gradient(circle, #f59e0b 0%, #7c2d12 100%)',
                borderRadius: '18px',
              },
            },
            {
              id: 'cmp-unsupported-effects',
              type: 'row',
              x: 120,
              y: 540,
              width: 900,
              height: 180,
              content: 'Unsupported combo',
              style: {
                backgroundFill: 'conic-gradient(#111827, #2563eb)',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.4)',
                borderRadius: '50%',
              },
            },
          ],
        }],
      }),
    })

    const response = await onRequestPost({ request, env: { ...BASE_ENV } })
    const body = await response.json()
    assert.equal(response.status, 201)

    const nativeObjects = Array.isArray(body.job?.native_objects) ? body.job.native_objects : []
    const linear = nativeObjects.find((entry) => entry.component_id === 'cmp-linear-shadow')
    const radial = nativeObjects.find((entry) => entry.component_id === 'cmp-radial')

    assert.equal(linear?.style_projection?.effects?.fill?.type, 'linear')
    assert.equal(linear?.style_projection?.effects?.shadow?.blur_px, 30)
    assert.equal(linear?.style_projection?.effects?.border_radius_px, 24)
    assert.equal(radial?.style_projection?.effects?.fill?.type, 'radial')
    assert.equal(radial?.style_projection?.effects?.border_radius_px, 18)

    const warnings = Array.isArray(body.job?.warnings) ? body.job.warnings : []
    assert.equal(warnings.some((warning) => warning.code === 'unsupported_effect_combo' && warning.component_id === 'cmp-unsupported-effects'), true)
  })
})
