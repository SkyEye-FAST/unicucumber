import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
})

test(
  'custom shortcuts persist, reject conflicts, update hints and can be reset',
  { tag: ['@cross-browser', '@phone', '@tablet'] },
  async ({ page }) => {
    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings
      .locator('summary')
      .filter({ hasText: 'Keyboard shortcuts' })
      .click()
    const draw = settings.getByRole('textbox', {
      name: 'Shortcut for Draw',
      exact: true,
    })
    await draw.press('q')
    await expect(draw).toHaveValue('Q')
    const erase = settings.getByRole('textbox', {
      name: 'Shortcut for Erase',
      exact: true,
    })
    await erase.press('q')
    await expect(
      settings.locator('.shortcut-settings').getByRole('status'),
    ).toContainText('Already assigned to Draw')
    await expect(erase).toHaveValue('E')
    await page.getByRole('button', { name: 'Close settings' }).click()
    await page.locator('.grid-viewport').focus()
    await page.keyboard.press('e')
    await page.keyboard.press('p')
    const tool = (name: string) =>
      page.getByRole('button', { name, exact: true }).filter({ visible: true })
    await expect(tool('Erase')).toHaveClass(/active/)
    await page.keyboard.press('q')
    await expect(tool('Draw')).toHaveClass(/active/)
    await expect(
      page.locator('.tool-buttons button[aria-label="Draw"]'),
    ).toHaveAttribute('data-tooltip', 'Draw (Q)')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Open settings' }).click()
    await settings
      .locator('summary')
      .filter({ hasText: 'Keyboard shortcuts' })
      .click()
    await expect(draw).toHaveValue('Q')
    await settings
      .getByRole('button', { name: 'Clear shortcut for Draw', exact: true })
      .click()
    await expect(draw).toHaveValue('')
    await settings
      .getByRole('button', { name: 'Restore default shortcuts' })
      .click()
    await expect(draw).toHaveValue('P')
  },
)

test(
  'custom undo works with canvas focus while text, composition and settings are isolated',
  { tag: '@cross-browser' },
  async ({ page }) => {
    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings
      .locator('summary')
      .filter({ hasText: 'Keyboard shortcuts' })
      .click()
    await settings
      .getByRole('textbox', { name: 'Shortcut for Undo', exact: true })
      .press('u')
    await page.getByRole('button', { name: 'Close settings' }).click()
    const pixel = page.locator('[data-row="0"][data-col="0"]')
    await pixel.click()
    await expect(pixel).toHaveClass(/filled/)
    await page.locator('.grid-viewport').focus()
    await page.keyboard.press('u')
    await expect(pixel).not.toHaveClass(/filled/)
    expect(
      await page.locator('.grid-viewport').evaluate((element) => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          repeat: true,
          bubbles: true,
          cancelable: true,
        })
        element.dispatchEvent(event)
        return event.defaultPrevented
      }),
    ).toBe(true)
    await page.keyboard.press('Control+Shift+z')
    await expect(pixel).toHaveClass(/filled/)
    await page
      .locator('.grid-viewport')
      .dispatchEvent('keydown', { key: 'u', isComposing: true })
    await expect(pixel).toHaveClass(/filled/)
    await page.getByRole('button', { name: 'Open settings' }).click()
    await page.getByRole('button', { name: 'Close settings' }).focus()
    await page.keyboard.press('u')
    await expect(pixel).toHaveClass(/filled/)
    await page.getByRole('button', { name: 'Close settings' }).click()
    const input = page.locator('#hexInput')
    await input.focus()
    await page.keyboard.press('u')
    await expect(pixel).toHaveClass(/filled/)
  },
)
