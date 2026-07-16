import { expect, test, type Page } from '@playwright/test'

import { join } from 'node:path'

const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'android-phone', width: 360, height: 800 },
  { name: 'iphone', width: 390, height: 844 },
  { name: 'large-phone', width: 412, height: 915 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

const getLayoutMetrics = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const grid = document.querySelector<HTMLElement>('.grid-container')
    const cell = document.querySelector<HTMLElement>('.cell')
    const gridBounds = grid?.getBoundingClientRect()
    const cellBounds = cell?.getBoundingClientRect()

    return {
      viewportWidth: root.clientWidth,
      documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
      horizontalOverflow:
        Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      grid: gridBounds
        ? {
            left: gridBounds.left,
            right: gridBounds.right,
            width: gridBounds.width,
          }
        : null,
      cellSize: cellBounds
        ? { width: cellBounds.width, height: cellBounds.height }
        : null,
      overflowElements: Array.from(
        document.querySelectorAll<HTMLElement>('body *'),
      )
        .map((element) => {
          const bounds = element.getBoundingClientRect()
          return {
            selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
              element.classList.length
                ? `.${Array.from(element.classList).join('.')}`
                : ''
            }`,
            left: bounds.left,
            right: bounds.right,
            width: bounds.width,
          }
        })
        .filter(
          ({ left, right, width }) =>
            width > 0 && (left < -1 || right > root.clientWidth + 1),
        )
        .slice(0, 12),
    }
  })

test.describe('responsive visual baseline', () => {
  for (const viewport of viewports) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`${viewport.name} ${colorScheme}`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name !== 'chromium',
          'the exact viewport matrix runs once; device projects cover configured profiles',
        )
        const messages: string[] = []
        page.on('console', (message) => {
          if (message.type() === 'error' || message.type() === 'warning') {
            messages.push(`${message.type()}: ${message.text()}`)
          }
        })
        page.on('pageerror', (error) =>
          messages.push(`pageerror: ${error.message}`),
        )

        await page.route(
          /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
          (route) => route.fulfill({ contentType: 'text/css', body: '' }),
        )
        await page.setViewportSize(viewport)
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
        await page.goto('/', { waitUntil: 'domcontentloaded' })

        await expect(page).toHaveTitle(/UniCucumber/i)
        await expect(page.locator('#app')).not.toBeEmpty()
        await expect(page.locator('.grid-container')).toBeVisible()

        const metrics = await getLayoutMetrics(page)
        const screenshotDir = join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-baseline',
        )
        await page.screenshot({
          path: join(
            screenshotDir,
            `${viewport.width}x${viewport.height}-${colorScheme}.png`,
          ),
          fullPage: false,
        })

        console.log(
          JSON.stringify({ viewport, colorScheme, metrics, messages }, null, 2),
        )

        expect(messages, 'unexpected console warnings or errors').toEqual([])
        expect(
          metrics.horizontalOverflow,
          'the page must not scroll horizontally',
        ).toBeLessThanOrEqual(1)
        expect(metrics.grid).not.toBeNull()
        expect(metrics.grid?.left ?? -1).toBeGreaterThanOrEqual(0)
        expect(metrics.grid?.right ?? Infinity).toBeLessThanOrEqual(
          viewport.width,
        )
      })
    }
  }
})
