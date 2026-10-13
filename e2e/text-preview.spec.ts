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
