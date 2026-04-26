import { expect, test, type Page } from '@playwright/test'
import { gotoAndSettle } from './helpers/navigation'

function seedQaAuth(page: Page, appUserOverrides?: Record<string, unknown>) {
  return page.addInitScript(({ appUserOverrides }) => {
    window.localStorage.setItem('qa-auth-account', JSON.stringify({
      homeAccountId: 'qa-home-account',
      environment: 'qa.local',
      tenantId: 'qa-tenant',
      username: 'qa-admin@example.com',
      localAccountId: 'qa-local-account',
      name: 'QA Admin',
      idTokenClaims: {
        oid: 'qa-admin-user',
        sub: 'qa-admin-user',
      },
    }))

    const appUser = {
      user_id: 'qa-admin-user',
      email: 'qa-admin@example.com',
      name: 'QA Admin',
      role: 'admin',
      page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides', 'reviews', 'campaigns'],
      created_at: '2026-04-23T00:00:00.000Z',
      updated_at: '2026-04-23T00:00:00.000Z',
      ...appUserOverrides,
    }

    window.localStorage.setItem('qa-app-user', JSON.stringify(appUser))
  }, { appUserOverrides: appUserOverrides ?? null })
}

type CampaignApiBody = Record<string, unknown> & {
  action?: string
  filters?: Record<string, unknown>
}

type GroupingsPayload = {
  by_campaign?: Array<{ key: string; count: number }>
  by_topic?: Array<{ key: string; count: number }>
  by_user?: Array<{ key: string; count: number }>
}

function metricsResponse(count: number, groupings?: GroupingsPayload) {
  return {
    ok: true,
    summary: {
      created_count: count,
      submitted_count: count,
      approved_count: Math.max(0, count - 1),
      claimed_count: Math.max(0, count - 2),
      posted_count: Math.max(0, count - 3),
      missed_count: 1,
      unclaimed_count: 2,
      waiting_review_count: 3,
    },
    groupings: {
      by_campaign: groupings?.by_campaign ?? [],
      by_topic: groupings?.by_topic ?? [],
      by_user: groupings?.by_user ?? [],
    },
  }
}

