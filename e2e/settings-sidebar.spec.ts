import { expect, test, type Page } from '@playwright/test'

type ColorScheme = 'light' | 'dark'

const loadEditor = async (
  page: Page,
  colorScheme: ColorScheme = 'light',
  storage: Record<string, string> = {},
) => {
  await page.emulateMedia({ colorScheme })
  await page.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem('unicucumber-e2e-initialized')) return
    localStorage.clear()
    for (const [key, value] of entries) localStorage.setItem(key, value)
    sessionStorage.setItem('unicucumber-e2e-initialized', 'true')
  }, Object.entries(storage))
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
}

const openSettings = async (page: Page) => {
  const trigger = page.getByRole('button', { name: 'Open settings' })
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Settings' })
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('transform', 'none')
  return { trigger, drawer }
}

test('Auto follows live system changes while manual themes remain stable', async ({
  page,
}) => {
  await loadEditor(page, 'light')
  const { drawer } = await openSettings(page)
  const auto = drawer.getByRole('radio', { name: 'Auto' })
  const light = drawer.getByRole('radio', { name: 'Light' })
  const dark = drawer.getByRole('radio', { name: 'Dark' })

  await expect(auto).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(auto).toBeChecked()

  await light.check()
  await expect(light).toBeChecked()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await dark.check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await auto.check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(auto).toBeChecked()
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('unicucumber_theme_preference')),
    )
    .toBe('auto')
})

test('appearance preference persists across reloads', async ({ page }) => {
  await loadEditor(page, 'light')
  let settings = await openSettings(page)
  await settings.drawer.getByRole('radio', { name: 'Dark' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  settings = await openSettings(page)
  await expect(
    settings.drawer.getByRole('radio', { name: 'Dark' }),
  ).toBeChecked()
})

test('desktop drawer is non-modal, keyboard operable, and preserves editor state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await loadEditor(page, 'light')
  const cell = page.locator('[data-row="0"][data-col="0"]')
  const secondCell = page.locator('[data-row="0"][data-col="1"]')
  await cell.click()
  await expect(cell).toHaveClass(/filled/)

  const { trigger, drawer } = await openSettings(page)
  await expect(drawer).not.toHaveAttribute('aria-modal', 'true')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await expect(page.locator('.settings-overlay')).toBeHidden()

  const auto = drawer.getByRole('radio', { name: 'Auto' })
  await auto.focus()
  await page.keyboard.press('ArrowRight')
  await expect(drawer.getByRole('radio', { name: 'Light' })).toBeChecked()

  await secondCell.click()
  await expect(secondCell).toHaveClass(/filled/)
  await expect(cell).toHaveClass(/filled/)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.getByRole('button', { name: /Undo/i }).last().click()
  await expect(cell).toHaveClass(/filled/)
  await expect(secondCell).not.toHaveClass(/filled/)
})

test('close button returns focus to the settings trigger', async ({ page }) => {
  await loadEditor(page)
  const { trigger, drawer } = await openSettings(page)
  await drawer.getByRole('button', { name: 'Close settings' }).click()
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('tablet overlay closes outside, stays open inside, and locks the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await loadEditor(page)
  let settings = await openSettings(page)
  await expect(settings.drawer).toHaveAttribute('aria-modal', 'true')
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

  await settings.drawer.getByText('Drawing', { exact: true }).click()
  await expect(settings.drawer).toBeVisible()
  await page.locator('.settings-overlay').click({ position: { x: 20, y: 120 } })
  await expect(settings.drawer).toBeHidden()
  await expect(settings.trigger).toBeFocused()

  settings = await openSettings(page)
  await page.keyboard.press('Escape')
  await expect(settings.drawer).toBeHidden()
})

test('mobile drawer fills the viewport and keeps its content scrollable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loadEditor(page, 'dark')
  const { drawer } = await openSettings(page)
  const bounds = await drawer.boundingBox()

  expect(bounds?.x).toBe(0)
  expect(bounds?.width).toBe(390)
  expect(bounds?.height).toBeLessThanOrEqual(844)
  await expect(drawer).toHaveAttribute('aria-modal', 'true')
  await expect(drawer.getByRole('radio', { name: 'Auto' })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const scrollMetrics = await drawer
    .locator('.settings-content')
    .evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }))
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight)
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await expect(page.locator('html')).not.toHaveCSS('overflow-x', 'auto')
})

test('legacy manual theme values migrate into the new preference', async ({
  page,
}) => {
  await loadEditor(page, 'light', { theme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const { drawer } = await openSettings(page)
  await expect(drawer.getByRole('radio', { name: 'Dark' })).toBeChecked()
  const storage = await page.evaluate(() => ({
    current: localStorage.getItem('unicucumber_theme_preference'),
    legacy: localStorage.getItem('theme'),
  }))
  expect(storage).toEqual({ current: 'dark', legacy: null })
})
