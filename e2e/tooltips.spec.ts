import { expect, test } from '@playwright/test'

test('icon tooltips prefer free space and stay accessible @cross-browser', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1000 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const tooltip = page.getByRole('tooltip')
  const restore = page.locator('.restore-action')
  await restore.hover({ force: true })
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(
    (await restore.getAttribute('aria-label')) ?? '',
  )
  const buttonBounds = await restore.boundingBox()
  const tipBounds = await tooltip.boundingBox()
  expect(tipBounds!.x).toBeGreaterThanOrEqual(
    buttonBounds!.x + buttonBounds!.width + 7,
  )
  await page.screenshot({ path: testInfo.outputPath('tooltip-wide.png') })

  for (const button of await page.locator('.view-controls button').all()) {
    await button.hover()
    await expect(tooltip).toHaveText(
      (await button.getAttribute('aria-label')) ?? '',
    )
    const control = await button.boundingBox()
    const hint = await tooltip.boundingBox()
    expect(hint!.y).toBeGreaterThanOrEqual(control!.y + control!.height + 7)
  }

  for (const button of await page.locator('.modal-buttons > *').all()) {
    await button.hover({ force: true })
    await expect(tooltip).toHaveText(
      (await button.getAttribute('aria-label')) ?? '',
    )
    await expect(tooltip).toBeVisible()
  }

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
  await page.setViewportSize({ width: 360, height: 640 })
  await expect(tooltip).toBeVisible()
  await expect
    .poll(async () => {
      const bounds = await tooltip.boundingBox()
      return (
        bounds !== null &&
        bounds.x >= 8 &&
        bounds.x + bounds.width <= 352 &&
        bounds.y >= 8 &&
        bounds.y + bounds.height <= 632
      )
    })
    .toBe(true)
  await page.screenshot({ path: testInfo.outputPath('tooltip-narrow.png') })
  const narrowSettings = await settings.boundingBox()
  const narrowTooltip = await tooltip.boundingBox()
  expect(narrowTooltip!.y).toBeGreaterThanOrEqual(
    narrowSettings!.y + narrowSettings!.height + 7,
  )
  await settings.click()
  await expect(tooltip).toHaveCount(0)
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
