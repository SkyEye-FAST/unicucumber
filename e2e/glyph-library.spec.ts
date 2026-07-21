import { expect, test, type Page } from '@playwright/test'

import { join } from 'node:path'

type ThemePreference = 'auto' | 'light' | 'dark'

const makeGlyphs = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const codePoint = (0x21 + index).toString(16).toUpperCase().padStart(4, '0')
    const width = index % 5 === 0 ? 8 : 16
    const rowBytes = width / 8
    const bytes = Array.from({ length: rowBytes * 16 }, (__, byteIndex) => {
      const row = Math.floor(byteIndex / rowBytes)
      const columnByte = byteIndex % rowBytes
      const seed = (index * 37 + row * 19 + columnByte * 73) & 0xff
      return (seed ^ (row === 0 || row === 15 ? 0xff : 0x18))
        .toString(16)
        .toUpperCase()
        .padStart(2, '0')
    }).join('')
    return { codePoint, hexValue: bytes }
  })

const seedGlyphs = async (
  page: Page,
  count = 96,
  themePreference: ThemePreference = 'auto',
) => {
  const glyphs = makeGlyphs(count)
  await page.addInitScript(
    ({ items, theme }) => {
      localStorage.clear()
      localStorage.setItem('unicucumber_glyphs', JSON.stringify(items))
      localStorage.setItem('unicucumber_theme_preference', theme)
      localStorage.setItem(
        'unicucumber_settings',
        JSON.stringify({
          version: 2,
          glyphPreviewMode: 'both',
          glyphLibraryDensity: 'comfortable',
        }),
      )
    },
    { items: glyphs, theme: themePreference },
  )
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
}

const seedIndexedDbGlyphs = async (page: Page, count: number) => {
  await seedGlyphs(page, 0)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  await page.evaluate(
    ({ items }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('unicucumber', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const transaction = request.result.transaction(
            ['glyphs', 'meta'],
            'readwrite',
          )
          const store = transaction.objectStore('glyphs')
          store.clear()
          for (const glyph of items) store.put(glyph)
          transaction.objectStore('meta').put({
            key: 'legacy-local-storage-v1',
            completedAt: Date.now(),
            migrated: 0,
            rejected: 0,
          })
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
        }
      }),
    { items: makeGlyphs(count) },
  )
}

const openLibrary = async (page: Page) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await expect(
    page.getByRole('button', { name: 'Expand glyph manager' }),
  ).toBeVisible()
}

const expandLibrary = async (page: Page, expectedCount = 96) => {
  await page.getByRole('button', { name: 'Expand glyph manager' }).click()
  await expect(
    page.getByRole('region', { name: 'Full-screen glyph library' }),
  ).toBeVisible()
  if (expectedCount <= 400) {
    await expect(page.locator('.glyph-library-cell')).toHaveCount(expectedCount)
  } else {
    await expect(page.locator('.glyph-library-grid')).toHaveAttribute(
      'data-total-count',
      String(expectedCount),
    )
    expect(await page.locator('.glyph-library-cell').count()).toBeLessThan(400)
  }
}

