import { expect, test, type Page } from '@playwright/test'

const loadWideEditor = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height })
  await page.addInitScript(() => {
    localStorage.clear()
  })
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
}

const getBounds = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      width: bounds.width,
      height: bounds.height,
    }
  })

const waitForSidebarSettled = async (page: Page) => {
  await expect
    .poll(async () => Math.abs((await getBounds(page, '.sidebar.active')).left))
    .toBeLessThanOrEqual(0.5)
}

const expectControlsReachable = async (page: Page) => {
  // Short screens keep usable controls in normal document flow below the grid.
  for (const selector of [
    '.glyph-navigator',
    '.export-panel',
    '.copyright-text',
  ]) {
    await page.locator(selector).scrollIntoViewIfNeeded()
    // Browser scrolling rounds fractional CSS pixels at viewport edges.
    await expect
      .poll(() =>
        page.locator(selector).evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          return Math.max(
            -bounds.top,
            -bounds.left,
            bounds.bottom - document.documentElement.clientHeight,
            bounds.right - document.documentElement.clientWidth,
          )
        }),
      )
      .toBeLessThanOrEqual(1)
  }
}

test.describe('wide editor layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'the exact wide-screen geometry runs once',
    )
  })

  for (const viewport of [
    { width: 720, height: 900 },
    { width: 1023, height: 768 },
  ]) {
    test(`keeps the tablet command rail beside the canvas at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await loadWideEditor(page, viewport.width, viewport.height)

      const grid = await getBounds(page, '.grid-viewport')
      const hex = await getBounds(page, '.hex-code-container')
      const exportPanel = await getBounds(page, '.export-panel')
      const rail = await getBounds(page, '.editor-control-stack')
      const navigator = await getBounds(page, '.glyph-navigator')
      const outputStack = await getBounds(page, '.editor-output-stack')

      expect(rail.left).toBeGreaterThanOrEqual(grid.right)
      expect(hex.top).toBeGreaterThanOrEqual(grid.bottom)
      expect(exportPanel.top).toBeGreaterThanOrEqual(hex.bottom)
      expect(exportPanel.right).toBeLessThanOrEqual(viewport.width)
      for (const control of [outputStack, hex, exportPanel]) {
        expect(Math.abs(control.left - navigator.left)).toBeLessThanOrEqual(1)
        expect(Math.abs(control.right - navigator.right)).toBeLessThanOrEqual(1)
      }
      await expect(page.locator('.editor-actions')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.history-controls')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.tool-buttons')).toHaveCSS('display', 'grid')

      await expectControlsReachable(page)
    })
  }

  test('selects an export format before downloading', async ({ page }) => {
    await loadWideEditor(page, 1280, 720)
    const exportPanel = page.locator('.export-panel')
    const downloadButton = exportPanel.locator('.download-button')
    const formatButtons = exportPanel.locator('.format-option')

    await expect(downloadButton).toHaveCount(1)
    await expect(formatButtons.first()).toBeVisible()
    await expect(formatButtons).toHaveText(['PNG', 'BMP', 'SVG', 'HEX'])
    await expect(formatButtons.first()).toHaveClass(/selected/)
    await formatButtons.filter({ hasText: 'HEX' }).click()
    await expect(formatButtons.filter({ hasText: 'HEX' })).toHaveClass(
      /selected/,
    )
    await expect(downloadButton).toContainText('Download HEX')

    const downloadPromise = page.waitForEvent('download')
    await downloadButton.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.hex$/)
    await expect(page.locator('.notification')).toContainText(
      'HEX export is ready.',
    )
  })

  test('keeps the glyph manager as an overlay on tablets', async ({ page }) => {
    await loadWideEditor(page, 1000, 768)
    const grid = await getBounds(page, '.grid-viewport')

    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await waitForSidebarSettled(page)

    const sidebar = await getBounds(page, '.sidebar.active')
    expect(sidebar.width).toBeLessThan(1000)
    expect(sidebar.right).toBeGreaterThan(grid.left)
  })

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    test(`keeps editor controls reachable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await loadWideEditor(page, viewport.width, viewport.height)

      const grid = await getBounds(page, '.grid-viewport')
      const hex = await getBounds(page, '.hex-code-container')
      const exportPanel = await getBounds(page, '.export-panel')
      const rail = await getBounds(page, '.editor-control-stack')

      expect(hex.top).toBeGreaterThanOrEqual(grid.bottom)
      expect(exportPanel.top).toBeGreaterThanOrEqual(hex.bottom)
      expect(grid.left).toBeGreaterThanOrEqual(0)
      expect(exportPanel.left).toBeGreaterThanOrEqual(0)
      expect(exportPanel.right).toBeLessThanOrEqual(viewport.width)
      expect(rail.right).toBeLessThanOrEqual(viewport.width)
      await expect(page.locator('.editor-actions')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.tool-buttons')).toHaveCSS('display', 'grid')
      await expect(page.locator('.history-controls')).toHaveCSS(
        'flex-direction',
        'column',
      )

      await expectControlsReachable(page)
    })
  }

  test('pushes the editor while the glyph manager opens and resizes', async ({
    page,
  }) => {
    await loadWideEditor(page, 1440, 900)
    await page.getByRole('button', { name: 'Open glyph manager' }).click()

    const container = page.locator('.container')
    const sidebar = page.locator('.sidebar.active')
    await expect(container).toHaveClass(/glyph-sidebar-push/)
    await expect(sidebar).toBeVisible()
    await waitForSidebarSettled(page)

    const initialSidebar = await getBounds(page, '.sidebar.active')
    const initialGrid = await getBounds(page, '.grid-viewport')
    expect(initialGrid.left).toBeGreaterThanOrEqual(initialSidebar.right)

    const resizer = page.locator('.sidebar-resizer')
    const resizerBounds = await resizer.boundingBox()
    if (!resizerBounds) throw new Error('Glyph manager resizer is unavailable')
    await page.mouse.move(
      resizerBounds.x + resizerBounds.width / 2,
      resizerBounds.y + resizerBounds.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(620, resizerBounds.y + resizerBounds.height / 2, {
      steps: 8,
    })
    await page.mouse.up()

    const resizedSidebar = await getBounds(page, '.sidebar.active')
    const resizedGrid = await getBounds(page, '.grid-viewport')
    const resizedExportPanel = await getBounds(page, '.export-panel')
    expect(resizedSidebar.width).toBeGreaterThan(initialSidebar.width + 100)
    expect(resizedSidebar.right).toBeLessThanOrEqual(1440)
    expect(resizedGrid.left).toBeGreaterThanOrEqual(resizedSidebar.right)
    expect(resizedGrid.width).toBeLessThan(initialGrid.width)
    expect(resizedExportPanel.left).toBeGreaterThanOrEqual(resizedSidebar.right)
    expect(resizedExportPanel.right).toBeLessThanOrEqual(1440)
    await expectControlsReachable(page)

    await page.getByRole('button', { name: 'Close glyph manager' }).click()
    await expect(page.locator('.sidebar.active')).toHaveCount(1)
    await expect(page.locator('.sidebar.active .glyph-manager')).toBeVisible()
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    const pushEditor = settings.locator('#glyphManagerPushEditor')
    await expect(pushEditor).toBeChecked()
    await pushEditor.uncheck()
    await settings.locator('.settings-close').click()

    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expect(container).not.toHaveClass(/glyph-sidebar-push/)
    await waitForSidebarSettled(page)
    const overlaySidebar = await getBounds(page, '.sidebar.active')
    const overlaidGrid = await getBounds(page, '.grid-viewport')
    expect(overlaidGrid.left).toBeLessThan(overlaySidebar.right)
  })
})
