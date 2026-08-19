import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type ThemePreference = 'auto' | 'light' | 'dark'
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

const seedGlyphs = async (
  page: Page,
  count = 96,
  themePreference: ThemePreference = 'auto',
) => {
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
    ({ items, theme }) => {
      localStorage.clear()
      localStorage.setItem('unicucumber_glyphs', JSON.stringify(items))
      localStorage.setItem('unicucumber_theme_preference', theme)
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
    { items: glyphs, theme: themePreference },
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
    page.getByRole('button', { name: 'Expand glyph manager' }),
  ).toBeVisible()
  await expect(page.locator('.glyph-manager')).toHaveAttribute(
    'data-glyph-count',
    String(expectedCount),
    { timeout: 15_000 },
  )
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

test('resizes the glyph manager freely and keeps its compact heading on one row', async ({
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

  const compactHeader = await page
    .locator('.glyph-manager-heading')
    .evaluate((header) => {
      const title = header.querySelector<HTMLElement>('.title')
      const actions = header.querySelector<HTMLElement>(
        '.glyph-manager-heading__actions',
      )
      const headerBox = header.getBoundingClientRect()
      const titleBox = title?.getBoundingClientRect()
      const actionsBox = actions?.getBoundingClientRect()
      if (!titleBox || !actionsBox)
        throw new Error('Glyph manager heading is incomplete')
      return {
        height: headerBox.height,
        titleCenter: titleBox.top + titleBox.height / 2,
        actionsCenter: actionsBox.top + actionsBox.height / 2,
        titleWhiteSpace: title ? getComputedStyle(title).whiteSpace : '',
        toolsLabelDisplay: getComputedStyle(
          header.querySelector('.compact-tools-toggle span')!,
        ).display,
      }
    })
  expect(compactHeader.titleWhiteSpace).toBe('nowrap')
  expect(compactHeader.toolsLabelDisplay).not.toBe('none')
  expect(compactHeader.height).toBeLessThan(50)
  expect(
    Math.abs(compactHeader.titleCenter - compactHeader.actionsCenter),
  ).toBeLessThanOrEqual(1)
})

test('keeps the tools action expanded on desktop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page)
  await page.setViewportSize({ width: 1024, height: 768 })
  await openLibrary(page)

  const toolsToggle = page.locator('.compact-tools-toggle')
  await expect(toolsToggle.locator('span')).toBeVisible()
  await expect(
    toolsToggle.locator('.compact-tools-toggle__indicator'),
  ).toBeVisible()
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#compact-glyph-tools')).toBeVisible()
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
  await expect(toolsToggle).toHaveAccessibleName('Tools')
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
  expect(toolsToggleWidth).toBeGreaterThan(expandButtonWidth)

  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'false')
  await toolsToggle.click()
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#compact-glyph-tools')).toBeVisible()
})

test('keeps the full-screen tools action explicit on mobile', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page)
  await page.setViewportSize({ width: 600, height: 800 })
  await openLibrary(page)
  await expandLibrary(page)

  const toolsToggle = page.locator('.library-tools-toggle')
  await expect(toolsToggle).toHaveAccessibleName('Tools')
  await expect(toolsToggle.locator('span')).toBeVisible()
  await expect(
    toolsToggle.locator('.library-tools-toggle__indicator'),
  ).toBeVisible()
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'false')
  await toolsToggle.click()
  await expect(toolsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#glyph-library-tools')).toBeVisible()
})

test('animates the transition into the full-screen glyph library', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page)
  await page.setViewportSize({ width: 1024, height: 768 })
  await openLibrary(page)
  await page.getByRole('button', { name: 'Expand glyph manager' }).click()

  await expect(
    page.getByRole('region', { name: 'Full-screen glyph library' }),
  ).toBeVisible()
  await expect(page.locator('.glyph-manager')).toHaveCSS(
    'animation-name',
    /^glyph-library-workspace-enter-/,
  )
})

