import test from 'node:test'
import assert from 'node:assert/strict'

import { onRequestPost } from '../../functions/api/campaigns.js'

const BASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  CAMPAIGNS_TRUST_CLIENT_IDENTITY: '1',
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

test('campaigns API contract: duplicate export request reuses existing fingerprinted job', { concurrency: false }, async () => {
  let exportInsertCalled = false
  let dedupeLogged = false

  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()

    if (url.pathname === '/rest/v1/app_users' && method === 'GET') {
      return jsonResponse([{
        user_id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        page_permissions: ['campaigns'],
      }])
    }

    if (url.pathname === '/rest/v1/campaign_content_items' && method === 'GET') {
      return jsonResponse([
        {
          id: 'content-1',
          status: 'posted',
          created_at: '2026-04-26T00:00:00.000Z',
          updated_at: '2026-04-26T00:00:00.000Z',
          posted_at: '2026-04-26T00:00:00.000Z',
          scheduled_for: '2026-04-26T00:00:00.000Z',
          campaign_id: 'campaign-1',
          content_type: 'linkedin-post',
          topic: 'Ops',
          created_by: 'admin-1',
          posting_owner_id: 'admin-1',
          archived_at: '2026-04-26T00:00:00.000Z',
        },
      ])
    }

    if (url.pathname === '/rest/v1/campaign_report_exports' && method === 'GET') {
      return jsonResponse([
        {
          id: 'existing-export-1',
          requested_by_user_id: 'admin-1',
          format: 'markdown',
          filters: { campaignId: 'campaign-1' },
          status: 'completed',
          file_name: 'campaign-summary-2026-04-26.md',
          file_payload: '# Campaign Summary',
          error_message: null,
          requested_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ])
    }

    if (url.pathname === '/rest/v1/campaign_report_exports' && method === 'POST') {
      exportInsertCalled = true
      return jsonResponse([], 201)
    }

    if (url.pathname === '/rest/v1/campaign_activity_log' && method === 'POST') {
      const payload = JSON.parse(String(init.body || '{}'))
      dedupeLogged = payload.action_type === 'report-export-deduped'
      return jsonResponse([], 201)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const request = new Request('https://oliver-app.local/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request-report-export',
        actor: {
          user_id: 'admin-1',
          user_email: 'admin@example.com',
        },
        format: 'markdown',
        filters: {
          campaignId: 'campaign-1',
        },
      }),
    })

    const response = await onRequestPost({ request, env: { ...BASE_ENV } })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.deduped, true)
    assert.equal(body.job?.id, 'existing-export-1')
    assert.equal(exportInsertCalled, false)
    assert.equal(dedupeLogged, true)
  })
})

test('campaigns API contract: journey timeline filters and export are supported', { concurrency: false }, async () => {
  let timelineExportLogged = false

  await withMockedFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method || 'GET').toUpperCase()

    if (url.pathname === '/rest/v1/app_users' && method === 'GET') {
      return jsonResponse([{
        user_id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        page_permissions: ['campaigns'],
      }])
    }

    if (url.pathname === '/rest/v1/campaign_activity_log' && method === 'GET') {
      return jsonResponse([
        {
          id: 'timeline-1',
          entity_id: 'campaign-1',
          action_type: 'campaign-journey-node-executed',
          performed_by: 'system-worker',
          timestamp: '2026-04-26T14:00:00.000Z',
          metadata: {
            journey_node_id: 'node-action-1',
            journey_node_type: 'action',
            branch_outcome: 'positive',
            actor_type: 'system',
            message: 'Action executed for qualified segment',
          },
        },
      ])
    }

    if (url.pathname === '/rest/v1/campaign_report_exports' && method === 'GET') {
      return jsonResponse([])
    }

    if (url.pathname === '/rest/v1/campaign_report_exports' && method === 'POST') {
      return jsonResponse([{
        id: 'journey-export-1',
        requested_by_user_id: 'admin-1',
        format: 'csv',
        filters: { campaign_id: 'campaign-1', export_type: 'journey-timeline' },
        status: 'completed',
        file_name: 'campaign-journey-timeline-2026-04-26.csv',
        file_payload: 'id,campaign_id,timestamp\n',
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }], 201)
    }

    if (url.pathname === '/rest/v1/campaign_activity_log' && method === 'POST') {
      const payload = JSON.parse(String(init.body || '{}'))
      timelineExportLogged = payload.action_type === 'journey-timeline-export-generated'
      return jsonResponse([], 201)
    }

    return new Response(`Unhandled route ${method} ${url.pathname}${url.search}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }, async () => {
    const timelineRequest = new Request('https://oliver-app.local/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-journey-timeline',
        actor: {
          user_id: 'admin-1',
          user_email: 'admin@example.com',
        },
        campaign_id: 'campaign-1',
        filters: {
          nodeType: 'action',
          branchOutcome: 'positive',
          limit: 25,
          offset: 0,
        },
      }),
    })

    const timelineResponse = await onRequestPost({ request: timelineRequest, env: { ...BASE_ENV } })
    const timelineBody = await timelineResponse.json()
    assert.equal(timelineResponse.status, 200)
    assert.equal(timelineBody.ok, true)
    assert.equal(Array.isArray(timelineBody.items), true)
    assert.equal(timelineBody.items[0]?.node_id, 'node-action-1')

    const exportRequest = new Request('https://oliver-app.local/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request-journey-timeline-export',
        actor: {
          user_id: 'admin-1',
          user_email: 'admin@example.com',
        },
        campaign_id: 'campaign-1',
        format: 'csv',
        filters: {
          nodeType: 'action',
          branchOutcome: 'positive',
        },
      }),
    })

    const exportResponse = await onRequestPost({ request: exportRequest, env: { ...BASE_ENV } })
    const exportBody = await exportResponse.json()

    assert.equal(exportResponse.status, 201)
    assert.equal(exportBody.ok, true)
    assert.equal(exportBody.job?.id, 'journey-export-1')
    assert.equal(timelineExportLogged, true)
  })
})
