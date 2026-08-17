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
  page.on('console', (message) => {
    const location = message.location().url
    if (
      message.type() === 'error' &&
      message.text() === 'Failed to load resource: net::ERR_FAILED' &&
      (location.includes('/unifont/') || location.includes('/composition/'))
    ) {
      return
    }
    failures.push(
      `console:${message.type()}:${message.text()}${location ? `:${location}` : ''}`,
    )
  })
  page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`))
  page.on('requestfailed', (request) => {
    if (
      request.url().includes('/unifont/') ||
      request.url().includes('/composition/')
    ) {
      return
    }
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
  const unifontVersion = await page.evaluate(async () => {
    const response = await fetch('/unifont/index.json')
    return (await response.json()).version as string
  })
  await expect
    .poll(() =>
      page.evaluate(async () => (await fetch('/unifont/catalog.json')).ok),
    )
    .toBe(true)
  await expect
    .poll(() =>
      page.evaluate(
        async (version) =>
          (await caches.keys()).some((name) =>
            name.startsWith(`unicucumber-unifont-catalog-${version}`),
          ),
        unifontVersion,
      ),
    )
    .toBe(true)
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
      page.evaluate(
        async (version) =>
          (await caches.keys()).some((name) =>
            name.startsWith(`unicucumber-unifont-chunks-${version}`),
          ),
        unifontVersion,
      ),
    )
    .toBe(true)

  await page.locator('.code-point-input input').fill('660E')
  await page.locator('.code-point-input input').press('Enter')
  await page.getByTestId('composition-open').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const compositionSearch = page.locator('.component-search input')
  await compositionSearch.fill('木')
  await compositionSearch.dispatchEvent('input')
  const onlineComponent = page.locator('.component-card').first()
  await expect(onlineComponent).toBeVisible()
  await onlineComponent.click()

  const compositionVersion = await page.evaluate(async () => {
    const response = await fetch('/composition/index.json')
    return (await response.json()).dataVersion as string
  })
  await expect
    .poll(() =>
      page.evaluate(async (version) => {
        const names = await caches.keys()
        return [
          `unicucumber-composition-catalog-${version}`,
          `unicucumber-composition-components-${version}`,
          `unicucumber-composition-ids-${version}`,
        ].every((name) => names.includes(name))
      }, compositionVersion),
    )
    .toBe(true)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText("You're using the latest version.")).toBeVisible()

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })
  })
  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
    await expect(
      page.getByRole('heading', { name: 'UniCucumber' }),
    ).toBeVisible()
    await expect(page.locator('.grid-container')).toBeVisible()
    await expect(page.locator('.offline-indicator')).toBeVisible()
    expect(
      await page.evaluate(async () => (await fetch('/unifont/000.json')).ok),
    ).toBe(true)
    expect(
      await page.evaluate(
        async () => (await fetch('/unifont/catalog.json')).ok,
      ),
    ).toBe(true)

    await page.getByTestId('composition-open').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const offlineSearch = page.locator('.component-search input')
    await offlineSearch.fill('木')
    await offlineSearch.dispatchEvent('input')
    const offlineComponent = page.locator('.component-card').first()
    await expect(offlineComponent).toBeVisible()
    await offlineComponent.click()
    await expect(page.locator('.composition-layer')).toHaveCount(1)
    expect(failures).toEqual([])
  } finally {
    await context.setOffline(false)
  }
})
