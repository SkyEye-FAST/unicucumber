import { expect, test } from '@playwright/test'

// Cover distinct toolbar and canvas layouts; theme behavior has its own tests.
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 480, height: 854 },
  { width: 600, height: 960 },
  { width: 768, height: 871 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 1200 },
]

test.describe('responsive editor layout', () => {
  for (const viewport of viewports) {
    test(`keeps the canvas and tools usable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'chromium',
        'layout breakpoints run once',
      )
      await page.route(
        /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
        (route) => route.fulfill({ contentType: 'text/css', body: '' }),
      )
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.grid-container')).toBeVisible()

      const metrics = await page.evaluate(() => {
        const grid = document
          .querySelector('.grid-container')!
          .getBoundingClientRect()
        const viewport = document
          .querySelector('.grid-viewport')!
          .getBoundingClientRect()
        const cell = document.querySelector('.cell')!.getBoundingClientRect()
        return {
          overflow:
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            ) - document.documentElement.clientWidth,
          grid: {
            left: grid.left,
            right: grid.right,
            top: grid.top,
            bottom: grid.bottom,
          },
          viewport: { top: viewport.top, bottom: viewport.bottom },
          cell: { width: cell.width, height: cell.height },
        }
      })
      expect(metrics.overflow).toBeLessThanOrEqual(1)
      expect(metrics.grid.left).toBeGreaterThanOrEqual(0)
      expect(metrics.grid.right).toBeLessThanOrEqual(viewport.width)
      expect(metrics.grid.top).toBeGreaterThanOrEqual(metrics.viewport.top)
      expect(metrics.grid.bottom).toBeLessThanOrEqual(metrics.viewport.bottom)
      expect(metrics.cell.width).toBe(metrics.cell.height)
      expect(metrics.cell.width).toBeGreaterThanOrEqual(
        viewport.width < 720 ? 17 : 9,
      )

      if (viewport.width >= 720) {
        await expect(page.locator('.tool-buttons')).toBeVisible()
        return
      }
      const headerTargets = await page
        .locator('.editor-header .modal-button:visible')
        .evaluateAll((buttons) =>
          buttons.map((button) => {
            const bounds = button.getBoundingClientRect()
            return Math.min(bounds.width, bounds.height)
          }),
        )
      expect(Math.min(...headerTargets)).toBeGreaterThanOrEqual(44)
      const toolbar = page.locator('.mobile-command-bar')
      await expect(toolbar).toBeVisible()
      await expect(page.locator('.tool-buttons')).toBeHidden()
      await toolbar.getByRole('button', { name: 'More', exact: true }).click()
      await expect(toolbar.locator('.more-rail')).toBeVisible()
      const toolbarBounds = await toolbar.boundingBox()
      expect(metrics.grid.bottom).toBeLessThanOrEqual(toolbarBounds!.y)
      await toolbar.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(toolbar.locator('.more-rail')).toBeHidden()
    })
  }
})
