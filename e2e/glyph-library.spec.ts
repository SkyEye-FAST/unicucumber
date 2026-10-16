import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

const UNIFONT_TEST_VERSION = (
  JSON.parse(
    readFileSync(
      new URL('../public/unifont/index.json', import.meta.url),
      'utf-8',
    ),
  ) as { version: string }
).version

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

const seedGlyphs = async (page: Page, count = 96) => {
  const glyphs = makeGlyphs(count)
  const ranges: Array<[number, number]> = []
  for (const codePoint of glyphs
    .map((glyph) => Number.parseInt(glyph.codePoint, 16))
    .sort((left, right) => left - right)) {
    const range = ranges[ranges.length - 1]
    if (range && codePoint === range[1] + 1) range[1] = codePoint
    else ranges.push([codePoint, codePoint])
  }
  await page.addInitScript(
    ({ items }) => {
      localStorage.clear()
      localStorage.setItem('unicucumber_glyphs', JSON.stringify(items))
      localStorage.setItem('unicucumber_theme_preference', 'auto')
      localStorage.setItem(
        'unicucumber_settings',
        JSON.stringify({
          version: 1,
          baseline: '2026-07-settings-reset',
          glyphPreviewMode: 'both',
          glyphLibraryDensity: 'comfortable',
        }),
      )
    },
    { items: glyphs },
  )
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.route('**/unifont/catalog.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ version: UNIFONT_TEST_VERSION, ranges }),
    }),
  )
  await page.route(/\/unifont\/[0-9A-Fa-f]{3}\.json$/, (route) => {
    const chunkId = route
      .request()
      .url()
      .match(/\/([0-9A-Fa-f]{3})\.json$/)?.[1]
    const chunkStart = Number.parseInt(chunkId ?? '', 16) * 0x1000
    const chunkEnd = chunkStart + 0xfff
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        Object.fromEntries(
          glyphs
            .filter((glyph) => {
              const codePoint = Number.parseInt(glyph.codePoint, 16)
              return codePoint >= chunkStart && codePoint <= chunkEnd
            })
            .map((glyph) => [
              String(Number.parseInt(glyph.codePoint, 16)),
              glyph.hexValue,
            ]),
        ),
      ),
    })
  })
}

test('editor glyph navigation searches blocks and switches glyphs @phone @tablet', async ({
  page,
}) => {
  await seedGlyphs(page, 160)
  await page.goto('/')
  const navigator = page.getByRole('navigation', { name: 'Browse glyphs' })
  await expect(navigator.locator('[data-code-point]')).toHaveCount(32)
  await navigator.locator('[data-code-point="0021"]').click()
  await expect(page.locator('.code-point-input input')).toHaveValue('0021')
  await navigator.getByRole('combobox', { name: 'Unicode block' }).click()
  await page.getByRole('searchbox', { name: 'Unicode block' }).fill('Latin-1')
  await page
    .getByRole('option', { name: 'Latin-1 Supplement', exact: true })
    .click()
  await navigator.locator('[data-code-point="0080"]').click()
  await expect(page.locator('.code-point-input input')).toHaveValue('0080')
  await expect(navigator.locator('[aria-current="true"]')).toHaveAttribute(
    'data-code-point',
    '0080',
  )
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.locator('body').evaluate((body) => body.clientWidth),
  )
  await page.locator('#hexInput').fill('FF'.repeat(16))
  await page.locator('#hexInput').press('Enter')
  await navigator.locator('[data-code-point="0081"]').click()
  const confirmation = page.getByRole('dialog', { name: 'Unsaved Changes' })
  await expect(confirmation).toBeVisible()
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  await expect(page.locator('.code-point-input input')).toHaveValue('0080')
  await expect(page.locator('#hexInput')).toHaveValue('FF'.repeat(16))
})

