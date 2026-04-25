import { test, expect, type Page } from '@playwright/test'
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
    await expect(page.locator('[data-hub-columns="1"]')).toBeVisible()
    await expect(page.locator('[data-hub-col="left"] > *')).toHaveCount(4)
    await expect(page.locator('[data-hub-col="right"]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Account Strategy & Planning' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'HR & People Ops' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'SDR & Outreach' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Slide Editor' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'CRM & Business Development' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Account Strategy & Planning' }).click()
    await expect(page).toHaveURL(/\/accounts\/?$/)

    await gotoAndSettle(page, '/')
    await page.getByRole('link', { name: 'HR & People Ops' }).click()
    await expect(page).toHaveURL(/\/hr\/?$/)

    await gotoAndSettle(page, '/')
    await page.getByRole('link', { name: 'SDR & Outreach' }).click()
    await expect(page).toHaveURL(/\/sdr\/?$/)

    await gotoAndSettle(page, '/')
    await page.getByRole('link', { name: 'Slide Editor' }).click()
    await expect(page).toHaveURL(/\/slides\/?$/)

    await gotoAndSettle(page, '/')
    await page.getByRole('link', { name: 'Admin', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/?$/)
    await page
      .locator('nav[aria-label="Admin navigation"]')
      .getByRole('link', { name: 'Design System', exact: true })
      .click()
    await expect(page).toHaveURL(/\/design-system\/?$/)
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

  test('accounts chatbot fuzzy aliases start flows and profile intents route to profile', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    const input = page.getByLabel('Message or command')

    await input.fill('add client')
    await input.press('Enter')
    await expect(page.getByText(/Short name\?/)).toBeVisible()

    await page.getByRole('button', { name: 'Start over' }).click()
    await input.fill('change password')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/profile\/?$/)
  })

  test('accounts export panel explains use case and downloads without popup redirects', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')

    await page.locator('.account-card').first().click()
    let popupOpened = false
    page.once('popup', () => { popupOpened = true })

    await page.getByRole('button', { name: 'Export Plan' }).click()
    const dialog = page.getByRole('dialog', { name: 'Export Account Plan' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Use this when you need a print-ready account brief outside the app.')
    await expect(dialog).toContainText('Open it in a browser and use Print to save as PDF if needed.')

    await dialog.getByLabel('Account overview & revenue').check()
    await expect(dialog.getByText(/Current selection: .*overview/i)).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Download Print-Ready Plan' }).click()
    const download = await downloadPromise

    expect(await download.suggestedFilename()).toMatch(/\.html$/)
    expect(await download.failure()).toBeNull()
    expect(popupOpened).toBeFalsy()
    await expect(dialog).toHaveCount(0)
  })

  test('accounts chatbot export flow downloads directly without opening the page export modal', async ({ page }) => {
    await gotoAndSettle(page, '/accounts')

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    const input = page.getByLabel('Message or command')
    await input.fill('export pdf')
    await input.press('Enter')

    await expect(page.getByText(/Which account\?/)).toBeVisible()
    await page.getByRole('toolbar', { name: 'account_id' }).getByRole('button', { name: 'NCL' }).click()
    await expect(page.getByText('What export do you need?')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Export Account Plan' })).toHaveCount(0)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Full Account Plan' }).click()
    const download = await downloadPromise

    expect(await download.suggestedFilename()).toMatch(/\.html$/)
    expect(await download.failure()).toBeNull()
    await expect(page.getByText(/Downloaded .*\.html\./)).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Export Account Plan' })).toHaveCount(0)
  })

  test('accounts chatbot transcript upload can be reviewed and written through confirm-write', async ({ page }) => {
    const confirmWriteBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/confirm-write', async route => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      confirmWriteBodies.push(body)
      const dryRun = body.dryRun === true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dryRun
          ? {
              conflicts: [],
              summary: { notes: 2, decisions: 1, actions: 1, people: 0, projects: 0, opportunities: 0 },
              written: false,
            }
          : {
              conflicts: [],
              summary: { notes: 2, decisions: 1, actions: 1, people: 0, projects: 0, opportunities: 0 },
              written: true,
              message: 'Import saved to the account workspace.',
            }),
      })
    })

    await gotoAndSettle(page, '/accounts')
    await page.locator('.account-card').first().click()
    await page.getByRole('button', { name: 'Open Oliver' }).click()

    const transcript = [
      'Meeting: Weekly Account Review',
      'Date: 2026-04-24',
      'Alice Johnson: We decided to expand the pilot.',
      'Bob Smith: Alice will send the revised rollout plan.',
    ].join('\n')

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Upload file' }).click()
    const chooser = await chooserPromise
    await chooser.setFiles({
      name: 'weekly-account-review.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(transcript),
    })

    await expect(page.getByText('Transcript (client-parsed)')).toBeVisible()
    await expect(page.getByText(/Parsed locally — no API call\. Confirm to save\./)).toBeVisible()

    await page.getByRole('button', { name: 'Review & Edit' }).click()
    const reviewDialog = page.getByRole('dialog', { name: 'Review Transcript' })
    await expect(reviewDialog).toBeVisible()
    await reviewDialog.getByPlaceholder('Meeting title').fill('Weekly Account Review Revised')
    await reviewDialog.getByRole('button', { name: 'Save & Continue' }).click()

    await expect(page.getByText(/Ready to write:/)).toBeVisible()
    await expect(page.getByText(/actions:\s*1/i)).toBeVisible()

    await page.getByRole('button', { name: 'Confirm & Write' }).click()
    await expect(page.getByText('Import saved to the account workspace.')).toBeVisible()
    await expect(page.getByText(/Do you want me to create reminders or add calendar entries/)).toBeVisible()

    expect(confirmWriteBodies).toHaveLength(2)
    expect(confirmWriteBodies[0]?.dryRun).toBe(true)
    expect(confirmWriteBodies[1]?.dryRun).toBe(false)
    expect(confirmWriteBodies[0]?.accountId).toBeTruthy()
    expect(confirmWriteBodies[0]?.accountId).toBe(confirmWriteBodies[1]?.accountId)
    expect(((confirmWriteBodies[0]?.payload as Record<string, unknown>)?.metadata as Record<string, unknown>)?.title).toBe('Weekly Account Review Revised')
    expect(Array.isArray((confirmWriteBodies[1]?.payload as Record<string, unknown>)?.actions)).toBe(true)
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

  test('sdr chatbot quick commands route to intended tabs', async ({ page }) => {
    await gotoAndSettle(page, '/sdr')

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    await page.getByRole('button', { name: 'Open Draft Queue' }).first().click()
    await expect(page.locator('.page-title').filter({ hasText: 'Drafts' })).toBeVisible()

    await page.getByRole('button', { name: 'Open Outreach' }).first().click()
    await expect(page.getByText('Outreach').nth(1)).toBeVisible()
  })

  test('sdr prospect detail exposes pipeline edit controls', async ({ page }) => {
    await gotoAndSettle(page, '/sdr')

    await page.locator('.app-sidebar-item', { hasText: 'Prospects' }).click()
    const prospectCards = page.locator('.sdr-prospect-card')
    const count = await prospectCards.count()
    if (count === 0) return
    await prospectCards.first().click()
    await expect(page.locator('[data-testid="sdr-pipeline-editor"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Pipeline Changes' })).toBeVisible()
  })

  test('sdr pipeline editor saves changes through the backend patch route', async ({ page }) => {
    let patchBody: unknown = null
    await page.route('**/api/sdr-prospects', async route => {
      patchBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, prospect: null }),
      })
    })

    await gotoAndSettle(page, '/sdr')
    await page.locator('.app-sidebar-item', { hasText: 'Prospects' }).click()
    const prospectCards = page.locator('.sdr-prospect-card')
    const count = await prospectCards.count()
    if (count === 0) return

    await prospectCards.first().click()
    const editor = page.locator('[data-testid="sdr-pipeline-editor"]')
    await expect(editor).toBeVisible()

    const commentField = editor.locator('textarea')
    const originalComment = await commentField.inputValue()
    const nextComment = originalComment
      ? originalComment + ' | QA smoke save'
      : 'QA smoke pipeline save verified'
    await commentField.fill(nextComment)
    await page.getByRole('button', { name: 'Save Pipeline Changes' }).click()

    await expect(page.getByText('Pipeline fields saved.')).toBeVisible()
    if (!patchBody) {
      throw new Error('Expected /api/sdr-prospects to receive a PATCH payload.')
    }
    const savedPatch = patchBody as Record<string, unknown>
    expect(typeof savedPatch.id).toBe('string')
    expect((savedPatch.patch as Record<string, unknown>).lc).toBe(nextComment)
    expect(typeof (savedPatch.patch as Record<string, unknown>).lu).toBe('string')
  })

  test('crm route stays in explicit coming-soon mode without CRUD controls', async ({ page }) => {
    await gotoAndSettle(page, '/crm')

    await expect(page.getByText('Coming Soon')).toBeVisible()
    await expect(page.locator('.app-sidebar-item.active').getByText('Overview')).toBeVisible()
    await expect(page.getByRole('link', { name: /Back to Hub/ })).toBeVisible()
    await expect(page.locator('#main-content').locator('input, textarea, [role="combobox"]')).toHaveCount(0)
  })

  test('admin workspace keeps design-system navigation in the admin sidebar', async ({ page }) => {
    await gotoAndSettle(page, '/admin')

    await expect(page.getByText('Admin').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'User Access' })).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin navigation"]').getByRole('link', { name: 'Admin Dashboard', exact: true })).toBeVisible()
    await expect(page.locator('nav[aria-label="Admin navigation"]').getByRole('link', { name: 'Design System', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Design Tokens', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Open Design System' })).toHaveCount(0)
    await page
      .locator('nav[aria-label="Admin navigation"]')
      .getByRole('link', { name: 'Design System', exact: true })
      .click()
    await expect(page).toHaveURL(/\/design-system\/?$/)
  })

  test('owner rows are locked in user manager controls', async ({ page }) => {
    await page.route('**/api/users**', async route => {
      const request = route.request()
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            user_id: 'owner-user-id',
            email: 'owner@example.com',
            name: 'Kiana Micari',
            role: 'admin',
            page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides'],
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
            is_owner: true,
          },
          {
            user_id: 'normal-user-id',
            email: 'member@example.com',
            name: 'Member User',
            role: 'user',
            page_permissions: ['accounts'],
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
          },
        ]),
      })
    })

    await gotoAndSettle(page, '/admin')
    await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeVisible()

    const ownerRow = page.locator('tbody tr').filter({ hasText: 'owner@example.com' })
    await expect(ownerRow).toHaveCount(1)
    await expect(ownerRow.locator('[class*=ownerTag]')).toHaveText('Owner')
    await expect(ownerRow.getByRole('combobox')).toBeDisabled()
    await expect(ownerRow.getByText('Owner access is immutable.')).toBeVisible()

    const memberRow = page.locator('tbody tr').filter({ hasText: 'member@example.com' })
    await expect(memberRow).toHaveCount(1)
    await expect(memberRow.getByRole('combobox')).toBeEnabled()
  })

  test('design system interactive controls behave consistently', async ({ page }) => {
    await gotoAndSettle(page, '/design-system')

    await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible()
    const backToTop = page.getByRole('button', { name: 'Back to top' })
    await expect(backToTop).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await backToTop.click()
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeLessThan(40)

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

  test('US-SLD-003 slides module parses pasted html into component json', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await expect(page.getByRole('heading', { name: 'HTML to Editable Components' })).toBeVisible()
    await expect(page.getByText(/Import slide HTML, review parser output, and edit directly on a scaled 16:9 canvas/)).toBeVisible()
    const rawHtml = `<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;font-size:64px;color:#FEFFFF;">Hello</h1>
      <div class="card" style="position:absolute;left:120px;top:260px;width:420px;">Card Body</div>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText('Parse complete.')).toBeVisible()
    await expect(page.getByText(/Canvas:\s*1920 × 1080/)).toBeVisible()
    await expect(page.getByText(/Components:\s*2/)).toBeVisible()
    await expect(page.locator('.slides-component-grid-row')).toHaveCount(2)
    await expect(page.locator('.slides-component-grid-row').first()).toContainText('heading')
    await expect(page.locator('.slides-component-grid-row').nth(1)).toContainText('card')
  })

  test('US-SLD-003 slides import sanitizes markup and warns on unsupported units/transforms', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1280px;height:720px;">
      <div class="heading" style="position:absolute;left:10%;top:72px;width:640px;transform:rotate(3deg)" onclick="alert('x')">
        <a href="javascript:alert(1)" onclick="evil()">Hello<script>alert('bad')</script></a>
      </div>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText('Parse complete.')).toBeVisible()
    await expect(page.getByText(/Canvas:\s*1920 × 1080/)).toBeVisible()
    await expect(page.getByText(/Normalized imported canvas from 1280x720 to 1920x1080/)).toBeVisible()
    await expect(page.getByText(/unsupported left unit/i)).toBeVisible()
    await expect(page.getByText(/unsupported transform/i)).toBeVisible()

    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsedComponents = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(Array.isArray(parsedComponents)).toBe(true)
    expect(parsedComponents).toHaveLength(1)
    expect(parsedComponents[0]?.width).toBe(960)
    expect(parsedComponents[0]?.x).toBe(0)
    expect(String(parsedComponents[0]?.content || '')).not.toContain('<script')
    expect(String(parsedComponents[0]?.content || '')).not.toContain('onclick=')
    expect(String(parsedComponents[0]?.content || '')).not.toContain('javascript:')
  })

  test('US-SLD-003 slides import normalizes coordinates and applies simple translate offsets', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1280px;height:720px;">
      <h1 style="position:absolute;left:128px;top:72px;width:640px;transform:translate(10px,-20px)">Hello</h1>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText('Parse complete.')).toBeVisible()
    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsedComponents = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(parsedComponents).toHaveLength(1)
    expect(parsedComponents[0]?.x).toBe(207)
    expect(parsedComponents[0]?.y).toBe(78)
    expect(parsedComponents[0]?.width).toBe(960)
  })

  test('US-SLD-029 slides chatbot commands cover parse, save, export, and workspace navigation intents', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:120px;top:120px;width:900px;">Chatbot Coverage</h1>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    const input = page.getByLabel('Message or command')

    await input.fill('parse slide html')
    await input.press('Enter')
    await expect(page.getByText(/Parse current editor HTML or paste new HTML in chat\?/)).toBeVisible()
    await page.getByRole('button', { name: 'Use current editor HTML' }).click()
    await expect(page.getByText(/Parsed 1 components on a 1920x1080 canvas\./)).toBeVisible()

    await input.fill('save slide')
    await input.press('Enter')
    await expect(page.getByText(/Save with the current title or set a custom title first\?/)).toBeVisible()
    await page.getByRole('button', { name: 'Use current title' }).click()
    await expect(page.getByText(/Saved "Untitled Slide" \(revision 1\)\./)).toBeVisible()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await input.fill('generate html export')
    await input.press('Enter')
    await expect(page.getByText(/Generated export HTML/)).toBeVisible()
    await expect(page.locator('#slides-export-html')).toHaveValue(/slide-canvas/)

    await input.fill('show templates')
    await input.press('Enter')
    await expect(page.getByRole('heading', { name: 'Template Library' })).toBeVisible()

    await input.fill('show activity')
    await input.press('Enter')
    await expect(page.getByRole('heading', { name: 'Slide Operations' })).toBeVisible()

    await input.fill('show saved slides')
    await input.press('Enter')
    await expect(page.getByRole('heading', { name: 'My Slides' })).toBeVisible()
  })

  test('US-SLD-040 slides chatbot can download HTML export directly without dead-end follow-up', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const rawHtml = `<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:120px;top:120px;width:900px;">Command Export</h1>
    </div>`
    await page.locator('#slides-raw-html').fill(rawHtml)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.getByRole('button', { name: 'Open Oliver' }).click()
    const input = page.getByLabel('Message or command')

    const downloadPromise = page.waitForEvent('download')
    await input.fill('download html export')
    await input.press('Enter')
    const download = await downloadPromise

    expect(await download.suggestedFilename()).toMatch(/\.html$/)
    expect(await download.failure()).toBeNull()
    await expect(page.getByText(/Downloaded HTML export/)).toBeVisible()
  })

  test('non-admin user cannot access admin and does not see admin links', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await seedQaAuth(page, {
      user_id: 'qa-member-user',
      email: 'qa-member@example.com',
      name: 'QA Member',
      role: 'user',
      page_permissions: ['accounts', 'hr'],
    })

    await gotoAndSettle(page, '/', { waitUntil: 'domcontentloaded', settle: false })
    await expect(page.getByRole('link', { name: 'SDR & Outreach' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Slide Editor' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'CRM & Business Development' })).toHaveCount(0)
    await page.waitForLoadState('networkidle')

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

    await gotoAndSettle(page, '/sdr')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()

    await gotoAndSettle(page, '/crm')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()

    await gotoAndSettle(page, '/accounts')
    await expect(page).toHaveURL(/\/accounts\/?$/)
    await expect(page.getByText('All Accounts').first()).toBeVisible()

    await gotoAndSettle(page, '/hr')
    await expect(page).toHaveURL(/\/hr\/?$/)
    await expect(page.getByText('HR & People Ops').first()).toBeVisible()

    await gotoAndSettle(page, '/design-system')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Internal Operations Hub')).toBeVisible()
    await context.close()
  })
})
