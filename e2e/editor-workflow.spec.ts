import { expect, test, type Page } from '@playwright/test'

const cellCenter = async (page: Page, row: number, col: number) => {
  const box = await page
    .locator(`[data-row="${row}"][data-col="${col}"]`)
    .boundingBox()
  if (!box) throw new Error(`Cell ${row},${col} is not visible`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
})

test('fast pointer drawing is atomic and undoable', async ({ page }) => {
  const first = await cellCenter(page, 0, 0)
  const last = await cellCenter(page, 0, 5)
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  await page.mouse.move(last.x, last.y, { steps: 2 })
  await page.mouse.up()

  for (let col = 0; col <= 5; col++) {
    await expect(page.locator(`[data-row="0"][data-col="${col}"]`)).toHaveClass(
      /filled/,
    )
  }

  await page.getByRole('button', { name: /Undo/i }).last().click()
  for (let col = 0; col <= 5; col++) {
    await expect(
      page.locator(`[data-row="0"][data-col="${col}"]`),
    ).not.toHaveClass(/filled/)
  }
  await page.getByRole('button', { name: /Redo/i }).last().click()
  await expect(page.locator('[data-row="0"][data-col="5"]')).toHaveClass(
    /filled/,
  )
})

test('pointer cancellation leaves the next gesture usable', async ({
  page,
}) => {
  const viewport = page.locator('.grid-viewport')
  const first = await cellCenter(page, 1, 0)
  const second = await cellCenter(page, 1, 3)

  await viewport.dispatchEvent('pointerdown', {
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
    clientX: first.x,
    clientY: first.y,
  })
  await viewport.dispatchEvent('pointermove', {
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
    clientX: second.x,
    clientY: second.y,
  })
  await viewport.dispatchEvent('pointercancel', {
    pointerId: 41,
    pointerType: 'touch',
    isPrimary: true,
  })
  await expect(page.locator('[data-row="1"][data-col="0"]')).not.toHaveClass(
    /filled/,
  )

  await page.mouse.click(first.x, first.y)
  await expect(page.locator('[data-row="1"][data-col="0"]')).toHaveClass(
    /filled/,
  )
})

test('two touch pointers zoom without drawing', async ({ page }) => {
  const viewport = page.locator('.grid-viewport')
  const first = await cellCenter(page, 2, 2)
  const second = await cellCenter(page, 2, 7)
  const zoom = page.locator('.zoom-value')
  const initialZoom = await zoom.textContent()

  await viewport.dispatchEvent('pointerdown', {
    pointerId: 51,
    pointerType: 'touch',
    isPrimary: true,
    clientX: first.x,
    clientY: first.y,
  })
  await viewport.dispatchEvent('pointerdown', {
    pointerId: 52,
    pointerType: 'touch',
    isPrimary: false,
    clientX: second.x,
    clientY: second.y,
  })
  await viewport.dispatchEvent('pointermove', {
    pointerId: 52,
    pointerType: 'touch',
    isPrimary: false,
    clientX: second.x + 60,
    clientY: second.y,
  })
  await viewport.dispatchEvent('pointerup', {
    pointerId: 51,
    pointerType: 'touch',
    isPrimary: true,
    clientX: first.x,
    clientY: first.y,
  })
  await viewport.dispatchEvent('pointerup', {
    pointerId: 52,
    pointerType: 'touch',
    isPrimary: false,
    clientX: second.x + 60,
    clientY: second.y,
  })

  await expect(zoom).not.toHaveText(initialZoom ?? '')
  await expect(page.locator('.cell.filled')).toHaveCount(0)
})

test('temporary invalid hexadecimal text preserves the document', async ({
  page,
}) => {
  const cell = await cellCenter(page, 0, 0)
  await page.mouse.click(cell.x, cell.y)
  await expect(page.locator('[data-row="0"][data-col="0"]')).toHaveClass(
    /filled/,
  )

  const input = page.locator('#hexInput')
  await input.fill('F')
  await expect(page.locator('[data-row="0"][data-col="0"]')).toHaveClass(
    /filled/,
  )
  await expect(input).toHaveAttribute('aria-invalid', 'true')

  await input.fill(`0${'0'.repeat(31)}`)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.locator('[data-row="0"][data-col="0"]')).not.toHaveClass(
    /filled/,
  )
})

test('autosaved drafts restore after reload and can be discarded', async ({
  page,
}) => {
  const cell = await cellCenter(page, 3, 3)
  await page.mouse.click(cell.x, cell.y)
  await expect(page.locator('[data-row="3"][data-col="3"]')).toHaveClass(
    /filled/,
  )
  await expect(page.locator('.document-status')).toHaveText(/Unsaved/i)
  await page.waitForTimeout(500)
  const storedDraftState = await page.evaluate(
    () =>
      new Promise<{ indexedDb: unknown; localStorage: string | null }>(
        (resolve, reject) => {
          const request = indexedDB.open('unicucumber')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const transaction = request.result.transaction('drafts', 'readonly')
            const getRequest = transaction.objectStore('drafts').get('current')
            getRequest.onerror = () => reject(getRequest.error)
            getRequest.onsuccess = () =>
              resolve({
                indexedDb: getRequest.result ?? null,
                localStorage: localStorage.getItem('unicucumber_draft_v1'),
              })
          }
        },
      ),
  )
  expect(
    storedDraftState.indexedDb ?? storedDraftState.localStorage,
  ).not.toBeNull()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('.restored-draft-notice')).toBeVisible()
  await expect(page.locator('[data-row="3"][data-col="3"]')).toHaveClass(
    /filled/,
  )
  await page
    .locator('.restored-draft-notice')
    .getByRole('button', { name: 'Discard' })
    .click()
  await expect(page.locator('.restored-draft-notice')).toBeHidden()
  await expect(page.locator('[data-row="3"][data-col="3"]')).not.toHaveClass(
    /filled/,
  )
})