async function mockCampaignSupabaseReads(page: Page) {
  await page.route('**/rest/v1/campaigns*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/rest/v1/campaign_content_items*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
  await page.route('**/rest/v1/campaign_assets*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

test.describe('campaign module report and automation flows', () => {
  test.beforeEach(async ({ page }) => {
    await seedQaAuth(page)
    await mockCampaignSupabaseReads(page)
  })

  test('sidebar links navigate to campaign subpages instead of in-page anchor jumps', async ({ page }) => {
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(0)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const sidebar = page.locator('#sidebar')
    await expect(sidebar.getByRole('link', { name: 'Campaigns', exact: true })).toHaveAttribute('href', /\/campaigns\/campaigns\/?$/)
    await expect(sidebar.getByRole('link', { name: 'Content Library' })).toHaveAttribute('href', /\/campaigns\/content\/?$/)
    await expect(sidebar.getByRole('link', { name: 'Review Queue' })).toHaveAttribute('href', /\/campaigns\/review-queue\/?$/)
    await expect(sidebar.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', /\/campaigns\/calendar\/?$/)
    await expect(sidebar.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', /\/campaigns\/reports\/?$/)

    await sidebar.getByRole('link', { name: 'Content Library' }).click()
    await expect(page).toHaveURL(/\/campaigns\/content\/?$/)
    await expect(page.locator('#campaigns-content')).toBeVisible()
    await expect(page.locator('#campaigns-list')).toHaveCount(0)
  })

  test('report filters apply and request server summary with selected filters', async ({ page }) => {
    const campaignApiBodies: CampaignApiBody[] = []

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        campaignApiBodies.push(body)

        if (body.action === 'get-report-summary') {
          const filters = body.filters ?? {}
          const contentType = typeof filters.contentType === 'string' ? filters.contentType : ''
          const count = contentType === 'blog-post' ? 11 : 4
          const responseGroupings = contentType === 'blog-post'
            ? {
              by_campaign: [{ key: 'campaign-xyz', count: 11 }],
              by_topic: [{ key: 'launch', count: 9 }],
              by_user: [{ key: 'qa-admin-user', count: 8 }],
            }
            : undefined
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(count, responseGroupings)),
          })
          return
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, items: [] }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const reports = page.locator('#campaigns-reports')
    await expect(reports.getByText('Report Filters')).toBeVisible()

    await reports.locator('select').first().selectOption('custom')
    await reports.locator('input[type="date"]').first().fill('2026-04-01')
    await reports.locator('input[type="date"]').nth(1).fill('2026-04-25')
    await reports.locator('select').nth(2).selectOption('blog-post')
    await reports.getByRole('button', { name: 'Apply Filters' }).click()

    await expect.poll(() => campaignApiBodies.filter(body => body.action === 'get-report-summary').length).toBeGreaterThan(1)

    const latest = campaignApiBodies.filter(body => body.action === 'get-report-summary').at(-1)
    expect(latest?.filters).toMatchObject({
      startDate: '2026-04-01',
      endDate: '2026-04-25',
      contentType: 'blog-post',
    })

    const createdCard = reports.locator('article').filter({ hasText: 'Created' }).first()
    await expect(createdCard.locator('.campaign-metric')).toHaveText('11')
    await expect(reports.getByText('Type: blog-post')).toBeVisible()
    await expect(reports.getByText('Report Breakdown')).toBeVisible()
    await expect(reports.getByText('campaign-xyz')).toBeVisible()
  })

  test('workspace still loads when campaign_assets table is missing in schema cache', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-assets-fallback-1',
            name: 'Assets Fallback Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'content-assets-fallback-1',
            title: 'Fallback Draft',
            body: 'Body copy',
            content_type: 'linkedin-post',
            topic: 'general',
            campaign_id: 'campaign-assets-fallback-1',
            status: 'draft',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'PGRST205',
          message: "Could not find the table 'public.campaign_assets' in the schema cache",
          hint: "Perhaps you meant the table 'public.assignments'",
        }),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')
    await expect(contentSection.getByRole('heading', { name: 'Fallback Draft' })).toBeVisible()
    await expect(page.getByText('Campaign schema is not migrated yet.')).toHaveCount(0)
  })

  test('content library filters narrow results by status and search', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-filter-1',
            name: 'Filter Test Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'Ops teams',
            primary_cta: 'Book a call',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'content-filter-draft',
            title: 'Draft Item',
            body: 'Draft body',
            content_type: 'linkedin-post',
            topic: 'Awareness',
            campaign_id: 'campaign-filter-1',
            status: 'draft',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'content-filter-review',
            title: 'Needs Review Item',
            body: 'Needs review body',
            content_type: 'blog-post',
            topic: 'Product launch',
            campaign_id: 'campaign-filter-1',
            status: 'needs_review',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'content-filter-claimed',
            title: 'Claimed LinkedIn Item',
            body: 'Claimed body',
            content_type: 'linkedin-post',
            topic: 'Claimed topic',
            campaign_id: 'campaign-filter-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-12T10:00:00.000Z',
            updated_at: '2026-04-12T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(3)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')

    await expect(contentSection.getByText('Showing 3 of 3 items.')).toBeVisible()

    await contentSection.getByLabel('Filter status').selectOption('needs_review')
    await expect(contentSection.getByText('Showing 1 of 3 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Needs Review Item' })).toBeVisible()

    await contentSection.getByRole('button', { name: 'Reset Content Filters' }).click()
    await contentSection.getByLabel('Search content').fill('Claimed LinkedIn')
    await expect(contentSection.getByText('Showing 1 of 3 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Claimed LinkedIn Item' })).toBeVisible()
  })

  test('campaign chatbot open-my-claimed and open-calendar set focused calendar ownership', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-ownership-1',
            name: 'Ownership Campaign One',
            description: '',
            offer_definition: '',
            target_audience: 'Ops teams',
            primary_cta: 'Book a call',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
          {
            id: 'campaign-ownership-2',
            name: 'Ownership Campaign Two',
            description: '',
            offer_definition: '',
            target_audience: 'Sales',
            primary_cta: 'Sign up',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-02T00:00:00.000Z',
            updated_at: '2026-04-02T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ownership-mine',
            title: 'Mine Claimed Item',
            body: 'Mine body',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-ownership-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: '2026-04-26T10:00:00.000Z',
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: '2026-04-01T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'ownership-other',
            title: 'Other Claimed Item',
            body: 'Other body',
            content_type: 'linkedin-post',
            topic: 'Marketing',
            campaign_id: 'campaign-ownership-2',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'other-user-id',
            reviewer_id: null,
            scheduled_for: '2026-04-27T11:00:00.000Z',
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'other-user-id',
            created_at: '2026-04-02T10:00:00.000Z',
            updated_at: '2026-04-02T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    const chat = page.getByRole('button', { name: 'Open My Claimed' })
    await expect(chat).toBeVisible()
    await chat.click()

    const calendarSection = page.locator('#campaigns-calendar')
    await expect(page).toHaveURL(/\/campaigns\/calendar\/?$/)
    await expect(calendarSection.getByRole('heading', { name: 'My Claimed Queue' })).toBeVisible()
    await expect(calendarSection.getByRole('heading', { name: 'Mine Claimed Item' })).toBeVisible()
    await expect(calendarSection.getByRole('heading', { name: 'Other Claimed Item' })).toHaveCount(0)
    await expect(calendarSection.getByText('Showing 1 of 1 claimed items.')).toBeVisible()
    await expect(calendarSection.getByLabel('Filter claimed ownership')).toHaveValue('mine')

    const channelSelect = calendarSection.getByRole('combobox', { name: 'Filter claimed channel' })
    await channelSelect.selectOption('linkedin')

    await page.getByRole('button', { name: 'Open Calendar', exact: true }).click()
    await expect(page).toHaveURL(/\/campaigns\/calendar\/?$/)
    await expect(calendarSection.getByRole('heading', { name: 'Mine Claimed Item' })).toBeVisible()
    await expect(calendarSection.getByRole('heading', { name: 'Other Claimed Item' })).toBeVisible()
    await expect(calendarSection.getByLabel('Filter claimed ownership')).toHaveValue('all')
    await expect(calendarSection.getByText('Showing 2 of 2 claimed items.')).toBeVisible()

    const ownershipSelect = calendarSection.getByLabel('Filter claimed ownership')
    await ownershipSelect.selectOption('mine')
    await expect(calendarSection.getByText('Showing 1 of 1 claimed items.')).toBeVisible()
    await expect(calendarSection.getByRole('heading', { name: 'Other Claimed Item' })).toHaveCount(0)
    await expect(calendarSection.getByRole('heading', { name: 'Mine Claimed Item' })).toBeVisible()
  })

  test('draft creation allows partial input with body only', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-partial-draft-1',
            name: 'Partial Draft Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })

    const insertedBodies: Array<Record<string, unknown>> = []
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }
      if (request.method() === 'POST') {
        const payload = request.postDataJSON() as Array<Record<string, unknown>> | Record<string, unknown>
        const row = Array.isArray(payload) ? (payload[0] || {}) : (payload || {})
        insertedBodies.push(row)
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'partial-draft-created',
              title: row.title || '',
              body: row.body || '',
              content_type: row.content_type || 'linkedin-post',
              topic: row.topic || 'general',
              campaign_id: row.campaign_id || null,
              status: 'draft',
              intended_channel: null,
              attributed_author_id: null,
              posting_owner_id: null,
              reviewer_id: null,
              scheduled_for: null,
              posted_at: null,
              post_url: null,
              rejection_reason: null,
              created_by: 'qa-admin-user',
              created_at: '2026-04-25T00:00:00.000Z',
              updated_at: '2026-04-25T00:00:00.000Z',
              archived_at: null,
            },
          ]),
        })
        return
      }
      await route.fallback()
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(0)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')
    const createForm = contentSection.locator('form').filter({ hasText: 'Create Content Draft' }).first()

    await createForm.getByPlaceholder('Draft body').fill('Body-only draft for fallback title generation')
    await createForm.getByRole('button', { name: 'Save Draft' }).click()

    await expect.poll(() => insertedBodies.length).toBe(1)
    expect(insertedBodies[0].topic).toBe('general')
    expect(typeof insertedBodies[0].title).toBe('string')
    expect(String(insertedBodies[0].title)).toContain('Body-only draft')
    await expect(page.getByText('Draft created:')).toBeVisible()
  })

  test('content library defaults to action queue and hides posted until all-content view', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-default-view-1',
            name: 'Default View Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'Ops teams',
            primary_cta: 'Book a call',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'default-unclaimed',
            title: 'Default Unclaimed',
            body: 'Unclaimed body',
            content_type: 'linkedin-post',
            topic: 'Awareness',
            campaign_id: 'campaign-default-view-1',
            status: 'unclaimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'default-claimed-me',
            title: 'Default Claimed by Me',
            body: 'Claimed body',
            content_type: 'linkedin-post',
            topic: 'Pipeline',
            campaign_id: 'campaign-default-view-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'default-posted',
            title: 'Default Posted',
            body: 'Posted body',
            content_type: 'linkedin-post',
            topic: 'Results',
            campaign_id: 'campaign-default-view-1',
            status: 'posted',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: null,
            posted_at: '2026-04-12T10:00:00.000Z',
            post_url: 'https://example.com/post/default',
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-12T10:00:00.000Z',
            updated_at: '2026-04-12T10:00:00.000Z',
            archived_at: '2026-04-12T10:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(3)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')

    await expect(contentSection.getByRole('button', { name: 'Action Queue', exact: true })).toHaveClass(/campaign-chip-active/)
    await expect(contentSection.getByText('Showing 2 of 3 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Default Posted' })).toHaveCount(0)

    await contentSection.getByRole('button', { name: 'All Content' }).click()
    await expect(contentSection.getByText('Showing 3 of 3 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Default Posted' })).toBeVisible()
  })

  test('content filter chips are removable and reset individual filters', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-chip-1',
            name: 'Chip Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'chip-needs-review',
            title: 'Chip Needs Review',
            body: 'Needs review body',
            content_type: 'blog-post',
            topic: 'Launch',
            campaign_id: 'campaign-chip-1',
            status: 'needs_review',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'chip-unclaimed',
            title: 'Chip Unclaimed',
            body: 'Unclaimed body',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-chip-1',
            status: 'unclaimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(2)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')

    await contentSection.getByLabel('Filter status').selectOption('needs_review')
    await expect(contentSection.getByText('Showing 1 of 2 items.')).toBeVisible()
    await expect(contentSection.getByRole('button', { name: /Status: needs_review/ })).toBeVisible()

    await contentSection.getByRole('button', { name: /Status: needs_review/ }).click()
    await expect(contentSection.getByLabel('Filter status')).toHaveValue('all')
    await expect(contentSection.getByText('Showing 2 of 2 items.')).toBeVisible()
  })

  test('stale transition conflicts show refresh prompt and allow reload', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-conflict-1',
            name: 'Conflict Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'conflict-draft-1',
            title: 'Conflict Draft',
            body: 'Draft body',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-conflict-1',
            status: 'draft',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/rpc/campaign_submit_for_review', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'P0001',
          message: 'CMP_INVALID_STATE: only draft content can be submitted for review.',
        }),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const contentSection = page.locator('#campaigns-content')
    const conflictCard = contentSection.locator('article').filter({ hasText: 'Conflict Draft' }).first()
    await conflictCard.getByRole('button', { name: 'Submit for Review' }).click()

    const errorBanner = page.locator('.status-banner').filter({ hasText: 'Campaign data changed while this action was running. Refresh and retry.' }).first()
    await expect(errorBanner).toBeVisible()
    await errorBanner.getByRole('button', { name: 'Refresh Now' }).click()
    await expect(contentSection.getByRole('heading', { name: 'Conflict Draft' })).toBeVisible()
  })

  test('admin override modal applies forced lifecycle transition with required reason', async ({ page }) => {
    let overrideBody: Record<string, unknown> | null = null

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-admin-override-1',
            name: 'Admin Override Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'admin-override-item-1',
            title: 'Admin Override Item',
            body: 'Claimed body',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-admin-override-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: '2026-04-28T14:00:00.000Z',
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-20T00:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/rpc/campaign_admin_override', async route => {
      overrideBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'admin-override-item-1',
            title: 'Admin Override Item',
            body: 'Claimed body',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-admin-override-1',
            status: 'unclaimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-26T00:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const contentSection = page.locator('#campaigns-content')
    const card = contentSection.locator('article').filter({ hasText: 'Admin Override Item' }).first()
    await card.getByRole('button', { name: 'Admin Override' }).click()

    await page.getByLabel('Admin override action').selectOption('force-unclaimed')
    await page.getByLabel('Admin override reason').fill('Manual lifecycle correction for invalid claim state')
    await page.getByRole('button', { name: 'Apply Override' }).click()

    await expect.poll(() => overrideBody !== null).toBe(true)
    if (!overrideBody) {
      throw new Error('Expected admin override payload to be captured.')
    }
    const overridePayload = overrideBody
    const overrideAction = overridePayload['p_action'] as string | undefined
    const overrideReason = overridePayload['p_reason'] as string | undefined
    expect(overrideAction).toBe('force-unclaimed')
    expect(overrideReason).toBe('Manual lifecycle correction for invalid claim state')
    await expect(page.getByText('Admin override applied: Admin Override Item is now unclaimed.')).toBeVisible()
  })

  test('campaign cards show lifecycle counts and cadence open-slot summary', async ({ page }) => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const thisWeekScheduled = new Date(now)
    thisWeekScheduled.setDate(now.getDate() + 1)
    thisWeekScheduled.setHours(10, 0, 0, 0)

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-slot-1',
            name: 'Cadence Coverage Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'Growth team',
            primary_cta: 'Book intro',
            keywords: [],
            start_date: currentMonthStart,
            end_date: currentMonthEnd,
            cadence_rule: {
              preset: 'weekly',
              posts_per_week: 2,
            },
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'slot-draft',
            title: 'Draft item',
            body: 'Draft body',
            content_type: 'linkedin-post',
            topic: 'Draft',
            campaign_id: 'campaign-slot-1',
            status: 'draft',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'slot-review',
            title: 'Review item',
            body: 'Review body',
            content_type: 'linkedin-post',
            topic: 'Review',
            campaign_id: 'campaign-slot-1',
            status: 'needs_review',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'slot-unclaimed',
            title: 'Unclaimed item',
            body: 'Unclaimed body',
            content_type: 'linkedin-post',
            topic: 'Unclaimed',
            campaign_id: 'campaign-slot-1',
            status: 'unclaimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-12T10:00:00.000Z',
            updated_at: '2026-04-12T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'slot-claimed',
            title: 'Claimed item',
            body: 'Claimed body',
            content_type: 'linkedin-post',
            topic: 'Claimed',
            campaign_id: 'campaign-slot-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: thisWeekScheduled.toISOString(),
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-13T10:00:00.000Z',
            updated_at: '2026-04-13T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'slot-posted',
            title: 'Posted item',
            body: 'Posted body',
            content_type: 'linkedin-post',
            topic: 'Posted',
            campaign_id: 'campaign-slot-1',
            status: 'posted',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: null,
            posted_at: '2026-04-14T10:00:00.000Z',
            post_url: 'https://example.com/post/1',
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-14T10:00:00.000Z',
            updated_at: '2026-04-14T10:00:00.000Z',
            archived_at: '2026-04-14T10:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(5)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const campaignCard = page
      .locator('#campaigns-list article')
      .filter({ has: page.locator('h3:has-text("Cadence Coverage Campaign")') })
      .first()
    await expect(campaignCard).toBeVisible()
    await expect(campaignCard.getByText('Draft 1')).toBeVisible()
    await expect(campaignCard.getByText('Review 1')).toBeVisible()
    await expect(campaignCard.getByText('Unclaimed 1')).toBeVisible()
    await expect(campaignCard.getByText('Claimed 1', { exact: true })).toBeVisible()
    await expect(campaignCard.getByText('Posted 1')).toBeVisible()
    await expect(campaignCard.getByText('Open slots this week: 1')).toBeVisible()
    await expect(campaignCard.getByText('Scheduled this week: 1')).toBeVisible()

    await campaignCard.getByRole('button', { name: 'Focus Schedule' }).click()

    const densityCard = page.locator('#campaigns-list article').filter({ hasText: 'Campaign Schedule Density' })
    await expect(densityCard).toBeVisible()
    await expect(densityCard.getByLabel('Campaign density focus')).toHaveValue('campaign-slot-1')
    await expect(densityCard.getByText('Coverage:')).toBeVisible()
    await expect(densityCard.locator('.campaign-density-day-open').first()).toBeVisible()
    await expect(densityCard.locator('.campaign-density-day-filled').first()).toBeVisible()

    const calendarSection = page.locator('#campaigns-calendar')
    await expect(calendarSection.getByLabel('Filter claimed campaign')).toHaveValue('campaign-slot-1')

    await campaignCard.getByRole('button', { name: 'View Details' }).click()
    const detailCard = page.locator('#campaigns-list article').filter({ hasText: 'Campaign Detail Workspace' }).first()
    await expect(detailCard).toBeVisible()
    await expect(detailCard.getByText('Lifecycle Groups')).toBeVisible()
    await expect(detailCard.getByRole('heading', { name: 'Draft (1)', exact: true })).toBeVisible()
    await expect(detailCard.getByRole('heading', { name: 'Needs Review (1)', exact: true })).toBeVisible()
    await expect(detailCard.getByRole('heading', { name: 'Unclaimed (1)', exact: true })).toBeVisible()
    await expect(detailCard.getByRole('heading', { name: 'Claimed (1)', exact: true })).toBeVisible()
    await expect(detailCard.getByRole('heading', { name: 'Posted (1)', exact: true })).toBeVisible()
    await expect(detailCard.getByText('Open slots this week: 1')).toBeVisible()
    await expect(detailCard.getByRole('button', { name: 'Draft item' })).toBeVisible()
  })

  test('calendar filters prioritize overdue and support timing/channel refinement', async ({ page }) => {
    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-calendar-1',
            name: 'Calendar Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'Ops leaders',
            primary_cta: 'Book now',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'calendar-overdue',
            title: 'Overdue claimed item',
            body: 'Overdue body',
            content_type: 'linkedin-post',
            topic: 'Follow-up',
            campaign_id: 'campaign-calendar-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: '2020-01-05T10:00:00.000Z',
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'calendar-future',
            title: 'Future claimed item',
            body: 'Future body',
            content_type: 'linkedin-post',
            topic: 'Roadmap',
            campaign_id: 'campaign-calendar-1',
            status: 'claimed',
            intended_channel: 'email',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: '2099-01-05T10:00:00.000Z',
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'calendar-unscheduled',
            title: 'Unscheduled claimed item',
            body: 'Unscheduled body',
            content_type: 'linkedin-post',
            topic: 'Reminder',
            campaign_id: 'campaign-calendar-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-12T10:00:00.000Z',
            updated_at: '2026-04-12T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(3)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const calendarSection = page.locator('#campaigns-calendar')
    const calendarItems = calendarSection.locator('article').filter({ hasText: 'Download ICS' })

    await expect(calendarSection.getByText('Showing 3 of 3 claimed items.')).toBeVisible()
    await expect(calendarSection.getByRole('button', { name: 'Timing: all ✕' })).toHaveCount(0)
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Overdue claimed item')

    await calendarSection.getByLabel('Sort claimed content').selectOption('latest')
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Future claimed item')

    await calendarSection.getByLabel('Filter claimed timing').selectOption('overdue')
    await expect(calendarSection.getByRole('button', { name: 'Timing: overdue ✕' })).toBeVisible()
    await expect(calendarSection.getByText('Showing 1 of 3 claimed items.')).toBeVisible()
    await expect(calendarItems).toHaveCount(1)
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Overdue claimed item')

    await calendarSection.getByLabel('Filter claimed timing').selectOption('all')
    await expect(calendarSection.getByRole('button', { name: 'Timing: overdue ✕' })).toHaveCount(0)
    await calendarSection.getByLabel('Filter claimed channel').selectOption('email')
    await expect(calendarSection.getByRole('button', { name: 'Channel: email ✕' })).toBeVisible()
    await expect(calendarSection.getByText('Showing 1 of 3 claimed items.')).toBeVisible()
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Future claimed item')

    await calendarSection.getByRole('button', { name: 'Reset Calendar Filters' }).click()
    await expect(calendarSection.getByText('Showing 3 of 3 claimed items.')).toBeVisible()
    await expect(calendarSection.getByRole('button', { name: 'Channel: email ✕' })).toHaveCount(0)
    await expect(calendarSection.getByRole('button', { name: 'Timing: overdue ✕' })).toHaveCount(0)
  })

  test('calendar timeline shows claimed, posted, missed, and open-slot entries across views', async ({ page }) => {
    const now = new Date()
    const missedAt = new Date(now)
    missedAt.setDate(now.getDate() - 1)
    missedAt.setHours(9, 0, 0, 0)
    const postedAt = new Date(now)
    postedAt.setHours(11, 0, 0, 0)
    const upcomingAt = new Date(now)
    upcomingAt.setDate(now.getDate() + 2)
    upcomingAt.setHours(13, 0, 0, 0)

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-timeline-1',
            name: 'Timeline Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'Ops leaders',
            primary_cta: 'Book now',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: {
              preset: 'every-weekday',
              posts_per_week: 5,
              days_of_week: [1, 2, 3, 4, 5],
            },
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'timeline-missed',
            title: 'Missed claimed timeline item',
            body: 'Missed body',
            content_type: 'linkedin-post',
            topic: 'Follow-up',
            campaign_id: 'campaign-timeline-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: missedAt.toISOString(),
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'timeline-upcoming',
            title: 'Upcoming claimed timeline item',
            body: 'Upcoming body',
            content_type: 'linkedin-post',
            topic: 'Roadmap',
            campaign_id: 'campaign-timeline-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: upcomingAt.toISOString(),
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'timeline-posted',
            title: 'Posted timeline item',
            body: 'Posted body',
            content_type: 'linkedin-post',
            topic: 'Roadmap',
            campaign_id: 'campaign-timeline-1',
            status: 'posted',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: postedAt.toISOString(),
            posted_at: postedAt.toISOString(),
            post_url: 'https://example.com/posted',
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-11T10:00:00.000Z',
            updated_at: '2026-04-11T10:00:00.000Z',
            archived_at: postedAt.toISOString(),
          },
        ]),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(3)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const calendarSection = page.locator('#campaigns-calendar')

    await expect(calendarSection.getByText('Calendar Timeline')).toBeVisible()
    await expect(calendarSection.locator('.campaign-timeline-kind-missed').first()).toBeVisible()
    await expect(calendarSection.locator('.campaign-timeline-kind-posted').first()).toBeVisible()
    await expect(calendarSection.locator('.campaign-timeline-kind-open-slot').first()).toBeVisible()
    await expect(calendarSection.getByText('Window:')).toBeVisible()

    await calendarSection.getByLabel('Calendar view').selectOption('monthly')
    await expect(calendarSection.getByText('Calendar Timeline')).toBeVisible()

    await calendarSection.getByRole('button', { name: 'Next' }).click()
    await expect(calendarSection.getByText('Window:')).toBeVisible()
  })

  test('admin automation panel triggers dry run jobs and renders result', async ({ page }) => {
    const jobsBodies: Array<Record<string, unknown>> = []

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(6)),
          })
          return
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/campaign-jobs', async route => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      jobsBodies.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          action: body.action,
          dry_run: body.dryRun === true,
          jobs: {
            reminders: {
              ok: true,
              inspected: 4,
              sent: 2,
              cancelled: 1,
              failed: 1,
            },
            missed_posts: {
              ok: true,
              inspected: 3,
              newly_missed: 2,
              already_marked: 1,
            },
          },
        }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const reports = page.locator('#campaigns-reports')
    await expect(reports.getByText('Automation Jobs')).toBeVisible()

    await reports.getByRole('button', { name: 'Dry Run All' }).click()

    await expect.poll(() => jobsBodies.length).toBe(1)
    expect(jobsBodies[0]).toMatchObject({ action: 'all', dryRun: true })

    await expect(reports.getByText(/Dry run complete/)).toBeVisible()
    await expect(reports.locator('.campaign-job-output')).toContainText('"sent": 2')
    await expect(reports.locator('.campaign-job-output')).toContainText('"newly_missed": 2')
  })

  test('review queue supports sorting and bulk approve actions for admins', async ({ page }) => {
    const approveBodies: Array<Record<string, unknown>> = []
    const reviewRows = [
      {
        id: 'review-item-old',
        title: 'Older review',
        body: 'Older body',
        content_type: 'linkedin-post',
        topic: 'Launch',
        campaign_id: 'campaign-abc',
        status: 'needs_review',
        intended_channel: 'linkedin',
        attributed_author_id: null,
        posting_owner_id: null,
        reviewer_id: null,
        scheduled_for: null,
        posted_at: null,
        post_url: null,
        rejection_reason: null,
        created_by: 'writer-1',
        created_at: '2026-04-20T10:00:00.000Z',
        updated_at: '2026-04-20T10:00:00.000Z',
        archived_at: null,
      },
      {
        id: 'review-item-new',
        title: 'Newer review',
        body: 'Newer body',
        content_type: 'linkedin-post',
        topic: 'Demand gen',
        campaign_id: 'campaign-abc',
        status: 'needs_review',
        intended_channel: 'linkedin',
        attributed_author_id: null,
        posting_owner_id: null,
        reviewer_id: null,
        scheduled_for: null,
        posted_at: null,
        post_url: null,
        rejection_reason: null,
        created_by: 'writer-2',
        created_at: '2026-04-25T10:00:00.000Z',
        updated_at: '2026-04-25T10:00:00.000Z',
        archived_at: null,
      },
    ]

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-abc',
            name: 'Q2 Pipeline Push',
            description: '',
            offer_definition: '',
            target_audience: 'RevOps',
            primary_cta: 'Book intro',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reviewRows),
      })
    })

    await page.route('**/rest/v1/rpc/campaign_approve_content', async route => {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      approveBodies.push(requestBody)
      const contentId = typeof requestBody.p_content_id === 'string' ? requestBody.p_content_id : ''
      const row = reviewRows.find(item => item.id === contentId)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...(row || reviewRows[0]),
          id: contentId || row?.id || reviewRows[0].id,
          status: 'unclaimed',
          reviewer_id: 'qa-admin-user',
          updated_at: '2026-04-26T00:00:00.000Z',
        }),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(2)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const reviewSection = page.locator('#campaigns-review')
    await expect(reviewSection.getByText('Review Queue Controls')).toBeVisible()

    const reviewItems = reviewSection.locator('article').filter({ hasText: 'needs_review' })
    await expect(reviewItems).toHaveCount(2)
    await expect(reviewItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Older review')

    await reviewSection.locator('select').first().selectOption('newest')
    await expect(reviewItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Newer review')

    await reviewSection.getByLabel('Select Older review').check()
    await reviewSection.getByLabel('Select Newer review').check()
    await reviewSection.getByRole('button', { name: 'Approve Selected' }).click()

    await expect.poll(() => approveBodies.length).toBe(2)
    await expect(reviewSection.getByText('Bulk approve complete: 2 succeeded.')).toBeVisible()
    await expect(reviewSection.getByText('No content is waiting for review.')).toBeVisible()
  })

  test('review queue bulk reject uses modal reason input', async ({ page }) => {
    const rejectBodies: Array<Record<string, unknown>> = []
    const reviewRows = [
      {
        id: 'review-reject-1',
        title: 'Reject me one',
        body: 'Body one',
        content_type: 'linkedin-post',
        topic: 'Topic A',
        campaign_id: 'campaign-reject',
        status: 'needs_review',
        intended_channel: 'linkedin',
        attributed_author_id: null,
        posting_owner_id: null,
        reviewer_id: null,
        scheduled_for: null,
        posted_at: null,
        post_url: null,
        rejection_reason: null,
        created_by: 'writer-1',
        created_at: '2026-04-20T10:00:00.000Z',
        updated_at: '2026-04-20T10:00:00.000Z',
        archived_at: null,
      },
      {
        id: 'review-reject-2',
        title: 'Reject me two',
        body: 'Body two',
        content_type: 'linkedin-post',
        topic: 'Topic B',
        campaign_id: 'campaign-reject',
        status: 'needs_review',
        intended_channel: 'linkedin',
        attributed_author_id: null,
        posting_owner_id: null,
        reviewer_id: null,
        scheduled_for: null,
        posted_at: null,
        post_url: null,
        rejection_reason: null,
        created_by: 'writer-2',
        created_at: '2026-04-21T10:00:00.000Z',
        updated_at: '2026-04-21T10:00:00.000Z',
        archived_at: null,
      },
    ]

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-reject',
            name: 'Reject Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'RevOps',
            primary_cta: 'Book intro',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reviewRows),
      })
    })

    await page.route('**/rest/v1/rpc/campaign_reject_content', async route => {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      rejectBodies.push(requestBody)
      const contentId = typeof requestBody.p_content_id === 'string' ? requestBody.p_content_id : ''
      const reason = typeof requestBody.p_reason === 'string' ? requestBody.p_reason : ''
      const row = reviewRows.find(item => item.id === contentId)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...(row || reviewRows[0]),
          id: contentId || row?.id || reviewRows[0].id,
          status: 'draft',
          rejection_reason: reason,
          reviewer_id: 'qa-admin-user',
          updated_at: '2026-04-26T00:00:00.000Z',
        }),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(2)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const reviewSection = page.locator('#campaigns-review')
    await reviewSection.getByLabel('Select Reject me one').check()
    await reviewSection.getByLabel('Select Reject me two').check()
    await reviewSection.getByRole('button', { name: 'Reject Selected' }).click()

    const modal = page.locator('.app-modal').filter({ hasText: 'Reject Selected Content' })
    await expect(modal).toBeVisible()
    await modal.getByRole('button', { name: 'Reject Selected' }).click()
    await expect(modal.getByText('Rejection reason is required.')).toBeVisible()

    await modal.getByLabel('Bulk rejection reason').fill('Needs clearer CTA and tighter hook')
    await modal.getByRole('button', { name: 'Reject Selected' }).click()

    await expect.poll(() => rejectBodies.length).toBe(2)
    for (const body of rejectBodies) {
      expect(body.p_reason).toBe('Needs clearer CTA and tighter hook')
    }

    await expect(page.locator('.app-modal').filter({ hasText: 'Reject Selected Content' })).toHaveCount(0)
    await expect(reviewSection.getByText('Bulk reject complete: 2 succeeded.')).toBeVisible()
    await expect(reviewSection.getByText('No content is waiting for review.')).toBeVisible()
  })

  test('review queue single reject uses reason modal and validates required input', async ({ page }) => {
    const rejectBodies: Array<Record<string, unknown>> = []
    const reviewRows = [
      {
        id: 'review-single-reject',
        title: 'Single reject item',
        body: 'Needs edits',
        content_type: 'linkedin-post',
        topic: 'Topic C',
        campaign_id: 'campaign-single-reject',
        status: 'needs_review',
        intended_channel: 'linkedin',
        attributed_author_id: null,
        posting_owner_id: null,
        reviewer_id: null,
        scheduled_for: null,
        posted_at: null,
        post_url: null,
        rejection_reason: null,
        created_by: 'writer-3',
        created_at: '2026-04-22T10:00:00.000Z',
        updated_at: '2026-04-22T10:00:00.000Z',
        archived_at: null,
      },
    ]

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-single-reject',
            name: 'Single Reject Campaign',
            description: '',
            offer_definition: '',
            target_audience: 'RevOps',
            primary_cta: 'Book intro',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reviewRows),
      })
    })

    await page.route('**/rest/v1/rpc/campaign_reject_content', async route => {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      rejectBodies.push(requestBody)
      const reason = typeof requestBody.p_reason === 'string' ? requestBody.p_reason : ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...reviewRows[0],
          status: 'draft',
          rejection_reason: reason,
          reviewer_id: 'qa-admin-user',
          updated_at: '2026-04-26T00:00:00.000Z',
        }),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')
    const reviewSection = page.locator('#campaigns-review')

    const reviewCard = reviewSection.locator('article').filter({ hasText: 'Single reject item' })
    await reviewCard.getByRole('button', { name: 'Reject' }).click()
    const modal = page.locator('.app-modal').filter({ hasText: 'Reject Content' })
    await expect(modal).toBeVisible()

    await modal.getByRole('button', { name: 'Reject Content' }).click()
    await expect(modal.getByText('Reason is required.')).toBeVisible()

    await modal.getByLabel('Review rejection reason').fill('Needs stronger proof point before publish')
    await modal.getByRole('button', { name: 'Reject Content' }).click()

    await expect.poll(() => rejectBodies.length).toBe(1)
    expect(rejectBodies[0].p_reason).toBe('Needs stronger proof point before publish')
    await expect(page.locator('.app-modal').filter({ hasText: 'Reject Content' })).toHaveCount(0)
    await expect(reviewSection.getByText('No content is waiting for review.')).toBeVisible()
  })

  test('export history downloads completed job payload', async ({ page }) => {
    const campaignApiBodies: CampaignApiBody[] = []

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()

      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              items: [
                {
                  id: 'job-campaign-export-1',
                  requested_by_user_id: 'qa-admin-user',
                  format: 'markdown',
                  filters: {},
                  status: 'completed',
                  file_name: 'campaign-summary-2026-04-25.md',
                  error_message: null,
                  requested_at: '2026-04-25T13:00:00.000Z',
                  completed_at: '2026-04-25T13:00:04.000Z',
                },
              ],
            }),
          })
          return
        }
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        campaignApiBodies.push(body)

        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(4)),
          })
          return
        }

        if (body.action === 'download-report-export') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              filename: 'campaign-summary-2026-04-25.md',
              content: '# Campaign Export\n\nGenerated from test fixture.',
              format: 'markdown',
            }),
          })
          return
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, items: [] }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const reports = page.locator('#campaigns-reports')
    await expect(reports.getByText('Export History')).toBeVisible()
    await expect(reports.getByText('campaign-summary-2026-04-25.md')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await reports.getByRole('button', { name: 'Download' }).first().click()
    const download = await downloadPromise

    expect(await download.suggestedFilename()).toBe('campaign-summary-2026-04-25.md')
    expect(await download.failure()).toBeNull()

    const downloadBody = campaignApiBodies.find(body => body.action === 'download-report-export')
    expect(downloadBody?.export_id).toBe('job-campaign-export-1')
  })

  test('campaign detail workspace edits and saves selected campaign strategy fields', async ({ page }) => {
    const updateBodies: Record<string, unknown>[] = []

    await page.route('**/rest/v1/campaigns*', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'campaign-detail-1',
              name: 'Detail Campaign',
              description: 'Initial description',
              offer_definition: 'Initial offer',
              target_audience: 'Initial audience',
              primary_cta: 'Initial CTA',
              keywords: ['initial'],
              start_date: '2026-04-01',
              end_date: '2026-04-30',
              cadence_rule: { preset: 'weekly', posts_per_week: 3 },
              status: 'active',
              created_by: 'qa-admin-user',
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            },
          ]),
        })
        return
      }

      if (request.method() === 'PATCH') {
        const payload = request.postDataJSON() as Record<string, unknown>
        updateBodies.push(payload)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'campaign-detail-1',
              name: payload.name || 'Detail Campaign',
              description: payload.description || 'Initial description',
              offer_definition: payload.offer_definition || 'Initial offer',
              target_audience: payload.target_audience || 'Initial audience',
              primary_cta: payload.primary_cta || 'Initial CTA',
              keywords: payload.keywords || ['initial'],
              start_date: payload.start_date || '2026-04-01',
              end_date: payload.end_date || '2026-04-30',
              cadence_rule: payload.cadence_rule || { preset: 'weekly', posts_per_week: 3 },
              status: payload.status || 'active',
              created_by: 'qa-admin-user',
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-25T00:00:00.000Z',
            },
          ]),
        })
        return
      }

      await route.fallback()
    })

    await page.route('**/rest/v1/campaign_content_items*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(1)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const campaignSection = page.locator('#campaigns-list')
    const detailCard = campaignSection.locator('article').filter({ hasText: 'Campaign Detail Workspace' }).first()
    await expect(detailCard).toBeVisible()
    await detailCard.getByLabel('Name').fill('Detail Campaign Updated')
    await detailCard.getByLabel('Primary CTA').fill('Book a 20-min call')
    await detailCard.getByLabel('Keywords (comma separated)').fill('execution, reliability')
    await detailCard.getByRole('button', { name: 'Save Campaign Detail' }).click()

    await expect.poll(() => updateBodies.length).toBe(1)
    expect(updateBodies[0]).toMatchObject({
      name: 'Detail Campaign Updated',
      primary_cta: 'Book a 20-min call',
      keywords: ['execution', 'reliability'],
    })
    await expect(page.getByText('Campaign details saved.')).toBeVisible()
  })

  test('calendar timeline open content resets library filters and focuses content card', async ({ page }) => {
    const scheduledFor = new Date().toISOString()

    await page.route('**/rest/v1/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'campaign-focus-1',
            name: 'Focus Campaign',
            description: '',
            offer_definition: '',
            target_audience: '',
            primary_cta: '',
            keywords: [],
            start_date: null,
            end_date: null,
            cadence_rule: null,
            status: 'active',
            created_by: 'qa-admin-user',
            created_at: '2026-04-01T00:00:00.000Z',
            updated_at: '2026-04-01T00:00:00.000Z',
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_content_items*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'focus-claimed-item',
            title: 'Focus Claimed Item',
            body: 'Focus body text',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-focus-1',
            status: 'claimed',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: 'qa-admin-user',
            reviewer_id: null,
            scheduled_for: scheduledFor,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-10T10:00:00.000Z',
            updated_at: '2026-04-10T10:00:00.000Z',
            archived_at: null,
          },
          {
            id: 'focus-draft-item',
            title: 'Focus Draft Item',
            body: 'Draft body text',
            content_type: 'linkedin-post',
            topic: 'Ops',
            campaign_id: 'campaign-focus-1',
            status: 'draft',
            intended_channel: 'linkedin',
            attributed_author_id: null,
            posting_owner_id: null,
            reviewer_id: null,
            scheduled_for: null,
            posted_at: null,
            post_url: null,
            rejection_reason: null,
            created_by: 'qa-admin-user',
            created_at: '2026-04-09T10:00:00.000Z',
            updated_at: '2026-04-09T10:00:00.000Z',
            archived_at: null,
          },
        ]),
      })
    })
    await page.route('**/rest/v1/campaign_assets*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/rest/v1/campaign_activity_log*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/campaigns**', async route => {
      const request = route.request()
      if (request.method() === 'GET') {
        const url = new URL(request.url())
        if (url.searchParams.get('resource') === 'exports') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, items: [] }),
          })
          return
        }
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as CampaignApiBody
        if (body.action === 'get-report-summary') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(metricsResponse(2)),
          })
          return
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await gotoAndSettle(page, '/campaigns')

    const contentSection = page.locator('#campaigns-content')
    await contentSection.getByLabel('Filter status').selectOption('draft')
    await expect(contentSection.getByText('Showing 1 of 2 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Focus Claimed Item' })).toHaveCount(0)

    const calendarSection = page.locator('#campaigns-calendar')
    await calendarSection
      .locator('.campaign-timeline-item')
      .filter({ hasText: 'Focus Claimed Item' })
      .getByRole('button', { name: 'Open Content' })
      .click()

    await expect(contentSection.getByText('Showing 2 of 2 items.')).toBeVisible()
    await expect(contentSection.getByRole('heading', { name: 'Focus Claimed Item' })).toBeVisible()
    await expect(contentSection.locator('article').filter({ hasText: 'Focus Claimed Item' }).first()).toHaveClass(/campaign-card-focus/)
  })
})
