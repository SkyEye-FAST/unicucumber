import { expect, test } from '@playwright/test'

const DEFAULT_PREVIEW = '南去經三國，東來過五湖。'

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
})

test('opens text preview in a separate bottom drawer and restores focus on close', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open text preview' })
  await expect(
    page.locator('.editor-output-stack .text-preview-drawer'),
  ).toHaveCount(0)

  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Text preview' })
  const input = drawer.getByRole('textbox', { name: 'Preview text' })
  await expect(drawer).toBeVisible()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue(DEFAULT_PREVIEW)
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('#app')).toHaveAttribute('inert', '')

  await expect(drawer.locator('.preview-glyph')).toHaveCount(
    Array.from(DEFAULT_PREVIEW).length,
  )
  await expect(drawer.locator('.preview-glyph.is-missing')).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
})

test('keeps long previews inside the bottom drawer on a phone viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open text preview' }).click()
  const drawer = page.getByRole('dialog', { name: 'Text preview' })
  const input = drawer.getByRole('textbox', { name: 'Preview text' })
  await input.fill(`${DEFAULT_PREVIEW}${DEFAULT_PREVIEW}${DEFAULT_PREVIEW}`)

  await expect
    .poll(() =>
      drawer
        .locator('.preview-stage')
        .evaluate((stage) => stage.scrollWidth > stage.clientWidth),
    )
    .toBe(true)

  const geometry = await drawer.evaluate((element) => {
    const stage = element.querySelector('.preview-stage')
    const rect = element.getBoundingClientRect()
    return {
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      stageClientWidth: stage?.clientWidth ?? 0,
      stageScrollWidth: stage?.scrollWidth ?? 0,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(geometry).toMatchObject({
    bottom: 844,
    left: 0,
    right: 390,
    bodyScrollWidth: 390,
    viewportWidth: 390,
  })
  expect(geometry.stageScrollWidth).toBeGreaterThan(geometry.stageClientWidth)

  await page
    .locator('.text-preview-overlay')
    .click({ position: { x: 10, y: 10 } })
  await expect(drawer).toBeHidden()
})
