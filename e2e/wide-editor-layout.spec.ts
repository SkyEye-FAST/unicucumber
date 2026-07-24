import { expect, test, type Page } from '@playwright/test'

import { join } from 'node:path'

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

test.describe('wide editor layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'the exact wide-screen geometry runs once',
    )
  })

  for (const viewport of [
    { width: 720, height: 900 },
    { width: 768, height: 1024 },
    { width: 1000, height: 768 },
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

      expect(rail.left).toBeGreaterThanOrEqual(grid.right)
      expect(hex.top).toBeGreaterThanOrEqual(grid.bottom)
      expect(exportPanel.top).toBeGreaterThanOrEqual(hex.bottom)
      expect(exportPanel.right).toBeLessThanOrEqual(viewport.width)
      expect(exportPanel.bottom).toBeLessThanOrEqual(viewport.height)
      await expect(page.locator('.editor-actions')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.history-controls')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.tool-buttons')).toHaveCSS(
        'flex-direction',
        'column',
      )

      const documentHeight = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
      )
      expect(documentHeight).toBeLessThanOrEqual(viewport.height + 1)
    })
  }

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
    test(`keeps the editor chrome inside ${viewport.width}x${viewport.height}`, async ({
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
      expect(exportPanel.bottom).toBeLessThanOrEqual(viewport.height)
      await expect(page.locator('.editor-actions')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.tool-buttons')).toHaveCSS(
        'flex-direction',
        'column',
      )
      await expect(page.locator('.history-controls')).toHaveCSS(
        'flex-direction',
        'column',
      )

      const documentHeight = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
      )
      expect(documentHeight).toBeLessThanOrEqual(viewport.height + 1)
    })
  }

  test('pushes the editor while the glyph manager opens and resizes', async ({
    page,
  }, testInfo) => {
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
    expect(resizedExportPanel.bottom).toBeLessThanOrEqual(900)
    const resizedDocumentHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ),
    )
    expect(resizedDocumentHeight).toBeLessThanOrEqual(901)
    await page.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-wide-sidebar-push.png',
      ),
      fullPage: false,
    })

    await page.getByRole('button', { name: 'Close glyph manager' }).click()
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
