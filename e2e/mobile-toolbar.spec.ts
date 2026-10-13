import { expect, test } from '@playwright/test'

for (const locale of ['en', 'zh-CN']) {
  test(
    `mobile More menu exposes Paste and Pan in ${locale}`,
    { tag: '@phone' },
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 })
      await page.addInitScript(
        (language) => localStorage.setItem('unicucumber_locale', language),
        locale,
      )
      await page.route(
        /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
        (route) => route.fulfill({ contentType: 'text/css', body: '' }),
      )
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const toolbar = page.locator('.mobile-command-bar')
      await expect(toolbar).toBeVisible()
      await expect(toolbar.locator('.toolbar-tool--smartDraw')).toHaveText(
        locale === 'en' ? 'Smart brush' : '智能画笔',
      )
      await toolbar.locator('.more-toggle').click()
      await expect(toolbar.locator('.more-action--paste')).toBeVisible()
      await expect(toolbar.locator('.more-action--paste')).toBeDisabled()
      await toolbar
        .getByRole('button', {
          name: locale === 'en' ? 'Pan' : '平移',
          exact: true,
        })
        .click()
      await expect(toolbar.locator('.more-rail')).toHaveCount(0)
    },
  )
}
