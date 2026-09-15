import { expect, test } from '@playwright/test'

for (const locale of ['en', 'zh-CN']) {
  test(
    `mobile tool labels fit on one line at 320px in ${locale}`,
    { tag: '@phone' },
    async ({ page }, testInfo) => {
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
      const labels = await toolbar
        .locator(':scope > button span')
        .evaluateAll((elements) =>
          elements.map((label) => {
            const range = document.createRange()
            range.selectNodeContents(label)
            const text = range.getBoundingClientRect()
            const button = label.closest('button')!.getBoundingClientRect()
            return {
              lines: range.getClientRects().length,
              left: text.left,
              right: text.right,
              buttonLeft: button.left,
              buttonRight: button.right,
              width: button.width,
            }
          }),
        )
      // WebKit's fractional flex sizing can put the last edge at 320.03125px
      // on Linux. Allow CSS-pixel rounding at viewport edges only.
      const viewportTolerance = 1
      for (const label of labels) {
        expect(label.lines).toBe(1)
        expect(label.left).toBeGreaterThanOrEqual(label.buttonLeft)
        expect(label.right).toBeLessThanOrEqual(label.buttonRight)
        expect(label.buttonLeft).toBeGreaterThanOrEqual(-viewportTolerance)
        expect(label.buttonRight).toBeLessThanOrEqual(320 + viewportTolerance)
        expect(label.width).toBeGreaterThanOrEqual(44)
      }
      await page.screenshot({ path: testInfo.outputPath('mobile-toolbar.png') })
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
