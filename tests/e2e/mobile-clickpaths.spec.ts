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

async function expectNoHorizontalOverflow(page: Page, scope: string) {
  const dimensions = await page.evaluate(() => {
    const width = window.innerWidth
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body ? document.body.scrollWidth : 0,
    )
    return { width, scrollWidth }
  })

  expect(
    dimensions.scrollWidth - dimensions.width,
    `${scope} overflows horizontally on mobile`,
  ).toBeLessThanOrEqual(8)
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

test.describe('mobile click-path audit', () => {
  test.beforeEach(async ({ page }) => {
    await seedQaAuth(page)
    await mockCampaignSupabaseReads(page)
  })

  test('hub routes all module links correctly on mobile', async ({ page }) => {
    await gotoAndSettle(page, '/')

    const links = [
      { name: 'Account Strategy & Planning', expectedUrl: /\/accounts\/?$/ },
      { name: 'HR & People Ops', expectedUrl: /\/hr\/?$/ },
      { name: 'SDR & Outreach', expectedUrl: /\/sdr\/?$/ },
      { name: 'Slide Editor', expectedUrl: /\/slides\/?$/ },
      { name: 'Campaign Content & Posting', expectedUrl: /\/campaigns\/?$/ },
      { name: 'Admin', expectedUrl: /\/admin\/?$/ },
    ]

    for (const link of links) {
      await expect(page.getByRole('link', { name: link.name })).toBeVisible()
      await page.getByRole('link', { name: link.name }).click()
      await expect(page).toHaveURL(link.expectedUrl)
      await expectNoHorizontalOverflow(page, `route ${link.expectedUrl}`)
      await gotoAndSettle(page, '/')
    }
  })

  test('all primary routes render mobile-safe shells', async ({ page }) => {
    const routes = [
      { path: '/', text: 'Internal Operations Hub', expectedUrl: /\/$/ },
      { path: '/accounts', text: 'All Accounts', expectedUrl: /\/accounts\/?$/ },
      { path: '/hr', text: 'HR & People Ops', expectedUrl: /\/hr\/?$/ },
      { path: '/sdr', text: 'SDR & Outreach', expectedUrl: /\/sdr\/?$/ },
      { path: '/slides', text: 'Slide Editor', expectedUrl: /\/slides\/?$/ },
      { path: '/campaigns', text: 'Campaign Content & Posting', expectedUrl: /\/campaigns\/?$/ },
      { path: '/admin', text: 'Admin', expectedUrl: /\/admin\/?$/ },
      { path: '/design-system', text: 'Design System', expectedUrl: /\/design-system\/?$/ },
    ]

    for (const route of routes) {
      await gotoAndSettle(page, route.path)
      await expect(page).toHaveURL(route.expectedUrl)
      await expect(page.getByText(route.text).first()).toBeVisible()
      await expect(page.locator('body')).not.toBeEmpty()
      await expectNoHorizontalOverflow(page, route.path)
    }
  })

  test('core module interactions remain accessible on mobile', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')
    await page.locator('.account-card').first().click()
    await expect(page.locator('#account-name-heading')).toBeVisible()
    await expectNoHorizontalOverflow(page, '/accounts detail')

    await gotoAndSettle(page, '/hr')
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByLabel('Message or command')).toBeVisible()
    await expectNoHorizontalOverflow(page, '/hr')

    await gotoAndSettle(page, '/sdr')
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByRole('button', { name: 'Open Draft Queue' }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page, '/sdr')

    await gotoAndSettle(page, '/slides')
    await expect(page.getByRole('heading', { name: 'HTML to Editable Components' })).toBeVisible()
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByLabel('Message or command')).toBeVisible()
    await expectNoHorizontalOverflow(page, '/slides')

    await gotoAndSettle(page, '/campaigns')
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible()
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByLabel('Message or command')).toBeVisible()
    await expect(page.getByText('Report Filters')).toBeVisible()
    await expectNoHorizontalOverflow(page, '/campaigns')

    await gotoAndSettle(page, '/admin')
    await expect(page.getByRole('heading', { name: 'User Access' })).toBeVisible()
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByLabel('Message or command')).toBeVisible()
    await expectNoHorizontalOverflow(page, '/admin')
  })
})
