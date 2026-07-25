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
      const layout = await getBounds(page, '.editor-layout')
      const outputStack = await getBounds(page, '.editor-output-stack')

      expect(rail.left).toBeGreaterThanOrEqual(grid.right)
      expect(hex.top).toBeGreaterThanOrEqual(grid.bottom)
      expect(exportPanel.top).toBeGreaterThanOrEqual(hex.bottom)
      expect(exportPanel.right).toBeLessThanOrEqual(viewport.width)
      expect(exportPanel.bottom).toBeLessThanOrEqual(viewport.height)
      if (viewport.width < 900) {
        expect(
          Math.abs(
            (outputStack.left + outputStack.right) / 2 -
              (layout.left + layout.right) / 2,
          ),
        ).toBeLessThanOrEqual(1)
        expect(outputStack.right).toBeLessThanOrEqual(layout.right + 1)
        expect(outputStack.width).toBeLessThanOrEqual(43 * 16 + 1)
      }
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

  test('combines export formats behind one download button', async ({
    page,
  }, testInfo) => {
    await loadWideEditor(page, 1280, 720)
    const exportPanel = page.locator('.export-panel')
    const downloadControl = exportPanel.locator('.export-download')
    const downloadButton = downloadControl.locator('.download-button')
    const formatButtons = downloadControl.locator('.download-menu button')

    await expect(downloadButton).toHaveCount(1)
    await expect(downloadButton).toContainText('Export glyph')
    await expect(formatButtons.first()).toBeHidden()
    await downloadButton.click()
    await expect(downloadControl).toHaveAttribute('open', '')
    await expect(formatButtons.first()).toBeVisible()
    await expect(formatButtons).toHaveText(['PNG', 'BMP', 'SVG', 'HEX'])
    await page.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-export-menu-desktop.png',
      ),
      fullPage: false,
    })
    await expect(
      exportPanel.getByRole('button', { name: 'Copy hex' }),
    ).toHaveCount(0)

    const downloadPromise = page.waitForEvent('download')
    await formatButtons.filter({ hasText: 'HEX' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.hex$/)
    await expect(downloadControl).not.toHaveAttribute('open', '')
    await expect(downloadButton).toBeFocused()
    await expect(page.locator('.notification')).toContainText(
      'HEX export is ready.',
    )

    const mobilePage = await page.context().newPage()
    await loadWideEditor(mobilePage, 390, 844)
    await mobilePage.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    )
    const mobileDownloadControl = mobilePage.locator('.export-download')
    await mobileDownloadControl.locator('.download-button').click()
    await expect(
      mobileDownloadControl.locator('.download-menu button').first(),
    ).toBeVisible()
    await mobilePage.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-export-menu-mobile.png',
      ),
      fullPage: false,
    })
    await mobilePage.close()
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

  test('reveals every vertical command name to the left', async ({ page }) => {
    await loadWideEditor(page, 768, 1024)
    const actionButtons = page.locator(
      '.action-group > button, .history-controls > button',
    )
    const toolButtons = page.locator(
      '.tool-buttons > .tool-button, .tool-overflow > summary',
    )

    await expect(actionButtons).toHaveCount(5)
    await expect(toolButtons).toHaveCount(4)

    for (const button of await actionButtons.all()) {
      const label = await button.getAttribute('aria-label')
      if (!label) throw new Error('Vertical command is missing its label')
      await expect(button).not.toHaveAttribute('title')
      await button.hover({ force: true })
      await expect
        .poll(() =>
          button.evaluate((element) => ({
            content: getComputedStyle(element, '::after').content,
            opacity: getComputedStyle(element, '::after').opacity,
          })),
        )
        .toEqual({
          content: `"${label}"`,
          opacity: '1',
        })
      expect(
        await button.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element, '::after').right),
        ),
      ).toBeGreaterThan(8)
    }

    for (const button of await toolButtons.all()) {
      const label = await button.getAttribute('aria-label')
      const tooltip = button.locator('.tool-name-tooltip')
      if (!label) throw new Error('Vertical tool is missing its label')
      await expect(button).not.toHaveAttribute('title')
      await button.hover()
      await expect(tooltip).toHaveCSS('opacity', '1')
      await expect(tooltip).toHaveText(label)
      const buttonBounds = await button.boundingBox()
      const tooltipBounds = await tooltip.boundingBox()
      if (!buttonBounds || !tooltipBounds) {
        throw new Error('Tool name tooltip is unavailable')
      }
      expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(
        buttonBounds.x,
      )
    }

    await page.getByRole('button', { name: 'Erase', exact: true }).focus()
    await expect(
      page
        .getByRole('button', { name: 'Erase', exact: true })
        .locator('.tool-name-tooltip'),
    ).toHaveCSS('opacity', '1')
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