test('desktop glyph navigation scrolls with a mouse wheel and releases page scrolling at the edge @cross-browser', async ({
  page,
}) => {
  await seedGlyphs(page, 160)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const navigator = page.getByRole('navigation', { name: 'Browse glyphs' })
  const strip = navigator.locator('.glyph-navigator__strip')
  await expect(strip).toHaveAttribute('aria-busy', 'false')
  // Short desktop viewports scroll vertically to preserve the canvas size.
  await navigator.scrollIntoViewIfNeeded()
  await expect(navigator).toBeInViewport({ ratio: 1 })
  const moveMouseToStrip = async () => {
    const bounds = await strip.boundingBox()
    if (!bounds) throw new Error('Glyph strip is not measurable')
    await page.mouse.move(bounds.x + 80, bounds.y + 30)
  }
  await moveMouseToStrip()
  const initialPageScroll = await page.evaluate(() => window.scrollY)
  const nextGlyph = navigator.locator('[data-code-point="002D"]')
  await expect(nextGlyph).not.toBeInViewport()
  await page.mouse.wheel(0, 360)
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScroll)
  await expect(nextGlyph).toBeInViewport({ ratio: 1 })
  const glyphBounds = await nextGlyph.boundingBox()
  if (!glyphBounds) throw new Error('Scrolled glyph is not measurable')
  await page.mouse.click(
    glyphBounds.x + glyphBounds.width / 2,
    glyphBounds.y + glyphBounds.height / 2,
  )
  await expect(page.locator('.code-point-input input')).toHaveValue('002D')
  await navigator.getByRole('scrollbar').focus()
  await page.keyboard.press('End')
  await moveMouseToStrip()
  const edgePageScroll = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 200)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(edgePageScroll)
})

test('desktop glyph scrollbar supports dragging and keyboard navigation @cross-browser', async ({
  page,
}) => {
  await seedGlyphs(page, 160)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const navigator = page.getByRole('navigation', { name: 'Browse glyphs' })
  const strip = navigator.locator('.glyph-navigator__strip')
  const scrollbar = navigator.getByRole('scrollbar')
  await expect(strip).toHaveAttribute('aria-busy', 'false')
  await expect(scrollbar).toBeVisible()
  await scrollbar.focus()
  await page.keyboard.press('End')
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(500)
  await page.keyboard.press('Home')
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBe(0)
  const thumb = await scrollbar
    .locator('.horizontal-scrollbar__thumb')
    .boundingBox()
  if (!thumb) throw new Error('Scrollbar thumb is not measurable')
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    thumb.x + thumb.width / 2 + 120,
    thumb.y + thumb.height / 2,
    { steps: 5 },
  )
  await page.mouse.up()
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)
})

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
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
}

const openLibrary = async (page: Page, expectedCount = 96) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await expect(
    page.getByRole('button', { name: 'Open glyph library' }),
  ).toBeVisible()
  await expect(page.locator('.glyph-manager')).toHaveAttribute(
    'data-glyph-count',
    String(expectedCount),
    { timeout: 15_000 },
  )
}

const expandLibrary = async (page: Page, expectedCount = 96) => {
  await page.getByRole('button', { name: 'Open glyph library' }).click()
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

test('resizes the glyph manager wider and narrower', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page)
  await page.setViewportSize({ width: 1024, height: 768 })
  await openLibrary(page)

  const sidebar = page.locator('.sidebar')
  const resizer = page.locator('.sidebar-resizer')
  const initialWidth = await sidebar.evaluate((element) =>
    Math.round(element.getBoundingClientRect().width),
  )
  const resizerBox = await resizer.boundingBox()
  if (!resizerBox) throw new Error('Glyph manager resize handle is not visible')
  await resizer.hover({
    position: { x: resizerBox.width / 2, y: 160 },
  })
  await page.mouse.down()
  await page.mouse.move(930, resizerBox.y + 160, { steps: 5 })
  await page.mouse.up()

  const expectedMaximumWidth = await page.evaluate(
    () => window.innerWidth - 320,
  )
  await expect
    .poll(() =>
      sidebar.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    )
    .toBeGreaterThanOrEqual(expectedMaximumWidth)

  const expandedResizerBox = await resizer.boundingBox()
  if (!expandedResizerBox)
    throw new Error('Glyph manager resize handle is not visible after widening')
  await resizer.hover({
    position: { x: expandedResizerBox.width / 2, y: 160 },
  })
  await page.mouse.down()
  await page.mouse.move(300, expandedResizerBox.y + 160, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(() =>
      sidebar.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    )
    .toBeLessThan(initialWidth)
})

