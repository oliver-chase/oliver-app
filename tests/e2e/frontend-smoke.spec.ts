import { test, expect, type Page } from '@playwright/test'

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

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
      page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides'],
      created_at: '2026-04-23T00:00:00.000Z',
      updated_at: '2026-04-23T00:00:00.000Z',
      ...appUserOverrides,
    }

    window.localStorage.setItem('qa-app-user', JSON.stringify(appUser))
  }, { appUserOverrides: appUserOverrides ?? null })
}

test.describe('frontend smoke', () => {
  test.beforeEach(async ({ page }) => {
    await seedQaAuth(page)
  })

  test('hub cards and admin links navigate correctly', async ({ page }) => {
    await gotoAndSettle(page, '/')

    await expect(page.getByText('V.Two Ops')).toBeVisible()
    await expect(page.locator('[data-hub-columns="2"]')).toBeVisible()
    await expect(page.locator('[data-hub-col="left"] > *')).toHaveCount(4)
    await expect(page.locator('[data-hub-col="right"] > *')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Account Strategy & Planning' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'HR & People Ops' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'SDR & Outreach' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Slide Editor' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Design System' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible()
    await expect(page.getByLabel('Open Admin dashboard')).toBeVisible()

    await page.getByRole('link', { name: 'Account Strategy & Planning' }).click()
    await expect(page).toHaveURL(/\/accounts\/?$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'HR & People Ops' }).click()
    await expect(page).toHaveURL(/\/hr\/?$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'SDR & Outreach' }).click()
    await expect(page).toHaveURL(/\/sdr\/?$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'Slide Editor' }).click()
    await expect(page).toHaveURL(/\/slides\/?$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'Design System' }).scrollIntoViewIfNeeded()
    await page.getByRole('link', { name: 'Design System' }).click()
    await expect(page).toHaveURL(/\/design-system\/?$/)

    await page.goto('/')
    await page.getByRole('link', { name: 'Admin', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/?$/)
  })

  test('major routes render a non-empty shell', async ({ page }) => {
    const routes = [
      { path: '/', text: 'Internal Operations Hub' },
      { path: '/accounts', text: 'All Accounts' },
      { path: '/hr', text: 'HR & People Ops' },
      { path: '/sdr', text: 'SDR & Outreach' },
      { path: '/slides', text: 'Slide Editor' },
      { path: '/crm', text: 'CRM' },
      { path: '/admin', text: 'Admin' },
      { path: '/design-system', text: 'Design System' },
    ]

    for (const route of routes) {
      await gotoAndSettle(page, route.path)
      await expect(page.getByText(route.text).first()).toBeVisible()
      await expect(page.locator('body')).not.toBeEmpty()
    }
  })

  test('accounts shell controls are present and consistent', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')

    await expect(page.locator('header.topbar')).toBeVisible()
    await expect(page.locator('#topbar-account')).toHaveText('Account Strategy')
    await expect(page.getByRole('link', { name: /Back to Hub/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /\+ Add Account/ })).toBeVisible()
    await expect(page.getByText('Norwegian Cruise Line')).toBeVisible()
  })

  test('accounts detail view exposes section nav and active state', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')

    await page.locator('.account-card').first().click()
    await expect(page.locator('#account-name-heading')).toHaveText('NCL')
    await expect(page.locator('#account-name-heading')).toHaveAttribute('contenteditable', 'true')
    await expect(page.locator('#topbar-account')).toHaveText('Account Strategy')
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'People' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Notes' })).toBeVisible()
    await expect(page.locator('#topbar-nav a.active')).toHaveText('Overview')

    await page.getByRole('link', { name: 'Notes' }).click()
    await expect(page.locator('#topbar-nav a.active')).toHaveText('Notes')
    await expect(page.locator('#notes')).toBeVisible()
  })

  test('hr sidebar and section navigation work', async ({ page }) => {
    await gotoAndSettle(page, '/hr')

    await expect(page.getByText('HR & People Ops').first()).toBeVisible()
    await page.getByRole('button', { name: 'Directory' }).first().click()
    await expect(page.locator('.page-title').filter({ hasText: 'Directory' })).toBeVisible()
    await page.getByRole('button', { name: 'Inventory' }).first().click()
    await expect(page.getByText('Device Inventory')).toBeVisible()
    await page.getByRole('button', { name: 'Settings' }).first().click()
    await expect(page.locator('.page-title').filter({ hasText: 'Settings' })).toBeVisible()
  })

  test('hr search modal and settings tabs behave correctly', async ({ page }) => {
    await gotoAndSettle(page, '/hr')

    await page.getByLabel('Search (press / )').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByLabel('Search query').fill('John')
    await expect(page.locator('.gs-item').first()).toBeVisible()
    await page.locator('.gs-item').first().click()
    await expect(page.locator('.page-title').filter({ hasText: 'Hiring Pipeline' })).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).first().click()
    await expect(page.getByRole('button', { name: 'Dropdowns' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Data & Export' })).toBeVisible()
    await page.getByRole('button', { name: 'Data & Export' }).click()
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible()
  })

  test('hiring no longer exposes receipt upload button', async ({ page }) => {
    await gotoAndSettle(page, '/hr')
    await page.getByRole('button', { name: 'Hiring' }).first().click()
    await expect(page.locator('.page-title').filter({ hasText: 'Hiring Pipeline' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Receipt Upload' })).toHaveCount(0)
  })

  test('candidate edit modal exposes resume version controls', async ({ page }) => {
    await gotoAndSettle(page, '/hr')
    await page.getByRole('button', { name: 'Hiring' }).first().click()
    await expect(page.locator('.kanban-card').first()).toBeVisible()
    await page.locator('.kanban-card').first().click()
    await page.locator('#cand-detail .detail-header .btn.btn-sm.btn-ghost').first().click()
    await expect(page.getByRole('button', { name: 'Add Link' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload File' })).toBeVisible()
  })

  test('hr chatbot shows upload only in inventory and profile command routes to profile page', async ({ page }) => {
    await gotoAndSettle(page, '/hr')

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByRole('button', { name: 'Upload file' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Profile Settings' }).first().click()
    await expect(page).toHaveURL(/\/profile\/?$/)

    await gotoAndSettle(page, '/hr')
    await page.getByRole('button', { name: 'Inventory' }).first().click()
    await expect(page.getByText('Device Inventory')).toBeVisible()
    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await expect(page.getByRole('button', { name: 'Upload file' })).toBeVisible()
  })

  test('inventory detail exposes receipt artifact management controls', async ({ page }) => {
    await gotoAndSettle(page, '/hr')
    await page.getByRole('button', { name: 'Inventory' }).first().click()
    await expect(page.getByText('Device Inventory')).toBeVisible()
    await page.locator('.device-card').first().click()
    const detail = page.getByRole('dialog').first()
    await expect(page.getByText(/Receipts \(/)).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Add Link' })).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Upload File', exact: true })).toBeVisible()
  })

  test('sdr tabs and refresh control work', async ({ page }) => {
    await gotoAndSettle(page, '/sdr')

    await expect(page.getByText('SDR & Outreach').first()).toBeVisible()
    await page.locator('.app-sidebar-item', { hasText: 'Prospects' }).click()
    await expect(page.getByText('Prospects').nth(1)).toBeVisible()
    await page.locator('.app-sidebar-item', { hasText: 'Drafts' }).click()
    await expect(page.getByText('Drafts').nth(1)).toBeVisible()
    await page.getByLabel('Refresh data').click()
    await expect(page.getByText(/Loading|Synced|Error/).first()).toBeVisible()
  })

  test('admin tabs switch and design system link works', async ({ page }) => {
    await gotoAndSettle(page, '/admin')

    await expect(page.getByText('Admin').first()).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin navigation"]').getByRole('link', { name: 'Admin Dashboard', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Design System' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Design Tokens', exact: true }).click()
    await expect(page.locator('input').first()).toBeVisible()
    await page.getByRole('button', { name: 'Components', exact: true }).click()
    await expect(page.getByText('Badges')).toBeVisible()
    await page.getByRole('link', { name: 'Open Design System' }).click()
    await expect(page).toHaveURL(/\/design-system\/?$/)
  })

  test('design system interactive controls behave consistently', async ({ page }) => {
    await gotoAndSettle(page, '/design-system')

    await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible()
    await page.locator('button.deadAuditToggle').click()
    await expect(page.getByText(/Colors \(|Spacing \(|Layout \(/).first()).toBeVisible()

    const copyButton = page.locator('button.copyToken').first()
    await copyButton.click()
    await expect(copyButton).toContainText('Copied!')

    const picker = page.getByRole('combobox').first()
    await picker.click()
    await expect(page.locator('.app-popover-list').first()).toBeVisible()

    await page.getByRole('button', { name: 'Open ConfirmModal' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Buttons' }).click()
    await expect(page.getByText('Standard sizes')).toBeVisible()
    await expect(page.getByText('All variants — static')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Chips & Badges' }).click()
    await expect(page.getByText('All variants — static')).toBeVisible()
  })

  test('design system renders dynamic inventories from registries', async ({ page }) => {
    await gotoAndSettle(page, '/design-system')

    await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible()
    await page.getByRole('link', { name: 'Dynamic Inventories' }).click()
    await expect(page.getByText('Module Registry')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Slide Editor' }).first()).toBeVisible()
    await expect(page.getByText('Admin Navigation Registry')).toBeVisible()
    await expect(page.getByText('Component Contract Catalog')).toBeVisible()
  })

  test('slides module parses pasted html into component json', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await expect(page.getByRole('heading', { name: 'HTML to Editable Components' })).toBeVisible()
    const rawHtml = `<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;font-size:64px;color:#FEFFFF;">Hello</h1>
      <div class="card" style="position:absolute;left:120px;top:260px;width:420px;">Card Body</div>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText(/Canvas:\s*1920 × 1080/)).toBeVisible()
    await expect(page.getByText(/Components:\s*2/)).toBeVisible()
    await expect(page.locator('.slides-code')).toContainText('"type": "heading"')
    await expect(page.locator('.slides-code')).toContainText('"type": "card"')
  })

  test('slides import sanitizes markup and warns on unsupported units/transforms', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1280px;height:720px;">
      <div class="heading" style="position:absolute;left:10%;top:72px;width:640px;transform:rotate(3deg)" onclick="alert('x')">
        <a href="javascript:alert(1)" onclick="evil()">Hello<script>alert('bad')</script></a>
      </div>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText(/Canvas:\s*1920 × 1080/)).toBeVisible()
    await expect(page.getByText(/Normalized imported canvas from 1280x720 to 1920x1080/)).toBeVisible()
    await expect(page.getByText(/unsupported left unit/i)).toBeVisible()
    await expect(page.getByText(/unsupported transform/i)).toBeVisible()

    const parsedComponents = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(Array.isArray(parsedComponents)).toBe(true)
    expect(parsedComponents).toHaveLength(1)
    expect(parsedComponents[0]?.width).toBe(960)
    expect(parsedComponents[0]?.x).toBe(0)
    expect(String(parsedComponents[0]?.content || '')).not.toContain('<script')
    expect(String(parsedComponents[0]?.content || '')).not.toContain('onclick=')
    expect(String(parsedComponents[0]?.content || '')).not.toContain('javascript:')
  })

  test('slides import normalizes coordinates and applies simple translate offsets', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1280px;height:720px;">
      <h1 style="position:absolute;left:128px;top:72px;width:640px;transform:translate(10px,-20px)">Hello</h1>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    const parsedComponents = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(parsedComponents).toHaveLength(1)
    expect(parsedComponents[0]?.x).toBe(207)
    expect(parsedComponents[0]?.y).toBe(78)
    expect(parsedComponents[0]?.width).toBe(960)
  })

  test('non-admin user cannot access admin and does not see admin links', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await seedQaAuth(page, {
      user_id: 'qa-member-user',
      email: 'qa-member@example.com',
      name: 'QA Member',
      role: 'member',
      page_permissions: ['accounts', 'hr'],
    })

    await gotoAndSettle(page, '/')
    await expect(page.locator('[data-hub-columns="1"]')).toBeVisible()
    await expect(page.locator('[data-hub-col="left"] > *')).toHaveCount(2)
    await expect(page.locator('[data-hub-col="right"]')).toHaveCount(0)
    await expect(page.getByLabel('Open Admin dashboard')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Design System' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'SDR & Outreach' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Slide Editor' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Account Strategy & Planning' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'HR & People Ops' })).toBeVisible()

    await gotoAndSettle(page, '/admin')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()

    await gotoAndSettle(page, '/slides')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()

    await gotoAndSettle(page, '/design-system')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()
    await context.close()
  })
})