test.describe('full-screen glyph library', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlyphs(page)
  })

  test('preserves sidebar search, selection, editor data, and focus across expansion', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-row="0"][data-col="0"]').click()
    await expect(page.locator('[data-row="0"][data-col="0"]')).toHaveClass(
      /filled/,
    )
    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expect(
      page.getByRole('button', { name: 'Expand glyph manager' }),
    ).toBeVisible()
    const sidebarSearch = page.locator(
      '.glyph-manager > .toolbar .search-input',
    )
    await sidebarSearch.fill('0041')
    await expect(page.locator('.glyph-card')).toHaveCount(1)
    await page.locator('.glyph-list input[type="checkbox"]').last().check()

    await expandLibrary(page, 1)
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
    await expect(page.locator('.library-search input')).toHaveValue('0041')
    await expect(page.locator('.glyph-library-cell')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.locator('[data-row="0"][data-col="0"]')).toHaveClass(
      /filled/,
    )

    await page.getByRole('button', { name: 'Exit full-screen view' }).click()
    const expandButton = page.getByRole('button', {
      name: 'Expand glyph manager',
    })
    await expect(expandButton).toBeFocused()
    await expect(sidebarSearch).toHaveValue('0041')
    await expect(
      page.locator('.glyph-list input[type="checkbox"]').last(),
    ).toBeChecked()
    if ((page.viewportSize()?.width ?? 1280) < 720) {
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
    } else {
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    }
  })

  test('Escape exits selection, then full screen, then the manager', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    const selectionButton = page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select', exact: true })
    await selectionButton.click()
    await expect(selectionButton).toHaveAttribute('aria-pressed', 'true')

    await page.keyboard.press('Escape')
    await expect(selectionButton).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.sidebar')).toHaveClass(/glyph-library-expanded/)

    await page.keyboard.press('Escape')
    await expect(page.locator('.sidebar')).not.toHaveClass(
      /glyph-library-expanded/,
    )
    await expect(
      page.getByRole('button', { name: 'Expand glyph manager' }),
    ).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.locator('.sidebar')).not.toHaveClass(/active/)
  })

  test('keyboard navigation opens a glyph and restores the library context', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    const cells = page.locator('.glyph-library-cell')
    await cells.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(cells.nth(1)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.sidebar')).not.toHaveClass(
      /glyph-library-expanded/,
    )
    await expect(page.locator('.code-point-input input')).toHaveValue('0022')

    await page.getByRole('button', { name: 'Expand glyph manager' }).click()
    await expect(page.locator('.library-search input')).toHaveValue('')
    await expect(page.locator('.glyph-library-cell').nth(1)).toHaveClass(
      /is-active/,
    )
  })

  test('selection actions apply to filtered glyphs and use confirmation for deletion', async ({
    page,
  }, testInfo) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.locator('.library-search input').fill('0041')
    await expect(page.locator('.glyph-library-cell')).toHaveCount(1)
    await page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select', exact: true })
      .click()
    await page.getByRole('button', { name: 'Select filtered glyphs' }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({
        path: join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-glyph-library',
          '1280x720-selection-light.png',
        ),
        fullPage: false,
      })
    }
    await page.getByRole('button', { name: 'Delete selected' }).click()
    const confirmation = page.getByRole('dialog', { name: 'Confirm Delete' })
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: /Delete/i }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveCount(0)
    await expect(page.getByText('No matching glyphs')).toBeVisible()
  })

  test('add/import inspector and export menu are progressive and restore focus', async ({
    page,
  }, testInfo) => {
    await openLibrary(page)
    await expandLibrary(page)
    const addImport = page.getByRole('button', { name: 'Add / Import' })
    await addImport.click()
    await expect(page.locator('.glyph-manager-inspector')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Upload Hex File' }),
    ).toBeVisible()
    if (testInfo.project.name === 'chromium') {
      await page.waitForTimeout(200)
      await page.screenshot({
        path: join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-glyph-library',
          '1280x720-inspector-light.png',
        ),
        fullPage: false,
      })
    }
    await page
      .getByRole('button', { name: 'Close add and import panel' })
      .last()
      .click()
    await expect(addImport).toBeFocused()

    await page.locator('.library-export-menu summary').click()
    await expect(
      page.getByRole('button', { name: /Unifont glyphs/ }),
    ).toBeVisible()
  })

  test('density persists and search exposes the compact empty state', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page
      .locator('.density-control')
      .getByText('Compact', { exact: true })
      .click()
    await expect(page.locator('.glyph-library-scroll')).toHaveClass(
      /density-compact/,
    )
    await page.locator('.library-search input').fill('NOT-A-GLYPH')
    await expect(page.getByText('No matching glyphs')).toBeVisible()
    await page.getByRole('button', { name: 'Clear glyph search' }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveCount(96)

    const persistedDensity = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('unicucumber_settings') ?? '{}'),
    )
    expect(persistedDensity.glyphLibraryDensity).toBe('compact')
  })

  test('mobile add/import panel is full width, modal, and focus-safe', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'mobile inspector runs once',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await openLibrary(page)
    await expandLibrary(page)
    const addImport = page.getByRole('button', { name: 'Add / Import' })
    await addImport.click()

    const inspector = page.getByRole('dialog', { name: 'Add / Import' })
    await expect(inspector).toBeVisible()
    const bounds = await inspector.boundingBox()
    expect(bounds?.width).toBeCloseTo(390, 1)
    await expect(page.locator('.library-toolbar')).toHaveAttribute('inert', '')
    await expect(page.locator('.glyph-library-scroll')).toHaveAttribute(
      'inert',
      '',
    )
    await page.waitForTimeout(200)
    await page.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-glyph-library',
        '390x844-inspector-light.png',
      ),
      fullPage: false,
    })

    await page.keyboard.press('Escape')
    await expect(inspector).toBeHidden()
    await expect(addImport).toBeFocused()
  })
})

