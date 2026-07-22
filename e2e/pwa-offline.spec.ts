import { expect, test } from '@playwright/test'

test('production shell reloads offline after service-worker installation', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    process.env.PWA_E2E !== '1',
    'run against pnpm preview with PWA_E2E=1',
  )

  const failures: string[] = []
  page.on('console', (message) =>
    failures.push(`console:${message.type()}:${message.text()}`),
  )
  page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`))
  page.on('requestfailed', (request) => {
    if (request.url().includes('/unifont/')) return
    failures.push(`request:${request.url()}:${request.failure()?.errorText}`)
  })
  test.skip(
    browserName !== 'chromium',
    'service-worker smoke test uses Chromium',
  )

  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true)
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).length))
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const response = await fetch('/unifont/000.json')
        return response.ok
      }),
    )
    .toBe(true)
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.keys()).some((name) =>
          name.startsWith('unicucumber-unifont-chunks-17.0.03'),
        ),
      ),
    )
    .toBe(true)

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'UniCucumber' }),
    ).toBeVisible()
    await expect(page.locator('.grid-container')).toBeVisible()
    await expect(page.locator('.offline-indicator')).toBeVisible()
    expect(
      await page.evaluate(async () => (await fetch('/unifont/000.json')).ok),
    ).toBe(true)
    expect(failures).toEqual([])
  } finally {
    await context.setOffline(false)
  }
})
