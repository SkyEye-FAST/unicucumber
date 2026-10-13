import { expect, test } from '@playwright/test'

test('icon tooltips support hover, keyboard focus, and Escape dismissal @cross-browser', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const tooltip = page.getByRole('tooltip')
  const restore = page.locator('.restore-action')
  await restore.hover({ force: true })
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(
    (await restore.getAttribute('aria-label')) ?? '',
  )
  const settings = page.getByRole('button', {
    name: 'Open settings',
    exact: true,
  })
  await settings.hover()
  await tooltip.hover()
  await expect(tooltip).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)

  await page.mouse.move(0, 0)
  await settings.focus()
  await expect(tooltip).toBeVisible()
  await expect(settings).toHaveAttribute(
    'aria-describedby',
    (await tooltip.getAttribute('id')) ?? '',
  )
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await expect(settings).not.toHaveAttribute('aria-describedby')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(tooltip).toBeVisible()
  await settings.click()
  // The drawer's focused close button may show its own accessible tooltip.
  await expect(
    page.getByRole('tooltip', { name: 'Open settings', exact: true }),
  ).toHaveCount(0)
  await expect(settings).not.toHaveAttribute('aria-describedby')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('touch activation does not leave a tooltip over the interface @phone @tablet', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'touch behavior runs on phone and tablet projects')
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: 'Open glyph manager', exact: true })
    .tap()
  await expect(page.locator('.sidebar.active')).toBeVisible()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})
