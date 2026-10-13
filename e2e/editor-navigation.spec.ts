import { expect, test } from '@playwright/test'
import { join } from 'node:path'

test(
  'types characters and navigates without discarding edits silently',
  {
    tag: ['@cross-browser', '@phone', '@tablet'],
  },
  async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => localStorage.clear())
    await page.route(
      /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
      (route) => route.fulfill({ contentType: 'text/css', body: '' }),
    )
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const character = page.getByRole('textbox', {
      name: 'Enter character',
      exact: true,
    })
    const codePoint = page.getByRole('textbox', {
      name: 'Enter Unicode code point',
      exact: true,
    })
    await character.fill('A')
    await character.press('Enter')
    await expect(codePoint).toHaveValue('0041')
    const pixel = page.locator('[data-row="0"][data-col="0"]')
    await pixel.click()
    await page
      .getByRole('button', {
        name: 'Add current glyph to glyph set',
        exact: true,
      })
      .click()
    await expect(page.locator('.notification')).toContainText('Glyph saved.')
    await page
      .getByRole('button', { name: 'Next character', exact: true })
      .click()
    await expect(codePoint).toHaveValue('0042')
    await expect(character).toHaveValue('B')
    // Use the hex field to guarantee an unsaved edit independent of Unifont's bitmap.
    const hex = page.getByRole('textbox', { name: 'Hexadecimal glyph data' })
    await hex.fill('8000'.repeat(16))
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await page
      .getByRole('button', { name: 'Previous character', exact: true })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Unsaved Changes' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(codePoint).toHaveValue('0042')
    await expect(hex).toHaveValue('8000'.repeat(16))
    await page
      .getByRole('button', { name: 'Previous character', exact: true })
      .click()
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(codePoint).toHaveValue('0041')
    await expect(character).toHaveValue('A')
    await expect(pixel).toHaveClass(/filled/)
    if (testInfo.project.name.includes('phone')) {
      const actions = await page.locator('.editor-actions').boundingBox()
      const exportPanel = await page.locator('.export-panel').boundingBox()
      expect(actions!.y + actions!.height).toBeLessThanOrEqual(exportPanel!.y)
    }
    await codePoint.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        `unicucumber-editor-navigation-${testInfo.project.name}.png`,
      ),
    })
    expect(errors).toEqual([])
  },
)
