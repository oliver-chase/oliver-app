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