test('large synthetic library remains responsive while searching and scrolling', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'large collection profile runs once',
  )
  await seedIndexedDbGlyphs(page, 2500)
  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await expect(
    page.getByRole('button', { name: 'Expand glyph manager' }),
  ).toBeVisible()
  const started = Date.now()
  await expandLibrary(page, 2500)
  const renderDuration = Date.now() - started
  // Leave headroom for parallel browser workers while still catching a
  // regression that blocks expansion for a user-visible length of time.
  expect(renderDuration).toBeLessThan(20_000)

  const lastCodePoint = (0x21 + 2499)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')
  await page.locator('.glyph-library-cell').first().focus()
  await page.keyboard.press('End')
  await expect(
    page.locator(`.glyph-library-cell[data-code-point="${lastCodePoint}"]`),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    page.locator('.glyph-library-cell[data-index="0"]'),
  ).toBeFocused()

  const scroll = page.locator('.glyph-library-scroll')
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(page.locator('.glyph-library-cell').last()).toBeVisible()

  const searchStarted = Date.now()
  await page.locator('.library-search input').fill('0041')
  await expect(page.locator('.glyph-library-cell')).toHaveCount(1)
  expect(Date.now() - searchStarted).toBeLessThan(3_000)
})

const visualViewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

const themeCases = [
  { preference: 'light', system: 'dark', resolved: 'light' },
  { preference: 'dark', system: 'light', resolved: 'dark' },
  { preference: 'auto', system: 'dark', resolved: 'dark' },
] as const

for (const viewport of visualViewports) {
  for (const themeCase of themeCases) {
    test(`glyph-library visual ${viewport.width}x${viewport.height} ${themeCase.preference}`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'visual matrix runs once')
      const messages: string[] = []
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) {
          messages.push(`${message.type()}: ${message.text()}`)
        }
      })
      page.on('pageerror', (error) =>
        messages.push(`pageerror: ${error.message}`),
      )

      await seedGlyphs(page, 120, themeCase.preference)
      await page.setViewportSize(viewport)
      await page.emulateMedia({
        colorScheme: themeCase.system,
        reducedMotion: 'reduce',
      })
      await openLibrary(page)
      await expandLibrary(page, 120)

      const metrics = await page.evaluate(() => ({
        documentWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        viewportWidth: document.documentElement.clientWidth,
        theme: document.documentElement.dataset.theme,
        toolbarRight: document
          .querySelector('.library-toolbar')
          ?.getBoundingClientRect().right,
        gridRight: document
          .querySelector('.glyph-library-grid')
          ?.getBoundingClientRect().right,
      }))
      expect(metrics.theme).toBe(themeCase.resolved)
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
      expect(metrics.toolbarRight ?? Infinity).toBeLessThanOrEqual(
        metrics.viewportWidth + 1,
      )
      expect(metrics.gridRight ?? Infinity).toBeLessThanOrEqual(
        metrics.viewportWidth + 1,
      )
      expect(messages).toEqual([])

      const screenshotDir = join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-glyph-library',
      )
      await page.screenshot({
        path: join(
          screenshotDir,
          `${viewport.width}x${viewport.height}-${themeCase.preference}-${themeCase.system}.png`,
        ),
        fullPage: false,
      })
    })
  }
}