test('keeps the active selection action legible in dark mode', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'interaction check runs once')
  await seedGlyphs(page, 96, 'dark')
  await openLibrary(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const sidebarPreview = page.locator('.glyph-card .glyph-preview').first()
  await expect(sidebarPreview).toHaveCSS('background-color', 'rgb(51, 51, 51)')
  await expect(sidebarPreview.locator('.bitmap-svg')).toHaveCSS(
    'fill',
    'rgb(224, 224, 224)',
  )

  await expandLibrary(page)

  const selectionToggle = page.locator('.library-selection-toggle')
  await selectionToggle.click()
  await expect(selectionToggle).toHaveClass(/is-active/)
  await expect(selectionToggle).toHaveCSS('color', 'rgb(224, 224, 224)')

  const bitmapPreview = page.locator('.bitmap-preview').first()
  await expect(bitmapPreview).toHaveCSS('background-color', 'rgb(51, 51, 51)')
  await expect(bitmapPreview).toHaveCSS('color', 'rgb(224, 224, 224)')
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
        page.getByRole('button', { name: 'Expand glyph manager' }),
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

  test('keeps the desktop filter toolbar within the viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 })
    await seedGlyphs(page)
    await openLibrary(page)
    await expandLibrary(page)
    const filterToggle = page.getByRole('button', {
      name: 'Filters',
      exact: true,
    })
    await filterToggle.click()
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true')

    const fitsViewport = await page
      .locator('.library-toolbar__main')
      .evaluate((toolbar) => toolbar.scrollWidth <= toolbar.clientWidth)
    expect(fitsViewport).toBe(true)

    const unicodeFiltersDoNotOverlap = await page
      .locator('.unicode-range-filters')
      .evaluate((container) => {
        const filters = Array.from(container.querySelectorAll('label'))
        const [plane, block] = filters.map((filter) =>
          filter.getBoundingClientRect(),
        )
        return Boolean(plane && block && plane.right <= block.left)
      })
    expect(unicodeFiltersDoNotOverlap).toBe(true)

    const filterLabelsAreAligned = await page
      .locator('.library-filters')
      .evaluate((container) => {
        const labels = [
          container.querySelector(':scope > label'),
          ...container.querySelectorAll('.unicode-range-filters label'),
        ].filter((label): label is HTMLLabelElement => label !== null)
        const positions = labels.map(
          (label) => label.getBoundingClientRect().top,
        )
        return Math.max(...positions) - Math.min(...positions) <= 1
      })
    expect(filterLabelsAreAligned).toBe(true)

    const toolbarControlsAreBottomAligned = await page
      .locator('.library-toolbar__main')
      .evaluate((toolbar) => {
        const controls = [
          toolbar.querySelector('.library-search'),
          ...toolbar.querySelectorAll(
            '.library-filters .custom-select__trigger',
          ),
          toolbar.querySelector('.library-tools-toggle'),
          toolbar.querySelector('.library-collapse'),
        ].filter((control): control is HTMLElement => control !== null)
        const bottoms = controls.map(
          (control) => control.getBoundingClientRect().bottom,
        )
        return Math.max(...bottoms) - Math.min(...bottoms) <= 1
      })
    expect(toolbarControlsAreBottomAligned).toBe(true)

    const wideFilterWidths = await page
      .locator('.library-filters')
      .evaluate((filters) => {
        const scope = filters.querySelector(':scope > label')
        const triggers = Array.from(
          filters.querySelectorAll('.custom-select__trigger'),
        )
        return {
          scope: scope?.getBoundingClientRect().width ?? 0,
          plane: triggers[1]?.getBoundingClientRect().width ?? 0,
          block: triggers[2]?.getBoundingClientRect().width ?? 0,
        }
      })
    expect(wideFilterWidths).toEqual({ scope: 192, plane: 304, block: 480 })

    await page.setViewportSize({ width: 1440, height: 900 })
    const searchMovesBelowDesktopControls = await page
      .locator('.library-toolbar__main')
      .evaluate((toolbar) => {
        const search = toolbar.querySelector('.library-search')
        const filters = toolbar.querySelector('.library-filters')
        return Boolean(
          search &&
          filters &&
          search.getBoundingClientRect().top >=
            filters.getBoundingClientRect().bottom,
        )
      })
    expect(searchMovesBelowDesktopControls).toBe(true)
    const fitsAtDesktopWidth = await page
      .locator('.library-toolbar__main')
      .evaluate((toolbar) => toolbar.scrollWidth <= toolbar.clientWidth)
    expect(fitsAtDesktopWidth).toBe(true)

    await page.setViewportSize({ width: 390, height: 844 })
    const mobileSectionsStack = await page
      .locator('.library-toolbar__main')
      .evaluate((toolbar) => {
        const identity = toolbar.querySelector('.library-identity')
        const actions = toolbar.querySelector('.library-toolbar__buttons')
        const search = toolbar.querySelector('.library-search')
        const filters = toolbar.querySelector('.library-filters')
        return Boolean(
          identity &&
          actions &&
          search &&
          filters &&
          search.getBoundingClientRect().top >=
            Math.max(
              identity.getBoundingClientRect().bottom,
              actions.getBoundingClientRect().bottom,
            ) &&
          filters.getBoundingClientRect().top >=
            search.getBoundingClientRect().bottom,
        )
      })
    expect(mobileSectionsStack).toBe(true)
  })

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
      page.getByRole('button', { name: 'Expand glyph manager' }),
    ).toBeFocused()

    await page.keyboard.press('Escape')
    if (await page.locator('.sidebar.active').count()) {
      await expect(
        page
          .locator('.glyph-manager-heading')
          .getByRole('button', { name: 'Tools' }),
      ).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('Escape')
    }
    await expect(page.locator('.sidebar.active')).toHaveCount(0)
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

  test('selection actions remove saved copies without removing Unifont glyphs', async ({
    page,
  }, testInfo) => {
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
    await page.getByRole('button', { name: /Remove from manager/ }).click()
    const confirmation = page.getByRole('dialog', { name: 'Confirm Delete' })
    await expect(confirmation).toBeVisible()
    await expect(confirmation).toHaveClass(/dialog-box--danger/)
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({
        path: join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-glyph-library',
          'dialog-danger-light.png',
        ),
        fullPage: false,
      })
    }
    await confirmation.getByRole('button', { name: /Delete/i }).click()
    await expect(page.locator('.glyph-library-cell')).toHaveCount(1)
    await expect(page.locator('.glyph-library-cell')).toHaveAttribute(
      'data-code-point',
      '0041',
    )
  })

  test('library tools keep export and manager actions separate', async ({
    page,
  }, testInfo) => {
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
    await page.getByRole('combobox', { name: 'Pixel scale' }).click()
    await expect(page.getByRole('option', { name: '4×' })).toBeVisible()
    await page.getByRole('option', { name: '4×' }).click()
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({
        path: join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-glyph-library',
          '1280x720-export-menu-light.png',
        ),
        fullPage: false,
      })
    }
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
    if (testInfo.project.name === 'chromium') {
      await page.waitForTimeout(200)
      await page.screenshot({
        path: join(
          process.env.TEMP ?? testInfo.outputDir,
          'unicucumber-glyph-library',
          '1280x720-library-tools-light.png',
        ),
        fullPage: false,
      })
    }
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

  test('mobile library selection controls remain within the viewport', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'mobile inspector runs once',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await openLibrary(page)
    await expandLibrary(page)
    await page.getByRole('button', { name: 'Tools' }).click()
    await page
      .locator('.library-toolbar')
      .getByRole('button', { name: 'Select to add', exact: true })
      .click()
    await page.getByRole('button', { name: 'Select filtered glyphs' }).click()
    await expect(
      page.getByRole('button', { name: /Add to glyph manager/ }),
    ).toBeDisabled()
    await page.waitForTimeout(200)
    await page.screenshot({
      path: join(
        process.env.TEMP ?? testInfo.outputDir,
        'unicucumber-glyph-library',
        '390x844-selection-light.png',
      ),
      fullPage: false,
    })
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
  await page.getByRole('button', { name: 'Expand glyph manager' }).click()

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
  await page.waitForTimeout(350)
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

const visualViewports = [
  { width: 390, height: 844 },
  { width: 640, height: 800 },
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
      await openLibrary(page, 120)
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
        identityScrollWidth:
          document.querySelector<HTMLElement>('.library-identity')?.scrollWidth,
        identityClientWidth:
          document.querySelector<HTMLElement>('.library-identity')?.clientWidth,
        gridRight: document
          .querySelector('.glyph-library-grid')
          ?.getBoundingClientRect().right,
      }))
      expect(metrics.theme).toBe(themeCase.resolved)
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
      expect(metrics.toolbarRight ?? Infinity).toBeLessThanOrEqual(
        metrics.viewportWidth + 1,
      )
      expect(metrics.identityScrollWidth ?? 0).toBeLessThanOrEqual(
        metrics.identityClientWidth ?? 0,
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