test('keeps the tools action explicit in the mobile glyph manager', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page)
  await page.setViewportSize({ width: 600, height: 800 })
  await openLibrary(page)

  const toolsToggle = page.locator('.compact-tools-toggle')
  const expandButton = page.locator('.glyph-manager-expand')
  await expect(toolsToggle).toHaveAccessibleName('Add and import')
  await expect(toolsToggle.locator('span')).toBeVisible()
  await expect(
    toolsToggle.locator('.compact-tools-toggle__indicator'),
  ).toBeVisible()
  const toolsToggleWidth = await toolsToggle.evaluate(
    (button) => button.getBoundingClientRect().width,
  )
  const expandButtonWidth = await expandButton.evaluate(
    (button) => button.getBoundingClientRect().width,
  )
  expect(expandButtonWidth).toBeGreaterThan(toolsToggleWidth)
  await expect(expandButton.locator('strong')).toHaveText('Open glyph library')
  await expect(page.locator('#glyph-library-entry-description')).toBeVisible()

  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'false')
  await toolsToggle.click()
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#compact-glyph-tools')).toBeVisible()
  const panelTop = await page
    .locator('#compact-glyph-tools')
    .evaluate((element) => element.getBoundingClientRect().top)
  const toggleBottom = await toolsToggle.evaluate(
    (element) => element.getBoundingClientRect().bottom,
  )
  expect(Math.abs(panelTop - toggleBottom)).toBeLessThanOrEqual(1)
  await page.locator('#compact-glyph-tools .codepoint-input').fill('0041')
  await toolsToggle.click()
  await toolsToggle.click()
  await expect(
    page.locator('#compact-glyph-tools .codepoint-input'),
  ).toHaveValue('0041')
})

