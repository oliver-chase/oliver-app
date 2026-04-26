import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gotoAndSettle } from './helpers/navigation'

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

  test('US-SLD-020 renders scaled 16:9 canvas layers from component json and supports baseline inline edits', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;">Canvas Heading</h1>
      <div class="card" style="position:absolute;left:120px;top:320px;width:420px;height:220px;">Card Body</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Canvas Layer Slide')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await expect(page.locator('[data-slide-canvas="1"]')).toBeVisible()
    await expect(page.locator('.slides-canvas-component')).toHaveCount(2)
    await expect(page.getByText(/Scaled to viewport at \d+% while preserving coordinate integrity\./)).toBeVisible()
    await expect(page.locator('.slides-canvas-component[data-component-type="heading"][data-component-x="100"][data-component-y="120"][data-component-width="800"]')).toHaveCount(1)

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await headingLayer.dblclick()
    const headingContent = headingLayer.locator('.slides-canvas-component-content')
    await expect(headingContent).toHaveAttribute('contenteditable', 'true')
    await headingContent.fill('Canvas Edited Heading')
    await page.locator('#slides-title').click()
    await expect(page.getByText(/Save status: dirty/i)).toBeVisible()

    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsed = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(String(parsed[0]?.content || '')).toContain('Canvas Edited Heading')
  })

  test('SLD-FE-300 imports class-based CSS layout, colors, and typography from HTML slides', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<style>
      .slide-canvas { position: relative; width: 1600px; height: 900px; background: #f8fafc; }
      .hero-title { position: absolute; left: 120px; top: 90px; width: 760px; font-size: 56px; line-height: 64px; color: #0f766e; font-family: Georgia, serif; }
      .hero-panel { position: absolute; left: 120px; top: 220px; width: 480px; height: 220px; background: #111827; color: #f8fafc; border-radius: 24px; padding: 24px; }
    </style>
    <div class="slide-canvas">
      <h1 class="hero-title">Class Styled Heading</h1>
      <div class="hero-panel">Panel copy from class CSS.</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await expect(headingLayer).toHaveAttribute('data-component-x', '144')
    await expect(headingLayer).toHaveAttribute('data-component-y', '108')
    await expect(headingLayer).toHaveAttribute('data-component-width', '912')

    await expect.poll(async () => {
      const value = await headingLayer.evaluate((node) => window.getComputedStyle(node).fontSize)
      return Number.parseFloat(value)
    }).toBeGreaterThan(67)
    await expect.poll(async () => {
      const value = await headingLayer.evaluate((node) => window.getComputedStyle(node).fontSize)
      return Number.parseFloat(value)
    }).toBeLessThan(68)
    await expect.poll(async () => headingLayer.evaluate((node) => window.getComputedStyle(node).color)).toContain('15, 118, 110')

    const panelLayer = page.locator('.slides-canvas-component[data-component-type="panel"]').first()
    await expect.poll(async () => panelLayer.evaluate((node) => window.getComputedStyle(node).backgroundColor)).toContain('17, 24, 39')
  })

  test('SLD-FE-301 imports nested flow-layout HTML into multiple styled layers', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<style>
      .deck-root { width: 1280px; height: 720px; background: #e2e8f0; padding: 36px; }
      .slide-shell { display: grid; gap: 24px; border-radius: 24px; background: #f8fafc; padding: 48px; }
      .title { font-size: 56px; line-height: 64px; color: #0f172a; font-family: Georgia, serif; }
      .panel { width: 760px; border-radius: 20px; background: #1e293b; color: #f8fafc; padding: 28px; }
    </style>
    <div class="deck-root">
      <main class="slide-shell">
        <section>
          <h1 class="title">Flow Layout Title</h1>
        </section>
        <section>
          <div class="panel">Flow panel body copy</div>
        </section>
      </main>
    </div>`)

    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsed = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]')) as Array<{
      type?: string
      content?: string
      style?: { fontSize?: number; backgroundColor?: string }
    }>

    expect(parsed.length).toBeGreaterThanOrEqual(2)
    const heading = parsed.find((component) => component.type === 'heading')
    const panel = parsed.find((component) => component.type === 'panel')

    expect(heading).toBeTruthy()
    expect(String(heading?.content || '')).toContain('Flow Layout Title')
    expect(Number(heading?.style?.fontSize || 0)).toBeGreaterThan(40)

    expect(panel).toBeTruthy()
    expect(String(panel?.content || '')).toContain('Flow panel body copy')
    expect(String(panel?.style?.backgroundColor || '')).toContain('30, 41, 59')
  })

  test('SLD-FE-302 toolbar controls use icon glyphs with tooltips and compact button modifier', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:80px;top:90px;width:600px;">Toolbar Icons</h1>
      <div class="card" style="position:absolute;left:80px;top:260px;width:320px;height:180px;">Card 1</div>
      <div class="card" style="position:absolute;left:440px;top:260px;width:320px;height:180px;">Card 2</div>
      <div class="card" style="position:absolute;left:800px;top:260px;width:320px;height:180px;">Card 3</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const toolbarControls = [
      'Undo',
      'Redo',
      'Align Left',
      'Align Center',
      'Align Right',
      'Align Top',
      'Align Middle',
      'Align Bottom',
      'Distribute Horizontally',
      'Distribute Vertically',
    ] as const

    for (const label of toolbarControls) {
      const control = page.getByRole('button', { name: label })
      await expect(control).toHaveAttribute('title', label)
      const textContent = (await control.textContent())?.trim() || ''
      expect(textContent.length).toBeGreaterThan(0)
      expect(textContent).not.toMatch(/[A-Za-z]{4,}/)
    }

    const nonCompactButtons = await page.locator('#main-content button.btn').evaluateAll((buttons) => (
      buttons
        .filter((button) => !button.className.includes('btn--compact'))
        .map((button) => button.getAttribute('aria-label') || button.textContent || '<unnamed>')
    ))
    expect(nonCompactButtons).toEqual([])
  })

  test('US-SLD-021 supports drag movement and keyboard nudge on selected canvas layers', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;">Nudge Me</h1>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Nudge Slide')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await headingLayer.locator('.slides-canvas-component-type').click()
    await expect(headingLayer).toHaveAttribute('data-component-selected', 'true')

    const beforeDragX = Number(await headingLayer.getAttribute('data-component-x'))
    const beforeDragY = Number(await headingLayer.getAttribute('data-component-y'))
    const dragHandle = headingLayer.locator('.slides-canvas-component-type')
    const dragHandleBox = await dragHandle.boundingBox()
    if (!dragHandleBox) throw new Error('expected drag handle bounding box')

    await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y + dragHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2 + 40, dragHandleBox.y + dragHandleBox.height / 2 + 24)
    await page.mouse.up()

    const afterDragX = Number(await headingLayer.getAttribute('data-component-x'))
    const afterDragY = Number(await headingLayer.getAttribute('data-component-y'))
    expect(afterDragX).toBeGreaterThan(beforeDragX)
    expect(afterDragY).toBeGreaterThan(beforeDragY)
    await expect(headingLayer).toHaveAttribute('data-component-dragging', 'false')

    const canvas = page.locator('[data-slide-canvas="1"]')
    await canvas.focus()
    await canvas.press('ArrowRight')
    await canvas.press('Shift+ArrowDown')

    await expect(headingLayer).toHaveAttribute('data-component-x', String(afterDragX + 1))
    await expect(headingLayer).toHaveAttribute('data-component-y', String(afterDragY + 10))
  })

  test('US-SLD-021 supports resize handles with width and height guardrails', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <div class="card" style="position:absolute;left:120px;top:160px;width:280px;height:180px;">Resizable card</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const cardLayer = page.locator('.slides-canvas-component[data-component-type="card"]').first()
    await cardLayer.click()
    const beforeWidth = Number(await cardLayer.getAttribute('data-component-width'))
    const beforeHeight = Number(await cardLayer.getAttribute('data-component-height'))

    const resizeHandle = cardLayer.locator('.slides-canvas-resize-handle')
    const resizeBox = await resizeHandle.boundingBox()
    if (!resizeBox) throw new Error('expected resize handle bounding box')

    await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 64, resizeBox.y + resizeBox.height / 2 + 52)
    await page.mouse.up()

    const enlargedWidth = Number(await cardLayer.getAttribute('data-component-width'))
    const enlargedHeight = Number(await cardLayer.getAttribute('data-component-height'))
    expect(enlargedWidth).toBeGreaterThan(beforeWidth)
    expect(enlargedHeight).toBeGreaterThan(beforeHeight)

    const resizedHandleBox = await resizeHandle.boundingBox()
    if (!resizedHandleBox) throw new Error('expected resized handle bounding box')
    await page.mouse.move(resizedHandleBox.x + resizedHandleBox.width / 2, resizedHandleBox.y + resizedHandleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(resizedHandleBox.x + resizedHandleBox.width / 2 - 1000, resizedHandleBox.y + resizedHandleBox.height / 2 - 1000)
    await page.mouse.up()

    const minWidth = Number(await cardLayer.getAttribute('data-component-width'))
    const minHeight = Number(await cardLayer.getAttribute('data-component-height'))
    expect(minWidth).toBeGreaterThanOrEqual(48)
    expect(minHeight).toBeGreaterThanOrEqual(32)
  })

  test('SLD-FE-340 shows snapping guides and snaps dragged layers to nearby targets', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:640px;">Alignment Target</h1>
      <div class="card" style="position:absolute;left:680px;top:420px;width:280px;height:180px;">Snap Me</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    const cardLayer = page.locator('.slides-canvas-component[data-component-type="card"]').first()
    const sourceX = Number(await cardLayer.getAttribute('data-component-x'))
    const sourceY = Number(await cardLayer.getAttribute('data-component-y'))
    const targetX = Number(await headingLayer.getAttribute('data-component-x'))
    const targetY = Number(await headingLayer.getAttribute('data-component-y'))
    const cardHandle = cardLayer.locator('.slides-canvas-component-type')
    await cardHandle.click()
    await expect(cardLayer).toHaveAttribute('data-component-selected', 'true')
    const cardHandleBox = await cardHandle.boundingBox()
    if (!cardHandleBox) throw new Error('expected card handle bounding box')
    const canvasScale = await page.locator('[data-slide-canvas="1"]').evaluate((node) => {
      const transform = window.getComputedStyle(node).transform
      if (!transform || transform === 'none') return 1
      return new DOMMatrixReadOnly(transform).a || 1
    })

    const startX = cardHandleBox.x + (cardHandleBox.width / 2)
    const startY = cardHandleBox.y + (cardHandleBox.height / 2)
    const dragToX = startX + ((targetX - sourceX + 3) * canvasScale)
    const dragToY = startY + ((targetY - sourceY + 3) * canvasScale)

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(dragToX, dragToY, { steps: 6 })

    await page.mouse.up()
    await expect(page.locator('[data-snap-guide-axis="x"]')).toHaveCount(0)
    await expect(page.locator('[data-snap-guide-axis="y"]')).toHaveCount(0)
    await expect(cardLayer).toHaveAttribute('data-component-x', '100')
    await expect(cardLayer).toHaveAttribute('data-component-y', '120')
  })

  test('US-SLD-022 inline text editing and toolbar style controls update selected layers', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;">Toolbar Target</h1>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await headingLayer.click()
    await page.locator('[data-slide-canvas="1"]').focus()
    await page.keyboard.press('Enter')

    const headingContent = headingLayer.locator('.slides-canvas-component-content')
    await expect(headingContent).toHaveAttribute('contenteditable', 'true')
    await headingContent.fill('Toolbar Edited Heading')
    await page.locator('#slides-style-font-size').click()
    await page.locator('#slides-style-font-size').fill('10')
    await page.locator('#slides-style-align').selectOption('center')

    await expect(page.getByText(/Save status: dirty/i)).toBeVisible()
    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsed = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]'))
    expect(String(parsed[0]?.content || '')).toContain('Toolbar Edited Heading')
    expect(Number(parsed[0]?.style?.fontSize)).toBe(14)
    expect(String(parsed[0]?.style?.textAlign || '')).toBe('center')
  })

  test('US-O30 inspector bounds and text auto-size keep advanced layer editing deterministic', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:360px;height:48px;">Auto Size Target</h1>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const headingLayer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await headingLayer.click()
    await expect(page.locator('#slides-style-x')).toHaveValue('100')
    await expect(page.locator('#slides-style-y')).toHaveValue('120')

    await page.locator('#slides-style-x').fill('160')
    await expect(headingLayer).toHaveAttribute('data-component-x', '160')

    const beforeKeyboardResizeWidth = Number(await headingLayer.getAttribute('data-component-width'))
    await page.locator('[data-slide-canvas="1"]').focus()
    await page.keyboard.press('Alt+ArrowRight')
    await expect(headingLayer).toHaveAttribute('data-component-width', String(beforeKeyboardResizeWidth + 1))

    await page.locator('#slides-style-text-auto-size').check()
    await expect(headingLayer).toHaveAttribute('data-component-auto-size', 'true')
    await expect(page.locator('#slides-style-height')).toBeDisabled()

    const beforeAutoSizeHeight = Number(await headingLayer.getAttribute('data-component-height'))
    await headingLayer.dblclick()
    const headingContent = headingLayer.locator('.slides-canvas-component-content')
    await headingContent.fill('Auto-sizing should grow this layer height as this sentence wraps across multiple lines in the slide editor canvas.')
    await page.locator('#slides-title').click()

    await expect.poll(async () => Number(await headingLayer.getAttribute('data-component-height'))).toBeGreaterThan(beforeAutoSizeHeight)

    await headingLayer.dblclick()
    await headingContent.fill('short')
    await page.locator('#slides-title').click()
    await expect.poll(async () => Number(await headingLayer.getAttribute('data-component-height'))).toBeGreaterThanOrEqual(40)
  })

  test('US-SLD-023 supports shift multi-select, group nudge, align, and distribution feedback', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <div class="card" style="position:absolute;left:100px;top:100px;width:240px;height:140px;">A</div>
      <div class="card" style="position:absolute;left:480px;top:220px;width:240px;height:140px;">B</div>
      <div class="card" style="position:absolute;left:900px;top:320px;width:240px;height:140px;">C</div>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const cards = page.locator('.slides-canvas-component[data-component-type="card"]')
    await cards.nth(0).click()
    await cards.nth(1).click({ modifiers: ['Shift'] })
    await cards.nth(2).click({ modifiers: ['Shift'] })

    await expect(page.locator('.slides-canvas-component[data-component-selected="true"]')).toHaveCount(3)
    const beforeX = [
      Number(await cards.nth(0).getAttribute('data-component-x')),
      Number(await cards.nth(1).getAttribute('data-component-x')),
      Number(await cards.nth(2).getAttribute('data-component-x')),
    ]

    await page.locator('[data-slide-canvas="1"]').focus()
    await page.keyboard.press('ArrowRight')
    await expect(cards.nth(0)).toHaveAttribute('data-component-x', String(beforeX[0] + 1))
    await expect(cards.nth(1)).toHaveAttribute('data-component-x', String(beforeX[1] + 1))
    await expect(cards.nth(2)).toHaveAttribute('data-component-x', String(beforeX[2] + 1))

    await page.getByRole('button', { name: 'Align Top' }).click()
    const yValues = [
      Number(await cards.nth(0).getAttribute('data-component-y')),
      Number(await cards.nth(1).getAttribute('data-component-y')),
      Number(await cards.nth(2).getAttribute('data-component-y')),
    ]
    expect(new Set(yValues).size).toBe(1)

    await page.getByRole('button', { name: 'Distribute Horizontally' }).click()
    const xAfterDistribution = [
      Number(await cards.nth(0).getAttribute('data-component-x')),
      Number(await cards.nth(1).getAttribute('data-component-x')),
      Number(await cards.nth(2).getAttribute('data-component-x')),
    ]
    const gapA = xAfterDistribution[1] - xAfterDistribution[0]
    const gapB = xAfterDistribution[2] - xAfterDistribution[1]
    expect(Math.abs(gapA - gapB)).toBeLessThanOrEqual(2)

    await cards.nth(0).click()
    await page.getByRole('button', { name: 'Distribute Vertically' }).click()
    await expect(page.getByText('Select at least three layers to distribute spacing.')).toBeVisible()
  })

  test('US-SLD-024 undo and redo work via controls and keyboard shortcuts', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;">Undo Redo</h1>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const layer = page.locator('.slides-canvas-component[data-component-type="heading"]').first()
    await layer.click()

    const undoButton = page.getByRole('button', { name: 'Undo' })
    const redoButton = page.getByRole('button', { name: 'Redo' })
    await expect(undoButton).toBeDisabled()
    await expect(redoButton).toBeDisabled()

    await page.locator('[data-slide-canvas="1"]').focus()
    await page.keyboard.press('ArrowRight')
    await expect(undoButton).toBeEnabled()

    const movedX = Number(await layer.getAttribute('data-component-x'))
    await undoButton.click()
    await expect(layer).toHaveAttribute('data-component-x', String(movedX - 1))
    await expect(redoButton).toBeEnabled()

    await redoButton.click()
    await expect(layer).toHaveAttribute('data-component-x', String(movedX))

    await page.keyboard.press('ControlOrMeta+Z')
    await expect(layer).toHaveAttribute('data-component-x', String(movedX - 1))
    await page.keyboard.press('ControlOrMeta+Shift+Z')
    await expect(layer).toHaveAttribute('data-component-x', String(movedX))
  })

  test('US-SLD-025 exposes keyboard-first workflows, semantic canvas roles, and shortcut help', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;">
      <h1 style="position:absolute;left:100px;top:120px;width:800px;">Keyboard One</h1>
      <h2 style="position:absolute;left:140px;top:260px;width:760px;">Keyboard Two</h2>
    </div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const canvas = page.locator('[data-slide-canvas="1"]')
    await expect(canvas).toHaveAttribute('role', 'listbox')
    await expect(canvas).toHaveAttribute('aria-multiselectable', 'true')

    await page.locator('.slides-shortcuts summary').click()
    await expect(page.getByText(/Ctrl\/Cmd\+Z undo/)).toBeVisible()

    await canvas.focus()
    await page.keyboard.press('PageDown')
    const selectedLayer = page.locator('.slides-canvas-component[data-component-selected="true"]').first()
    await expect(selectedLayer).toBeVisible()

    await page.keyboard.press('Enter')
    const selectedContent = selectedLayer.locator('.slides-canvas-component-content')
    await expect(selectedContent).toHaveAttribute('contenteditable', 'true')
    await selectedContent.press('Escape')
    await expect(selectedContent).toHaveAttribute('contenteditable', 'false')
  })

  test('US-SLD-027 locked layers remain immutable across edit controls while unlocked layers still update', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [
          {
            id: 'locked-slide-1',
            owner_user_id: 'qa-admin-user',
            title: 'Locked Behavior',
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'locked-heading',
                type: 'heading',
                sourceLabel: '.locked-heading',
                x: 100,
                y: 120,
                width: 760,
                content: 'Locked Title',
                style: { fontSize: 36, fontWeight: 700, color: '#0f172a' },
                locked: true,
                visible: true,
              },
              {
                id: 'editable-card',
                type: 'card',
                sourceLabel: '.editable-card',
                x: 160,
                y: 360,
                width: 460,
                height: 220,
                content: 'Editable Body',
                style: { fontSize: 24, color: '#1f2937', backgroundColor: '#f8fafc' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            revision: 1,
            source: 'import',
            source_template_id: null,
            created_at: '2026-04-25T00:00:00.000Z',
            updated_at: '2026-04-25T00:00:00.000Z',
            last_edited_at: '2026-04-25T00:00:00.000Z',
          },
        ],
        templates: [],
        audits: [],
        nextAuditId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'My Slides' }).click()
    await page.getByText('Locked Behavior').first().waitFor()
    await page.getByRole('button', { name: 'Load' }).first().click()
    await expect(page.getByText(/Canvas: 1920 × 1080/)).toBeVisible()

    const lockedLayer = page.locator('.slides-canvas-component[data-component-id="locked-heading"]').first()
    const editableLayer = page.locator('.slides-canvas-component[data-component-id="editable-card"]').first()
    const canvas = page.locator('[data-slide-canvas="1"]')

    await lockedLayer.click()
    await expect(lockedLayer).toHaveAttribute('data-component-locked', 'true')
    await expect(lockedLayer.locator('.slides-canvas-resize-handle')).toHaveCount(0)
    await canvas.focus()
    await canvas.press('Enter')
    await expect(lockedLayer.locator('.slides-canvas-component-content')).toHaveAttribute('contenteditable', 'false')

    await lockedLayer.click()
    await editableLayer.click({ modifiers: ['Shift'] })
    await expect(page.locator('.slides-canvas-component[data-component-selected="true"]')).toHaveCount(2)

    const lockedBeforeX = Number(await lockedLayer.getAttribute('data-component-x'))
    const editableBeforeX = Number(await editableLayer.getAttribute('data-component-x'))

    await canvas.focus()
    await canvas.press('ArrowRight')
    await expect(lockedLayer).toHaveAttribute('data-component-x', String(lockedBeforeX))
    await expect(editableLayer).toHaveAttribute('data-component-x', String(editableBeforeX + 1))

    await page.locator('#slides-style-font-size').fill('50')
    await expect(page.getByText('Locked layers were skipped.')).toBeVisible()

    await page.getByRole('button', { name: 'Show Raw JSON' }).click()
    const parsed = await page.locator('.slides-code').evaluate((el) => JSON.parse(el.textContent || '[]')) as Array<{
      id: string
      style?: { fontSize?: number }
    }>
    const byId = new Map(parsed.map((entry) => [entry.id, entry] as const))
    expect(Number(byId.get('locked-heading')?.style?.fontSize)).toBe(36)
    expect(Number(byId.get('editable-card')?.style?.fontSize)).toBe(50)
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

  test('SLD-FE-400 and SLD-BE-400 support visibility controls and template ownership governance', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('oliver-slides-store-v1')
    })
    await gotoAndSettle(page, '/slides')

    const unique = Date.now().toString(36)
    const templateName = `Governance Shared Template ${unique}`

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Template Governance</h1></div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Governance Slide')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.getByRole('button', { name: 'My Slides' }).click()
    await page.getByRole('button', { name: 'Publish Template' }).first().click()
    await page.locator('#slides-template-name').fill(templateName)
    await page.locator('#slides-template-description').fill('Governance test template')
    await page.locator('#slides-template-visibility').selectOption('shared')
    await page.getByRole('button', { name: 'Confirm Publish Template' }).click()

    await page.getByRole('button', { name: 'Template Library' }).click()
    const templateCard = page.locator('.slides-library-card', { hasText: templateName }).first()
    await expect(templateCard).toBeVisible()
    await expect(templateCard.locator('.slides-template-preview')).toBeVisible()
    await expect(templateCard.getByText(/Visibility:\s*Shared/i)).toBeVisible()
    await templateCard.getByRole('button', { name: 'Make Private' }).click()
    await expect(templateCard.getByText(/Visibility:\s*Private/i)).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await templateCard.getByRole('button', { name: 'Archive Template' }).click()
    await expect(page.locator('.slides-library-card', { hasText: templateName })).toHaveCount(0)
  })

  test('SLD-FE-400 restricts shared-template publishing controls for non-admin users', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('oliver-slides-store-v1')
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-member-user',
        email: 'qa-member@example.com',
        name: 'QA Member',
        role: 'member',
        page_permissions: ['slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))
    })
    await gotoAndSettle(page, '/slides')

    const unique = Date.now().toString(36)
    const templateName = `Member Private Template ${unique}`

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Member Template</h1></div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Member Slide')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.getByRole('button', { name: 'My Slides' }).click()
    await page.getByRole('button', { name: 'Publish Template' }).first().click()
    await expect(page.locator('#slides-template-visibility')).toBeDisabled()
    await expect(page.getByText(/Shared template publishing is restricted to admins/i)).toBeVisible()
    await page.locator('#slides-template-name').fill(templateName)
    await page.getByRole('button', { name: 'Confirm Publish Template' }).click()

    await page.getByRole('button', { name: 'Template Library' }).click()
    const templateCard = page.locator('.slides-library-card', { hasText: templateName }).first()
    await expect(templateCard).toBeVisible()
    await expect(templateCard.getByText(/Visibility:\s*Private/i)).toBeVisible()
    await expect(templateCard.getByRole('button', { name: 'Make Shared' })).toHaveCount(0)
  })

  test('SLD-FE-410 and SLD-BE-410 allow template ownership transfer with audit visibility', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-transfer-1',
            owner_user_id: 'qa-admin-user',
            name: 'Transferable Template',
            description: 'Ownership handoff baseline.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'component-1',
                type: 'text',
                sourceLabel: '.headline',
                x: 100,
                y: 120,
                width: 700,
                content: 'Template ownership transfer',
                style: { fontSize: 42, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        audits: [],
        nextAuditId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Template Library' }).click()

    const templateCard = page.locator('.slides-library-card', { hasText: 'Transferable Template' }).first()
    await expect(templateCard.getByText(/Owner:\s*qa-admin-user/i)).toBeVisible()
    await templateCard.getByRole('button', { name: 'Transfer Owner' }).click()
    await templateCard.getByLabel('New Owner').fill('qa-new-owner@example.com')
    await templateCard.getByRole('button', { name: 'Confirm Transfer' }).click()
    await expect(templateCard.getByText(/Owner:\s*qa-new-owner@example.com/i)).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('transfer-template')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)
    await expect(page.locator('.slides-library-card h3')).toContainText('transfer-template')
  })

  test('SLD-FE-410 and SLD-BE-410 manage collaborator roles with audit events', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-collab-1',
            owner_user_id: 'qa-admin-user',
            name: 'Collaborator Template',
            description: 'Collaborator management baseline.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'component-1',
                type: 'text',
                sourceLabel: '.headline',
                x: 100,
                y: 120,
                width: 700,
                content: 'Collaborator workflow',
                style: { fontSize: 42, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        collaborators: [],
        audits: [],
        nextAuditId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Template Library' }).click()

    const templateCard = page.locator('.slides-library-card', { hasText: 'Collaborator Template' }).first()
    await templateCard.getByRole('button', { name: 'Manage Collaborators' }).click()
    await templateCard.getByLabel('Collaborator').fill('qa-reviewer@example.com')
    await templateCard.getByLabel('Role').selectOption('reviewer')
    await templateCard.getByRole('button', { name: 'Save Collaborator' }).click()
    await expect(templateCard.getByText(/qa-reviewer@example.com · reviewer/i)).toBeVisible()

    await templateCard.getByRole('button', { name: 'Remove' }).click()
    await expect(templateCard.getByText(/No collaborators yet\./i)).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('upsert-collaborator')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)
    await page.locator('#slides-audit-action').selectOption('remove-collaborator')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)
  })

  test('SLD-FE-410 and SLD-BE-410 route member ownership transfer through admin approvals', async ({ page }) => {
    await page.addInitScript(() => {
      const actor = window.localStorage.getItem('qa-test-actor') || 'member'
      if (actor === 'admin') {
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
        return
      }

      window.localStorage.setItem('qa-auth-account', JSON.stringify({
        homeAccountId: 'qa-member-home-account',
        environment: 'qa.local',
        tenantId: 'qa-tenant',
        username: 'qa-member@example.com',
        localAccountId: 'qa-member-local-account',
        name: 'QA Member',
        idTokenClaims: {
          oid: 'qa-member-user',
          sub: 'qa-member-user',
        },
      }))
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-member-user',
        email: 'qa-member@example.com',
        name: 'QA Member',
        role: 'member',
        page_permissions: ['slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.evaluate(() => {
      window.localStorage.setItem('qa-test-actor', 'member')
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-transfer-approval-1',
            owner_user_id: 'qa-member-user',
            name: 'Member Owned Template',
            description: 'Transfer requires admin approval.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'component-1',
                type: 'text',
                sourceLabel: '.headline',
                x: 100,
                y: 120,
                width: 700,
                content: 'Transfer approval workflow',
                style: { fontSize: 42, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        collaborators: [],
        approvals: [],
        audits: [],
        nextAuditId: 1,
        nextApprovalId: 1,
      }))
    })
    await page.reload()
    await page.getByRole('button', { name: 'Template Library' }).click()

    const templateCard = page.locator('.slides-library-card', {
      has: page.getByRole('heading', { name: 'Member Owned Template' }),
    }).first()
    await expect(templateCard.getByText(/Owner:\s*qa-member-user/i)).toBeVisible()
    await templateCard.getByRole('button', { name: 'Transfer Owner' }).click()
    await templateCard.getByLabel('New Owner').fill('qa-admin@example.com')
    await templateCard.getByRole('button', { name: 'Confirm Transfer' }).click()

    await expect(templateCard.getByText(/Owner:\s*qa-member-user/i)).toBeVisible()
    await expect(page.locator('.slides-template-draft .slides-library-card', { hasText: 'Transfer Template Ownership' })).toHaveCount(1)

    await page.evaluate(() => {
      window.localStorage.setItem('qa-test-actor', 'admin')
    })
    await page.reload()
    await page.getByRole('button', { name: 'Template Library' }).click()

    const approvalCard = page.locator('.slides-template-draft .slides-library-card', { hasText: 'Transfer Template Ownership' }).first()
    await expect(approvalCard).toBeVisible()
    await approvalCard.getByRole('button', { name: 'Approve' }).click()
    await expect(templateCard.getByText(/Owner:\s*qa-admin@example.com/i)).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('submit-approval')
    await expect(page.locator('.slides-library-card h3')).toContainText('submit-approval')
    await page.locator('#slides-audit-action').selectOption('approve-approval')
    await expect(page.locator('.slides-library-card h3')).toContainText('approve-approval')
  })

  test('SLD-FE-410 and SLD-BE-410 allow admins to reject collaborator approval requests', async ({ page }) => {
    await page.addInitScript(() => {
      const actor = window.localStorage.getItem('qa-test-actor') || 'member'
      if (actor === 'admin') {
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
        return
      }

      window.localStorage.setItem('qa-auth-account', JSON.stringify({
        homeAccountId: 'qa-member-home-account',
        environment: 'qa.local',
        tenantId: 'qa-tenant',
        username: 'qa-member@example.com',
        localAccountId: 'qa-member-local-account',
        name: 'QA Member',
        idTokenClaims: {
          oid: 'qa-member-user',
          sub: 'qa-member-user',
        },
      }))
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-member-user',
        email: 'qa-member@example.com',
        name: 'QA Member',
        role: 'member',
        page_permissions: ['slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.evaluate(() => {
      window.localStorage.setItem('qa-test-actor', 'member')
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-collab-approval-1',
            owner_user_id: 'qa-member-user',
            name: 'Member Collaborator Template',
            description: 'Collaborator changes require approval.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'component-1',
                type: 'text',
                sourceLabel: '.headline',
                x: 100,
                y: 120,
                width: 700,
                content: 'Collaborator approval workflow',
                style: { fontSize: 42, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        collaborators: [
          {
            template_id: 'template-collab-approval-1',
            user_id: 'qa-reviewer-user',
            user_email: 'qa-reviewer@example.com',
            role: 'reviewer',
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        approvals: [],
        audits: [],
        nextAuditId: 1,
        nextApprovalId: 1,
      }))
    })
    await page.reload()
    await page.getByRole('button', { name: 'Template Library' }).click()

    const templateCard = page.locator('.slides-library-card', {
      has: page.getByRole('heading', { name: 'Member Collaborator Template' }),
    }).first()
    await templateCard.getByRole('button', { name: 'Manage Collaborators' }).click()
    await expect(templateCard.getByText(/qa-reviewer@example.com · reviewer/i)).toBeVisible()
    await templateCard.getByRole('button', { name: 'Remove' }).click()
    await expect(page.locator('.slides-template-draft .slides-library-card', { hasText: 'Remove Collaborator' })).toHaveCount(1)
    await expect(templateCard.getByText(/qa-reviewer@example.com · reviewer/i)).toBeVisible()

    await page.evaluate(() => {
      window.localStorage.setItem('qa-test-actor', 'admin')
    })
    await page.reload()
    await page.getByRole('button', { name: 'Template Library' }).click()

    const approvalCard = page.locator('.slides-template-draft .slides-library-card', { hasText: 'Remove Collaborator' }).first()
    await expect(approvalCard).toBeVisible()
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    await approvalCard.getByRole('button', { name: 'Reject' }).click()

    await templateCard.getByRole('button', { name: 'Manage Collaborators' }).click()
    await expect(templateCard.getByText(/qa-reviewer@example.com · reviewer/i)).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('reject-approval')
    await expect(page.locator('.slides-library-card h3')).toContainText('reject-approval')
  })

  test('SLD-FE-440 and SLD-BE-440 show SLA aging and support approval escalation reminders', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-member-user',
        email: 'qa-member@example.com',
        name: 'QA Member',
        role: 'member',
        page_permissions: ['slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-sla-escalation-1',
            owner_user_id: 'qa-member-user',
            name: 'Escalation Template',
            description: 'Pending review should be escalate-able.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [],
            metadata: {},
            created_at: '2026-04-20T08:00:00.000Z',
            updated_at: '2026-04-20T08:00:00.000Z',
          },
        ],
        collaborators: [],
        approvals: [
          {
            id: 'approval-escalation-1',
            template_id: 'template-sla-escalation-1',
            requested_by_user_id: 'qa-member-user',
            requested_by_email: 'qa-member@example.com',
            approval_type: 'transfer-template',
            payload: {
              target_user_id: 'qa-admin-user',
              target_user_email: 'qa-admin@example.com',
            },
            status: 'pending',
            review_note: null,
            reviewed_by_user_id: null,
            reviewed_at: null,
            created_at: '2026-04-20T08:00:00.000Z',
            updated_at: '2026-04-20T08:00:00.000Z',
          },
        ],
        audits: [],
        nextAuditId: 1,
        nextApprovalId: 2,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Template Library' }).click()

    const approvalCard = page.locator('.slides-template-draft .slides-library-card', { hasText: 'Transfer Template Ownership' }).first()
    await expect(approvalCard).toContainText('SLA Overdue (48h+)')
    await expect(approvalCard).toContainText(/Age:\s*\d+d/i)

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt')
      await dialog.accept('Need review before customer handoff.')
    })
    await approvalCard.getByRole('button', { name: 'Escalate' }).click()

    await expect(approvalCard).toContainText('Escalations: 1')
    await expect(approvalCard.getByRole('button', { name: 'Escalate Again' })).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('escalate-approval')
    await expect(page.locator('.slides-library-card h3')).toContainText('escalate-approval')
  })

  test('SLD-BE-440 admin escalation sweep escalates overdue approvals without manual prompts', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-admin-user',
        email: 'qa-admin@example.com',
        name: 'QA Admin',
        role: 'admin',
        page_permissions: ['accounts', 'hr', 'sdr', 'crm', 'slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-sla-sweep-1',
            owner_user_id: 'qa-member-user',
            name: 'Sweep Template',
            description: 'Overdue approvals should be swept.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [],
            metadata: {},
            created_at: '2026-04-20T08:00:00.000Z',
            updated_at: '2026-04-20T08:00:00.000Z',
          },
        ],
        collaborators: [],
        approvals: [
          {
            id: 'approval-sweep-1',
            template_id: 'template-sla-sweep-1',
            requested_by_user_id: 'qa-member-user',
            requested_by_email: 'qa-member@example.com',
            approval_type: 'transfer-template',
            payload: {
              target_user_id: 'qa-admin-user',
              target_user_email: 'qa-admin@example.com',
            },
            status: 'pending',
            review_note: null,
            reviewed_by_user_id: null,
            reviewed_at: null,
            created_at: '2026-04-20T08:00:00.000Z',
            updated_at: '2026-04-20T08:00:00.000Z',
          },
        ],
        audits: [],
        nextAuditId: 1,
        nextApprovalId: 2,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Template Library' }).click()
    await expect(page.getByText(/Overdue approvals:\s*1/i)).toBeVisible()
    await page.getByRole('button', { name: 'Run SLA Escalation Sweep' }).click()

    const approvalCard = page.locator('.slides-template-draft .slides-library-card', { hasText: 'Transfer Template Ownership' }).first()
    await expect(approvalCard).toContainText('Escalations: 1')

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.locator('#slides-audit-action').selectOption('escalate-approval')
    await expect(page.locator('.slides-library-card h3')).toContainText('escalate-approval')
  })

  test('SLD-FE-410 collaborator visibility allows members to use private delegated templates', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('qa-app-user', JSON.stringify({
        user_id: 'qa-member-user',
        email: 'qa-member@example.com',
        name: 'QA Member',
        role: 'member',
        page_permissions: ['slides'],
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      }))

      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [
          {
            id: 'template-collab-2',
            owner_user_id: 'qa-owner-user',
            name: 'Delegated Private Template',
            description: 'Visible through collaborator role.',
            is_shared: false,
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'component-1',
                type: 'text',
                sourceLabel: '.headline',
                x: 100,
                y: 120,
                width: 700,
                content: 'Delegated access',
                style: { fontSize: 42, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        collaborators: [
          {
            template_id: 'template-collab-2',
            user_id: 'qa-member-user',
            user_email: 'qa-member@example.com',
            role: 'viewer',
            created_at: '2026-04-24T10:00:00.000Z',
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ],
        audits: [],
        nextAuditId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Template Library' }).click()

    const templateCard = page.locator('.slides-library-card', { hasText: 'Delegated Private Template' }).first()
    await expect(templateCard).toBeVisible()
    await templateCard.getByRole('button', { name: 'Duplicate to My Slides' }).click()
    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByText('Delegated Private Template (Copy)')).toBeVisible()
  })

  test('SLD-FE-420 and SLD-BE-420 provide activity filtering, pagination, and csv export', async ({ page }) => {
    await page.addInitScript(() => {
      const audits = Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        actor_user_id: 'qa-admin-user',
        actor_email: 'qa-admin@example.com',
        entity_type: index % 2 === 0 ? 'template' : 'slide',
        entity_id: `entity-${index + 1}`,
        action: index % 3 === 0 ? 'export-html' : index % 3 === 1 ? 'save' : 'publish-template',
        outcome: index % 4 === 0 ? 'failure' : 'success',
        error_class: index % 4 === 0 ? 'simulated_failure' : null,
        details: { index: index + 1 },
        created_at: `2026-04-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
      }))

      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [],
        audits,
        nextAuditId: 26,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Activity' }).click()
    const auditPagination = page.locator('.slides-audit-pagination')

    await expect(page.locator('.slides-library-card')).toHaveCount(20)
    await expect(page.getByText('Showing 1-20')).toBeVisible()

    await auditPagination.getByRole('button', { name: 'Next' }).click()
    await expect(page.locator('.slides-library-card')).toHaveCount(5)
    await expect(page.getByText('Showing 21-25')).toBeVisible()

    await auditPagination.getByRole('button', { name: 'Previous' }).click()
    await expect(page.locator('.slides-library-card')).toHaveCount(20)

    await page.locator('#slides-audit-action').selectOption('export-html')
    await expect(page.locator('.slides-library-card')).toHaveCount(9)

    await page.locator('#slides-audit-outcome').selectOption('failure')
    await expect(page.locator('.slides-library-card')).toHaveCount(3)

    await page.locator('#slides-audit-entity').selectOption('template')
    await expect(page.locator('.slides-library-card')).toHaveCount(3)

    await page.locator('#slides-audit-date-from').fill('2026-04-20')
    await page.locator('#slides-audit-date-to').fill('2026-04-25')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Current View CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('slide-audit-events.csv')

    await page.getByRole('button', { name: 'Reset Audit Filters' }).click()
    await expect(page.locator('#slides-audit-action')).toHaveValue('all')
    await expect(page.locator('#slides-audit-outcome')).toHaveValue('all')
    await expect(page.locator('#slides-audit-entity')).toHaveValue('all')
    await expect(page.locator('#slides-audit-date-from')).toHaveValue('')
    await expect(page.locator('#slides-audit-date-to')).toHaveValue('')
    await expect(page.locator('.slides-library-card')).toHaveCount(20)
  })

  test('SLD-FE-430 and SLD-BE-430 save, apply, and delete activity filter presets', async ({ page }) => {
    await page.addInitScript(() => {
      const audits = Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        actor_user_id: 'qa-admin-user',
        actor_email: 'qa-admin@example.com',
        entity_type: index % 2 === 0 ? 'template' : 'slide',
        entity_id: `entity-${index + 1}`,
        action: index % 3 === 0 ? 'export-html' : index % 3 === 1 ? 'save' : 'publish-template',
        outcome: index % 4 === 0 ? 'failure' : 'success',
        error_class: index % 4 === 0 ? 'simulated_failure' : null,
        details: { index: index + 1 },
        created_at: `2026-04-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
      }))

      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [],
        audits,
        nextAuditId: 26,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Activity' }).click()

    await page.locator('#slides-search').fill('entity-25')
    await page.locator('#slides-audit-action').selectOption('export-html')
    await page.locator('#slides-audit-outcome').selectOption('failure')
    await page.locator('#slides-audit-entity').selectOption('template')
    await page.locator('#slides-audit-date-from').fill('2026-04-20')
    await page.locator('#slides-audit-date-to').fill('2026-04-25')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)

    await page.locator('#slides-audit-preset-name').fill('Failure Exports')
    await page.getByRole('button', { name: 'Save Preset' }).click()
    await expect(page.locator('#slides-audit-preset-select')).toContainText('Failure Exports')

    await page.locator('#slides-search').fill('')
    await page.getByRole('button', { name: 'Reset Audit Filters' }).click()
    await expect(page.locator('.slides-library-card')).toHaveCount(20)

    await page.locator('#slides-audit-preset-select').selectOption({ label: 'Failure Exports' })
    await page.getByRole('button', { name: 'Apply Preset' }).click()
    await expect(page.locator('#slides-search')).toHaveValue('entity-25')
    await expect(page.locator('#slides-audit-action')).toHaveValue('export-html')
    await expect(page.locator('#slides-audit-outcome')).toHaveValue('failure')
    await expect(page.locator('#slides-audit-entity')).toHaveValue('template')
    await expect(page.locator('#slides-audit-date-from')).toHaveValue('2026-04-20')
    await expect(page.locator('#slides-audit-date-to')).toHaveValue('2026-04-25')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete Preset' }).click()
    await expect(page.locator('#slides-audit-preset-select')).not.toContainText('Failure Exports')
  })

  test('SLD-FE-431 and SLD-BE-430 queue filtered audit export jobs and support csv downloads', async ({ page }) => {
    await page.addInitScript(() => {
      const audits = Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        actor_user_id: 'qa-admin-user',
        actor_email: 'qa-admin@example.com',
        entity_type: index % 2 === 0 ? 'slide' : 'template',
        entity_id: `audit-${index + 1}`,
        action: index % 2 === 0 ? 'save' : 'export-html',
        outcome: 'success',
        error_class: null,
        details: { index: index + 1 },
        created_at: `2026-04-${String(index + 10).padStart(2, '0')}T12:00:00.000Z`,
      }))

      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [],
        templates: [],
        audits,
        nextAuditId: 7,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'Activity' }).click()

    await page.locator('#slides-audit-action').selectOption('save')
    await expect(page.locator('.slides-library-card:not(.slides-audit-export-job-card)')).toHaveCount(3)

    await page.getByRole('button', { name: 'Queue Filtered Export Job' }).click()
    const exportJobCards = page.locator('.slides-audit-export-job-card')
    await expect(exportJobCards).toHaveCount(1)
    await expect(exportJobCards.first()).toContainText('Completed')
    await expect(exportJobCards.first()).toContainText('Rows: 3')

    const downloadPromise = page.waitForEvent('download')
    await exportJobCards.first().getByRole('button', { name: 'Download CSV' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^slide-audit-export-.*\.csv$/)

    await page.locator('#slides-audit-export-status').selectOption('failed')
    await expect(page.locator('.slides-audit-export-job-card')).toHaveCount(0)
    await page.locator('#slides-audit-export-status').selectOption('completed')
    await expect(page.locator('.slides-audit-export-job-card')).toHaveCount(1)
  })

  test('SLD-FE-500 exports current slide to PPTX and surfaces unsupported-component warnings', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(
      `<div class=\"slide-canvas\" style=\"width:1920px;height:1080px;\"><img class=\"brand-logo\" alt=\"Company Logo\" src=\"https://example.com/logo.png\" style=\"position:absolute;left:40px;top:40px;width:200px;height:80px;\" /><h1 style=\"position:absolute;left:120px;top:180px;width:1100px;\">Q2 Executive Narrative</h1></div>`,
    )
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export PPTX (Current)' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pptx$/)

    await expect(page.getByText(/native logo\/image mapping not yet supported/i)).toBeVisible()
  })

  test('SLD-FE-500 exports selected My Slides rows to one PPTX and records export-pptx activity', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [
          {
            id: 'slide-pptx-1',
            owner_user_id: 'qa-admin-user',
            title: 'PPTX One',
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'pptx1-heading',
                type: 'heading',
                sourceLabel: '.heading',
                x: 120,
                y: 140,
                width: 900,
                content: 'PPTX Slide One',
                style: { fontSize: 56, fontWeight: 700, color: '#0f172a' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            revision: 1,
            source: 'import',
            source_template_id: null,
            created_at: '2026-04-25T10:00:00.000Z',
            updated_at: '2026-04-25T10:00:00.000Z',
            last_edited_at: '2026-04-25T10:00:00.000Z',
          },
          {
            id: 'slide-pptx-2',
            owner_user_id: 'qa-admin-user',
            title: 'PPTX Two',
            canvas: { width: 1920, height: 1080 },
            components: [
              {
                id: 'pptx2-card',
                type: 'card',
                sourceLabel: '.card',
                x: 160,
                y: 220,
                width: 640,
                height: 260,
                content: '<h3>Pipeline</h3><p>$4.2M</p>',
                style: { fontSize: 28, color: '#111827', backgroundColor: '#f3f4f6' },
                locked: false,
                visible: true,
              },
            ],
            metadata: {},
            revision: 1,
            source: 'import',
            source_template_id: null,
            created_at: '2026-04-25T10:00:00.000Z',
            updated_at: '2026-04-25T10:00:00.000Z',
            last_edited_at: '2026-04-25T10:00:00.000Z',
          },
        ],
        templates: [],
        collaborators: [],
        approvals: [],
        audits: [],
        auditPresets: [],
        nextAuditId: 1,
        nextApprovalId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'My Slides' }).click()

    await page.locator('#slides-pptx-select-slide-pptx-1').check()
    await page.locator('#slides-pptx-select-slide-pptx-2').check()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Selected PPTX (2)' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pptx$/)

    await page.getByRole('button', { name: 'Activity' }).click()
    await expect(page.getByText('export-pptx').first()).toBeVisible()
  })

  test('SLD-FE-501 My Slides selection UX supports select-visible and hidden-selection warnings', async ({ page }) => {
    await page.addInitScript(() => {
      const slide = (id: string, title: string, y: number) => ({
        id,
        owner_user_id: 'qa-admin-user',
        title,
        canvas: { width: 1920, height: 1080 },
        components: [{
          id: `${id}-heading`,
          type: 'heading',
          sourceLabel: '.heading',
          x: 120,
          y,
          width: 900,
          content: title,
          style: { fontSize: 56, fontWeight: 700, color: '#0f172a' },
          locked: false,
          visible: true,
        }],
        metadata: {},
        revision: 1,
        source: 'import',
        source_template_id: null,
        created_at: '2026-04-25T10:00:00.000Z',
        updated_at: '2026-04-25T10:00:00.000Z',
        last_edited_at: '2026-04-25T10:00:00.000Z',
      })

      window.localStorage.setItem('oliver-slides-store-v1', JSON.stringify({
        slides: [
          slide('slide-sel-1', 'Alpha Launch', 140),
          slide('slide-sel-2', 'Beta Review', 220),
          slide('slide-sel-3', 'Gamma Plan', 300),
        ],
        templates: [],
        collaborators: [],
        approvals: [],
        audits: [],
        auditPresets: [],
        nextAuditId: 1,
        nextApprovalId: 1,
      }))
    })

    await gotoAndSettle(page, '/slides')
    await page.getByRole('button', { name: 'My Slides' }).click()

    await page.getByRole('button', { name: 'Select Visible (3)' }).click()
    await expect(page.getByText('Selected for export: 3 visible / 3 total.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export Selected PPTX (3)' })).toBeEnabled()

    await page.locator('#slides-search').fill('Alpha')
    await expect(page.locator('.slides-library-card')).toHaveCount(1)
    await expect(page.getByText('Selected for export: 1 visible / 3 total.')).toBeVisible()
    await expect(page.getByText('2 selected slides are hidden by the current search filter.')).toBeVisible()

    await page.getByRole('button', { name: 'Clear Selection' }).click()
    await expect(page.getByText('Selected for export: 0 visible / 0 total.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export Selected PPTX (0)' })).toBeDisabled()
  })

  test('US-SLD-028 library and activity search show actionable empty states instead of dead-end messaging', async ({ page }) => {
    await gotoAndSettle(page, '/slides')

    await page.locator('#slides-raw-html').fill(`<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Search Test Slide</h1></div>`)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await page.locator('#slides-title').fill('Library Search Smoke')
    await page.getByRole('button', { name: 'Save Slide' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible()

    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByText('Library Search Smoke')).toBeVisible()

    await page.locator('#slides-search').fill('zz-no-slide-match')
    await expect(page.locator('.slides-library-card')).toHaveCount(0)
    await expect(page.getByText('No slides match "zz-no-slide-match". Clear or update search to continue.')).toBeVisible()

    await page.locator('#slides-search').fill('')
    await expect(page.getByText('Library Search Smoke')).toBeVisible()

    await page.getByRole('button', { name: 'Template Library' }).click()
    await expect(page.getByText('Hero + Metric Row')).toBeVisible()

    await page.locator('#slides-search').fill('zz-no-template-match')
    await expect(page.locator('.slides-library-card')).toHaveCount(0)
    await expect(page.getByText('No templates match "zz-no-template-match". Clear or update search to continue.')).toBeVisible()

    await page.locator('#slides-search').fill('')
    await expect(page.getByText('Hero + Metric Row')).toBeVisible()

    await page.getByRole('button', { name: 'Activity' }).click()
    await expect(page.getByText('save').first()).toBeVisible()

    await page.locator('#slides-search').fill('zz-no-activity-match')
    await expect(page.locator('.slides-library-card')).toHaveCount(0)
    await expect(page.getByText('No activity events match "zz-no-activity-match". Clear or update search to continue.')).toBeVisible()

    await page.locator('#slides-search').fill('save')
    await expect(page.getByText('save').first()).toBeVisible()
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
      expect(['confirm', 'beforeunload']).toContain(dialog.type())
      await dialog.dismiss()
    })
    await page.getByRole('button', { name: 'My Slides' }).click()

    await expect(page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'My Slides' })).toHaveCount(0)

    page.once('dialog', async (dialog) => {
      expect(['confirm', 'beforeunload']).toContain(dialog.type())
      await dialog.accept()
    })
    await page.getByRole('button', { name: 'My Slides' }).click()
    await expect(page.getByRole('heading', { name: 'My Slides' })).toBeVisible()
  })

  test('SLD-FE-142 browser back transitions respect unsaved-change guardrails', async ({ page }) => {
    await gotoAndSettle(page, '/')
    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Route Guard</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(['confirm', 'beforeunload']).toContain(dialog.type())
      await dialog.dismiss()
    })
    await page.evaluate(() => {
      window.history.back()
    })
    await expect(page).toHaveURL(/\/slides\/?$/)
    await expect(page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' })).toBeVisible()

    page.once('dialog', async (dialog) => {
      expect(['confirm', 'beforeunload']).toContain(dialog.type())
      await dialog.accept()
    })
    await page.evaluate(() => {
      window.history.back()
    })
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' })).toHaveCount(0)
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

  test('US-SLD-039 autosave queues retry with backoff after API failure and recovers on retry', async ({ page }) => {
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem
      Object.defineProperty(window, '__slidesFailStoreWrites', {
        value: true,
        writable: true,
        configurable: true,
      })
      Storage.prototype.setItem = function setItemWithFailure(key: string, value: string) {
        if ((window as unknown as { __slidesFailStoreWrites?: boolean }).__slidesFailStoreWrites && key === 'oliver-slides-store-v1') {
          throw new Error('forced autosave failure')
        }
        return originalSetItem.call(this, key, value)
      }
    })

    await gotoAndSettle(page, '/slides')

    const html = `<div class="slide-canvas" style="width:1920px;height:1080px;"><h1 style="position:absolute;left:100px;top:120px;width:800px;">Autosave Retry</h1></div>`
    await page.locator('#slides-raw-html').fill(html)
    await page.locator('#main-content').getByRole('button', { name: 'Parse Pasted HTML' }).click()
    await expect(page.getByText('Parse complete.')).toBeVisible()

    await expect(page.getByText(/Save status: queued/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Autosave retry queued/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry Autosave Now' })).toBeVisible()

    await page.evaluate(() => {
      ;(window as unknown as { __slidesFailStoreWrites?: boolean }).__slidesFailStoreWrites = false
    })
    await page.getByRole('button', { name: 'Retry Autosave Now' }).click()
    await expect(page.getByText(/Save status: saved/i)).toBeVisible({ timeout: 10000 })
  })
})