test('Add to glyph set persists the editor glyph to the glyph manager', async ({
  page,
}) => {
  const cell = await cellCenter(page, 0, 0)
  await page.mouse.click(cell.x, cell.y)
  await expect(page.locator('.document-status')).toHaveText(/Unsaved/i)

  const saveButton = page
    .locator('.editor-actions')
    .getByRole('button', { name: 'Add to Glyph Set' })
  await saveButton.click()
  await expect(page.locator('.document-status')).toHaveText(/^\s*Saved\s*$/i)
  await expect(
    page.locator('.editor-actions').getByRole('button', { name: 'Save glyph' }),
  ).toBeDisabled()

  const savedGlyphs = await page.evaluate(
    () =>
      new Promise<Array<{ codePoint: string; hexValue: string }>>(
        (resolve, reject) => {
          const request = indexedDB.open('unicucumber')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const transaction = request.result.transaction('glyphs', 'readonly')
            const getRequest = transaction.objectStore('glyphs').getAll()
            getRequest.onerror = () => reject(getRequest.error)
            getRequest.onsuccess = () => resolve(getRequest.result)
          }
        },
      ),
  )
  expect(savedGlyphs).toEqual([
    {
      codePoint: '0000',
      hexValue: `8${'0'.repeat(63)}`,
    },
  ])
})

test('empty autosaved drafts restore without showing the restore notice', async ({
  page,
}) => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('unicucumber')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const transaction = request.result.transaction('drafts', 'readwrite')
          transaction.onerror = () => reject(transaction.error)
          transaction.oncomplete = () => resolve()
          transaction.objectStore('drafts').put({
            id: 'current',
            schemaVersion: 1,
            updatedAt: Date.now(),
            snapshot: {
              codePoint: '0000',
              width: 16,
              grid: Array.from({ length: 16 }, () => Array(16).fill(0)),
              activeGlyphId: null,
            },
          })
        }
      }),
  )

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  await expect(page.locator('.document-status')).toHaveText(/^\s*Saved\s*$/i)
  await expect(page.locator('.restored-draft-notice')).toBeHidden()
})

test('mobile selection exposes copy and visible paste preview actions', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'mobile command surface')
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  const first = await cellCenter(page, 0, 0)
  const last = await cellCenter(page, 1, 1)
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  await page.mouse.move(last.x, last.y)
  await page.mouse.up()

  await expect(page.locator('.selection-toolbar')).toBeVisible()
  await page
    .locator('.selection-toolbar')
    .getByRole('button', { name: /Copy/ })
    .click()
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Paste', exact: true }).click()
  await expect(page.locator('.paste-toolbar')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Paste', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeVisible()
})

test('mobile settings and glyph manager stay within the dynamic viewport', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('phone'), 'mobile overlay layout')

  await page.locator('.modal-buttons .modal-button').nth(0).click()
  const settings = page.getByRole('dialog').last()
  await expect(settings).toBeVisible()
  const settingsBounds = await settings.boundingBox()
  expect(settingsBounds?.height ?? Infinity).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0,
  )
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await page.keyboard.press('Escape')
  await expect(settings).toBeHidden()

  await page.locator('.modal-buttons .modal-button').nth(1).click()
  await expect(page.locator('.sidebar.active')).toBeVisible()
  await expect(page.locator('.glyph-manager')).toBeVisible()
  await expect(page.locator('.glyph-manager .search-input')).toBeVisible()
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    bodyOverflow: document.body.style.overflow,
  }))
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport)
  expect(metrics.bodyOverflow).toBe('hidden')
  await page.getByRole('button', { name: 'Close glyph manager' }).click()
  await expect(page.locator('.sidebar.active')).toBeHidden()
})

test('glyph manager loads only the requested Unifont range', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'one network integration smoke test',
  )
  const requested: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/unifont/')) requested.push(request.url())
  })
  await page.locator('.modal-buttons .modal-button').nth(1).click()
  await expect(page.locator('input[capture]')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Photo Library' }),
  ).toBeVisible()
  await page.getByPlaceholder('Enter Unicode code point').fill('1000')
  await page.getByRole('button', { name: 'Import from Unifont' }).click()
  await expect(
    page.locator('.glyph-manager').getByPlaceholder(/Enter glyph data/),
  ).not.toHaveValue('')
  const chunkRequests = requested.filter((url) =>
    /\/unifont\/[0-9A-F]{3}\.json/.test(url),
  )
  expect(chunkRequests).toHaveLength(1)
  expect(chunkRequests[0]).toContain('/unifont/001.json')
  expect(requested.every((url) => !url.includes('unifont-map.json'))).toBe(true)
})

test('keyboard navigation exposes a visible focus indicator', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one keyboard focus audit')
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    if (!active) return null
    const style = getComputedStyle(active)
    return {
      tag: active.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })
  expect(focus).not.toBeNull()
  expect(focus?.tag).toMatch(/^(A|BUTTON|INPUT)$/)
  expect(focus?.outlineStyle).not.toBe('none')
  expect(Number.parseFloat(focus?.outlineWidth ?? '0')).toBeGreaterThan(0)
})

test('image file import still opens the preparation dialog without capture inputs', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one image import smoke test')
  await page.locator('.modal-buttons .modal-button').nth(1).click()
  await expect(page.locator('input[capture]')).toHaveCount(0)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Photo Library' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'glyph.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  })

  await expect(
    page.getByRole('dialog', { name: 'Prepare image as glyph' }),
  ).toBeVisible()
  await expect(page.getByLabel('Converted pixel glyph preview')).toBeVisible()
})
