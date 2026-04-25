import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

function seedQaAuth(page: Page) {
  return page.addInitScript(() => {
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

    window.localStorage.setItem('qa-app-user', JSON.stringify({
      user_id: 'qa-admin-user',
      email: 'qa-admin@example.com',
      name: 'QA Admin',
      role: 'admin',
      page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides'],
      created_at: '2026-04-24T00:00:00.000Z',
      updated_at: '2026-04-24T00:00:00.000Z',
    }))
  })
}

test.describe('slides regression', () => {
  test.beforeEach(async ({ page }) => {
    await seedQaAuth(page)
  })

  test('US-SLD-010 preflight validation blocks empty and recovers on next parse', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText(/Import failed \(empty input\): Paste HTML before parsing\./)).toBeVisible()

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Hello</h1></div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByText(/Parse complete\./)).toBeVisible()
    await expect(page.getByText(/Components:\s*1/)).toBeVisible()
    await expect(page.getByText(/Import failed/)).toHaveCount(0)
  })

  test('US-SLD-011 and US-SLD-012 show structured warnings and support parse cancellation', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1280px;height:720px;">
      <div class="heading" style="position:absolute;left:10%;top:72px;width:640px;transform:rotate(3deg)">Hello</div>
    </div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()

    await expect(page.getByRole('button', { name: 'Cancel Parse' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel Parse' }).click()
    await expect(page.getByText('Import canceled.')).toBeVisible()

    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Units' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Transforms' })).toBeVisible()
    await expect(page.locator('.slides-component-grid-row')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Copy Parsed JSON' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible()
  })

  test('US-SLD-013 fixture round-trip keeps component count and coordinate drift within tolerance', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const fixture = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'slides', 'hero-with-card.html'), 'utf8')
    await page.locator('#slides-raw-html').fill(fixture)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const initial = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))

    await page.getByRole('button', { name: 'Generate HTML Export' }).click()
    const exported = await page.locator('#slides-export-html').inputValue()
    expect(exported).toContain('data-oliver-export-version="1"')
    expect(exported).toContain('data-oliver-slide-id="unsaved-slide"')

    await page.locator('#slides-raw-html').fill(exported)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const second = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(second.length).toBe(initial.length)

    for (let index = 0; index < initial.length; index += 1) {
      const before = initial[index]
      const after = second[index]
      expect(Math.abs((before?.x || 0) - (after?.x || 0))).toBeLessThanOrEqual(1)
      expect(Math.abs((before?.y || 0) - (after?.y || 0))).toBeLessThanOrEqual(1)
      expect(Math.abs((before?.width || 0) - (after?.width || 0))).toBeLessThanOrEqual(1)
    }
  })

  test('US-SLD-031 and US-SLD-032 save workflow populates My Slides and template duplication', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Saved Slide</h1></div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Q2 Narrative')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByText('Q2 Narrative')).toBeVisible()
    await page.getByRole('button', { name: 'Duplicate' }).first().click()
    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByText(/Q2 Narrative \(Copy\)/)).toBeVisible()

    await page.getByRole('button', { name: 'Template Library' }).click()
    await expect(page.getByText('Hero + Metric Row')).toBeVisible()
    await page.getByRole('button', { name: 'Duplicate to My Slides' }).first().click()

    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.locator('.slides-library-card')).toHaveCount(3)
  })

  test('US-SLD-034, US-SLD-035, and US-SLD-036 draft recovery and activity feed surface save/export events', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Activity Slide</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Audit Slide')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.getByRole('button', { name: 'Generate HTML Export' }).click()
    await page.getByRole('button', { name: 'Download HTML' }).click()
    await page.locator('#slides-raw-html').fill(`${html}\n<!-- unsaved draft marker -->`)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Recovered draft available/)).toBeVisible()
    await page.getByRole('button', { name: 'Discard' }).click()

    await page.getByRole('button', { name: 'Activity' }).click()
    await expect(page.getByText('save').first()).toBeVisible()
    await expect(page.getByText('export-html').first()).toBeVisible()
  })

  test('US-SLD-037 prompts before discarding unsaved changes during workspace navigation', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Unsaved Changes</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message().toLowerCase()).toContain('unsaved slide changes')
      await dialog.dismiss()
    })
    await page.getByRole('button', { name: 'My Slides' }).click()

    await expect(page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'My Slides' })).toHaveCount(0)

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByRole('heading', { name: 'My Slides' })).toBeVisible()
  })

  test('US-SLD-038 draft recovery appears for unsaved work and clears after successful save', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Draft Lifecycle</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Recovered draft available/)).toBeVisible()

    await page.getByRole('button', { name: 'Restore Draft' }).click()
    await page.locator('#slides-title').fill('Draft Recovery Lifecycle')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Recovered draft available/)).toHaveCount(0)
  })

  test.skip('US-SLD-039 autosave queues retry with backoff after API failure and recovers on retry', async ({ page }) => {
    let failNextAutosave = true
    await page.route('**/api/slides', async (route) => {
      const request = route.request()
      if (request.method() === 'POST' && failNextAutosave) {
        failNextAutosave = false
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'forced autosave failure' }),
        })
        return
      }
      await route.continue()
    })

    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Autosave Retry</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await expect(page.getByText(/Save status: queued/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Autosave retry queued/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry Autosave Now' })).toBeVisible()

    await page.getByRole('button', { name: 'Retry Autosave Now' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible({ timeout: 10000 })
  })
})