test.describe('full-screen glyph library', () => {
  test.beforeEach(async ({ page }) => {
    await seedGlyphs(page)
  })

  test(
    'preserves sidebar search, selection, editor data, and focus across expansion',
    {
      tag: ['@cross-browser', '@phone', '@tablet'],
    },
    async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.locator('[data-row="0"][data-col="0"]').click()
      await expect(page.locator('[data-row="0"][data-col="0"]')).toHaveClass(
        /filled/,
      )
      await page.getByRole('button', { name: 'Open glyph manager' }).click()
      await expect(
        page.getByRole('button', { name: 'Open glyph library' }),
      ).toBeVisible()
      await expect(page.locator('.glyph-manager')).toHaveAttribute(
        'data-glyph-count',
        '96',
      )
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

      await page.getByRole('button', { name: 'Back to glyph manager' }).click()
      const expandButton = page.getByRole('button', {
        name: 'Open glyph library',
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
    },
  )

  test('provides a persistent draggable scrollbar for the full-screen library', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'scrollbar interaction runs once',
    )
    await openLibrary(page)
    await expandLibrary(page)

    const scrollContainer = page.locator('.glyph-library-scroll')
    const scrollbar = page.getByRole('scrollbar', {
      name: 'Scroll glyph library',
    })
    await expect(scrollbar).toBeVisible()
    const thumb = scrollbar.locator('.glyph-library-scrollbar-thumb')
    // Coordinate-based dragging needs the expanding library to stop moving.
    await thumb.click({ trial: true })
    const thumbBox = await thumb.boundingBox()
    const trackBox = await scrollbar.boundingBox()
    if (!thumbBox || !trackBox)
      throw new Error('Glyph library scrollbar is not measurable')

    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      trackBox.y + trackBox.height * 0.75,
      { steps: 8 },
    )
    await page.mouse.up()

    await expect
      .poll(() =>
        scrollContainer.evaluate((element) => Math.round(element.scrollTop)),
      )
      .toBeGreaterThan(0)
  })

  test('filters Unicode blocks through the searchable custom range selectors', async ({
    page,
  }) => {
    await seedGlyphs(page)
    await openLibrary(page)
    await expandLibrary(page)
    await expect(page.locator('select')).toHaveCount(0)
    const filterToggle = page.getByRole('button', {
      name: 'Filters',
      exact: true,
    })
    await filterToggle.click()
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true')

    await page.getByRole('combobox', { name: 'Unicode plane' }).click()
    await page
      .getByRole('option', { name: /Plane 0.*Basic Multilingual Plane/ })
      .click()

    const blockSelect = page.getByRole('combobox', { name: 'Unicode block' })
    await expect(blockSelect).toBeEnabled()
    await blockSelect.click()
    await page
      .getByRole('searchbox', { name: 'Unicode block' })
      .fill('Basic Latin')
    await page.getByRole('option', { name: /Basic Latin/ }).click()

    await expect(page.locator('.glyph-library-cell')).toHaveCount(95)
  })

  test(
    'opens Unicode block search in a narrow-screen modal',
    {
      tag: '@phone',
    },
    async ({ page }, testInfo) => {
      test.skip(
        !testInfo.project.name.includes('phone'),
        'narrow-screen selector behavior runs on the phone viewport',
      )
      await seedGlyphs(page)
      await openLibrary(page)
      await expandLibrary(page)
      await page.getByRole('button', { name: 'Filters' }).click()

      await page.getByRole('combobox', { name: 'Unicode plane' }).click()
      await page
        .getByRole('option', { name: /Plane 0.*Basic Multilingual Plane/ })
        .click()
      await page.getByRole('combobox', { name: 'Unicode block' }).click()

      const modal = page.getByRole('dialog', { name: 'Unicode block' })
      await expect(modal).toBeVisible()
      await expect(modal).toHaveCSS('position', 'fixed')
      await page.setViewportSize({
        width: page.viewportSize()?.width ?? 393,
        height: 420,
      })
      await expect
        .poll(() =>
          modal.evaluate((element) => {
            const bounds = element.getBoundingClientRect()
            const viewport = window.visualViewport
            const viewportTop = viewport?.offsetTop ?? 0
            const viewportBottom =
              viewportTop + (viewport?.height ?? window.innerHeight)
            return (
              bounds.top >= viewportTop - 1 &&
              bounds.bottom <= viewportBottom + 1
            )
          }),
        )
        .toBe(true)
      await modal
        .getByRole('searchbox', { name: 'Unicode block' })
        .fill('Basic Latin')
      await modal.getByRole('option', { name: /Basic Latin/ }).click()
      await expect(modal).toBeHidden()
      await expect(page.locator('.glyph-library-cell')).toHaveCount(95)
    },
  )

  test('Escape exits nested glyph manager states in order', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Tools' }).click()
    const selectionButton = page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select to add', exact: true })
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
      page.getByRole('button', { name: 'Open glyph library' }),
    ).toBeFocused()

    await page.keyboard.press('Escape')
    if (await page.locator('.sidebar.active').count()) {
      await expect(
        page.getByRole('button', { name: 'Add and import' }),
      ).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
  })

  test('preserves filters after choosing a glyph and honors the setting', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('combobox', { name: 'Unicode plane' }).click()
    await page
      .getByRole('option', { name: /Plane 0.*Basic Multilingual Plane/ })
      .click()
    await page.getByRole('combobox', { name: 'Unicode block' }).click()
    await page
      .getByRole('searchbox', { name: 'Unicode block' })
      .fill('Basic Latin')
    await page.getByRole('option', { name: /Basic Latin/ }).click()
    await page.locator('.library-search input').fill('0022')

    const filteredCell = page.locator('.glyph-library-cell')
    await expect(filteredCell).toHaveCount(1)
    await filteredCell.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.sidebar')).not.toHaveClass(
      /glyph-library-expanded/,
    )
    await expect(page.locator('.code-point-input input')).toHaveValue('0022')

    await page.locator('.btn-close-sidebar').click()
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expandLibrary(page, 1)
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await expect(page.locator('.library-search input')).toHaveValue('0022')
    await expect(
      page.getByRole('combobox', { name: 'Unicode plane' }),
    ).toContainText('Plane 0')
    await expect(
      page.getByRole('combobox', { name: 'Unicode block' }),
    ).toContainText('Basic Latin')

    await page.getByRole('button', { name: 'Back to glyph manager' }).click()
    await page.locator('.btn-close-sidebar').click()
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open settings' }).click()
    const settingsDrawer = page.getByRole('dialog', { name: 'Settings' })
    const preserveFilters = settingsDrawer.getByRole('switch', {
      name: 'Keep filters after choosing a glyph',
    })
    await expect(preserveFilters).toBeChecked()
    await preserveFilters.uncheck()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const stored = localStorage.getItem('unicucumber_settings')
          return stored === null
            ? null
            : JSON.parse(stored).preserveGlyphLibraryFilters
        }),
      )
      .toBe(false)
    await settingsDrawer.getByRole('button', { name: 'Close settings' }).click()

    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expandLibrary(page, 1)
    await page.locator('.glyph-library-cell').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.sidebar')).not.toHaveClass(
      /glyph-library-expanded/,
    )

    await page.locator('.btn-close-sidebar').click()
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await expect(page.locator('.library-search input')).toHaveValue('')
    await expect(
      page.getByRole('combobox', { name: 'Unicode plane' }),
    ).toContainText('Choose a plane')
    await expect(
      page.getByRole('combobox', { name: 'Unicode block' }),
    ).toBeDisabled()
    await expect(
      page.locator('.glyph-library-cell[data-code-point="0022"]'),
    ).toHaveClass(/is-active/)
  })

  test('selection actions remove saved copies without removing Unifont glyphs', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.locator('.library-search input').fill('0041')
    await expect(page.locator('.glyph-library-cell')).toHaveCount(1)
    await page.getByRole('button', { name: 'Tools' }).click()
    await page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select to add', exact: true })
      .click()
    await page.getByRole('button', { name: 'Select filtered glyphs' }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('button', { name: /Remove from manager/ }).click()
    const confirmation = page.getByRole('dialog', { name: 'Confirm Delete' })
    await expect(confirmation).toBeVisible()
    await expect(confirmation).toHaveClass(/dialog-box--danger/)
    await confirmation.getByRole('button', { name: /Delete/i }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveCount(1)
    await expect(page.locator('.glyph-library-cell')).toHaveAttribute(
      'data-code-point',
      '0041',
    )
  })

  test('library tools keep export and manager actions separate', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Tools' }).click()
    await expect(page.locator('.glyph-manager-inspector')).toBeHidden()
    await page.getByRole('button', { name: 'Export Glyphs' }).click()
    await expect(
      page.getByRole('button', { name: /Unifont glyphs/ }),
    ).toBeVisible()
    await expect(page.getByText('Font files', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Official main font', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /OpenType font/ }),
    ).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Pixel scale', exact: true })
      .click()
    await expect(page.getByRole('option', { name: '4×' })).toBeVisible()
    await page.getByRole('option', { name: '4×' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Web Open Font 2/ }).click()
    expect((await downloadPromise).suggestedFilename()).toBe(
      `Unifont-${UNIFONT_TEST_VERSION}.woff2`,
    )

    await page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select to add', exact: true })
      .click()
    await page.getByRole('button', { name: 'Select filtered glyphs' }).click()
    await expect(
      page.getByRole('button', { name: /Add to glyph manager/ }),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Export Glyphs' }).click()
    await page
      .getByRole('button', { name: /Web Open Font 2/ })
      .click({ trial: true })
    await page.getByRole('button', { name: 'Export Glyphs' }).click()
  })

  test('density persists and search exposes the compact empty state', async ({
    page,
  }) => {
    await openLibrary(page)
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Tools' }).click()
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
    page.getByRole('button', { name: 'Open glyph library' }),
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

test('real Unifont catalog stays responsive during code-point search', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'full catalog search regression runs once',
  )
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await page.getByRole('button', { name: 'Open glyph library' }).click()

  const grid = page.locator('.glyph-library-grid')
  await expect
    .poll(
      async () => Number((await grid.getAttribute('data-total-count')) ?? 0),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(100_000)

  const searchStarted = Date.now()
  await page.locator('.library-search input').fill('0041')
  await expect
    .poll(async () => {
      const count = Number((await grid.getAttribute('data-total-count')) ?? 0)
      return count > 0 && count < 100
    })
    .toBe(true)
  expect(Date.now() - searchStarted).toBeLessThan(3_000)
})

test('compact manager preloads once, windows rows, and preserves state on reopen', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'shared preload integration runs once',
  )
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g' },
    })
    const originalGetAll = IDBObjectStore.prototype.getAll
    Object.defineProperty(window, '__glyphIdbReads', {
      configurable: true,
      writable: true,
      value: 0,
    })
    IDBObjectStore.prototype.getAll = function (...args) {
      ;(
        window as typeof window & { __glyphIdbReads: number }
      ).__glyphIdbReads += 1
      return originalGetAll.apply(this, args)
    }
  })
  const unifontChunks: string[] = []
  page.on('request', (request) => {
    if (/\/unifont\/[0-9A-F]{3}\.json/.test(request.url())) {
      unifontChunks.push(request.url())
    }
  })

  await seedIndexedDbGlyphs(page, 1_000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __glyphIdbReads: number })
            .__glyphIdbReads,
      ),
    )
    .toBe(1)

  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await expect(page.locator('.glyph-manager-heading')).toBeVisible()
  await expect(page.locator('.glyph-manager')).toHaveAttribute(
    'data-glyph-count',
    '1000',
  )
  expect(await page.locator('.glyph-card').count()).toBeLessThan(40)
  await page.locator('.glyph-manager > .toolbar .search-input').fill('0041')
  await expect(page.locator('.glyph-card')).toHaveCount(1)

  const readsBeforeReopen = await page.evaluate(
    () =>
      (window as typeof window & { __glyphIdbReads: number }).__glyphIdbReads,
  )
  await page.locator('.btn-close-sidebar').click()
  await expect(page.locator('.sidebar')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open glyph manager' }).click()
  await expect(
    page.locator('.glyph-manager > .toolbar .search-input'),
  ).toHaveValue('0041')
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __glyphIdbReads: number }).__glyphIdbReads,
    ),
  ).toBe(readsBeforeReopen)
  expect(unifontChunks).toEqual([])
})
