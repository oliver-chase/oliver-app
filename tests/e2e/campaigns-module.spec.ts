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
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Overdue claimed item')

    await calendarSection.getByLabel('Sort claimed content').selectOption('latest')
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Future claimed item')

    await calendarSection.getByLabel('Filter claimed timing').selectOption('overdue')
    await expect(calendarSection.getByText('Showing 1 of 3 claimed items.')).toBeVisible()
    await expect(calendarItems).toHaveCount(1)
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Overdue claimed item')

    await calendarSection.getByLabel('Filter claimed timing').selectOption('all')
    await calendarSection.getByLabel('Filter claimed channel').selectOption('email')
    await expect(calendarSection.getByText('Showing 1 of 3 claimed items.')).toBeVisible()
    await expect(calendarItems.nth(0).getByRole('heading', { level: 3 })).toHaveText('Future claimed item')

    await calendarSection.getByRole('button', { name: 'Reset Calendar Filters' }).click()
    await expect(calendarSection.getByText('Showing 3 of 3 claimed items.')).toBeVisible()
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
})
