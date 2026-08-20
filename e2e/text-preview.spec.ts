import { expect, test } from '@playwright/test'

const DEFAULT_PREVIEW = '南去經三國，東來過五湖。'

test.beforeEach(async ({ page }) => {
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
})

test(
  'opens text preview in a separate bottom drawer and restores focus on close',
  {
    tag: '@cross-browser',
  },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const trigger = page.getByRole('button', { name: 'Open text preview' })
    await expect(
      page.locator('.editor-output-stack .text-preview-drawer'),
    ).toHaveCount(0)

    await trigger.dispatchEvent('click')
    const drawer = page.getByRole('dialog', { name: 'Text preview' })
    const input = drawer.getByRole('textbox', { name: 'Preview text' })
    await expect(drawer).toBeVisible()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue(DEFAULT_PREVIEW)
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
    await expect(page.locator('#app')).toHaveAttribute('inert', '')

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 10_000 })
    await expect(trigger).toBeFocused()
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  },
)

test(
  'wraps long multi-line previews inside the bottom drawer on a phone viewport',
  {
    tag: '@phone',
  },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    const codePointInput = page.locator('.code-point-input input')
    await codePointInput.fill('5357')
    await codePointInput.press('Enter')
    await expect(codePointInput).toHaveValue('5357')
    await page
      .getByRole('button', { name: 'Open text preview' })
      .dispatchEvent('click')
    const drawer = page.getByRole('dialog', { name: 'Text preview' })
    const input = drawer.getByRole('textbox', { name: 'Preview text' })
    await expect(drawer).toBeVisible()
    await expect(input).toBeFocused()
    const longLine = '南'.repeat(24)
    await input.fill(`${longLine}\n${longLine}`)

    await expect(drawer.locator('.glyph-line')).toHaveCount(2, {
      timeout: 15_000,
    })
    await expect(drawer.locator('.preview-stage')).not.toHaveClass(
      /is-loading/,
      {
        timeout: 15_000,
      },
    )

    await expect
      .poll(
        () =>
          drawer
            .locator('.preview-stage')
            .evaluate((stage) => stage.scrollWidth <= stage.clientWidth),
        { timeout: 15_000 },
      )
      .toBe(true)

    await expect(drawer).toHaveCSS('transform', 'none')
    const geometry = await drawer.evaluate((element) => {
      const stage = element.querySelector('.preview-stage')
      const firstLine = element.querySelector('.glyph-line')
      const rect = element.getBoundingClientRect()
      return {
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        stageClientWidth: stage?.clientWidth ?? 0,
        stageScrollWidth: stage?.scrollWidth ?? 0,
        firstLineHeight: firstLine?.getBoundingClientRect().height ?? 0,
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }
    })

    expect(geometry).toMatchObject({
      left: 0,
      right: 390,
      bodyScrollWidth: 390,
      viewportWidth: 390,
      viewportHeight: 844,
    })
    expect(
      Math.abs(geometry.bottom - geometry.viewportHeight),
    ).toBeLessThanOrEqual(2)
    expect(geometry.stageScrollWidth).toBeLessThanOrEqual(
      geometry.stageClientWidth,
    )
    expect(geometry.firstLineHeight).toBeGreaterThan(16 * 3)

    await page
      .locator('.text-preview-overlay')
      .click({ position: { x: 10, y: 10 } })
    await expect(drawer).toBeHidden({ timeout: 10_000 })
  },
)
