import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

type ColorScheme = 'light' | 'dark'

const { version: packageVersion } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }
const escapedPackageVersion = packageVersion.replace(
  /[.*+?^${}()|[\]\\]/g,
  '\\$&',
)

const loadEditor = async (
  page: Page,
  colorScheme: ColorScheme = 'light',
  storage: Record<string, string> = {},
) => {
  await page.emulateMedia({ colorScheme })
  await page.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem('unicucumber-e2e-initialized')) return
    localStorage.clear()
    for (const [key, value] of entries) localStorage.setItem(key, value)
    sessionStorage.setItem('unicucumber-e2e-initialized', 'true')
  }, Object.entries(storage))
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
}

const openSettings = async (page: Page) => {
  const trigger = page.getByRole('button', { name: 'Open settings' })
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Settings' })
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('transform', 'none')
  return { trigger, drawer }
}

test('Auto follows live system changes while manual themes remain stable', async ({
  page,
}) => {
  await loadEditor(page, 'light')
  const { drawer } = await openSettings(page)
  const auto = drawer.getByRole('radio', { name: 'Auto' })
  const light = drawer.getByRole('radio', { name: 'Light' })
  const dark = drawer.getByRole('radio', { name: 'Dark' })

  await expect(auto).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(auto).toBeChecked()

  await light.check()
  await expect(light).toBeChecked()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await dark.check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await auto.check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(auto).toBeChecked()
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('unicucumber_theme_preference')),
    )
    .toBe('auto')
})

test('header appearance toggle cycles through all preferences and syncs with settings', async ({
  page,
}) => {
  await loadEditor(page, 'light')
  const headerActions = page.locator('.editor-header .modal-buttons > *')
  const title = page.locator('.title')
  const transitionProperties = await title.evaluate((element) =>
    getComputedStyle(element)
      .transitionProperty.split(',')
      .map((value) => value.trim()),
  )
  expect(transitionProperties).toContain('background-color')
  expect(transitionProperties).not.toContain('color')
  await expect(headerActions).toHaveCount(6)
  expect(
    await headerActions.evaluateAll((actions) =>
      actions.map((action) => action.getAttribute('aria-label')),
    ),
  ).toEqual([
    'Toggle color theme',
    'Open glyph manager',
    'Open glyph composition',
    'Open text preview',
    'Open settings',
    'Open the UniCucumber repository on GitHub',
  ])

  const themeToggle = page.getByRole('button', { name: 'Toggle color theme' })
  const usesCompactHeader = (page.viewportSize()?.width ?? 1280) < 480
  const compactSettings = usesCompactHeader
    ? await openSettings(page)
    : undefined

  if (compactSettings) {
    await expect(themeToggle).toBeHidden()
    await compactSettings.drawer.getByRole('radio', { name: 'Light' }).check()
  } else {
    await themeToggle.click()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('unicucumber_theme_preference')),
    )
    .toBe('light')

  const lightTitleColor = await title.evaluate(
    (element) => getComputedStyle(element).color,
  )
  if (compactSettings) {
    await compactSettings.drawer.getByRole('radio', { name: 'Dark' }).check()
  } else {
    await themeToggle.click()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(title).not.toHaveCSS('color', lightTitleColor)
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('unicucumber_theme_preference')),
    )
    .toBe('dark')

  if (compactSettings) {
    await compactSettings.drawer.getByRole('radio', { name: 'Auto' }).check()
  } else {
    await themeToggle.click()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('unicucumber_theme_preference')),
    )
    .toBe('auto')

  const { drawer } = compactSettings ?? (await openSettings(page))
  await expect(drawer.getByRole('radio', { name: 'Auto' })).toBeChecked()
})

test(
  'appearance preference persists across reloads',
  {
    tag: '@cross-browser',
  },
  async ({ page }) => {
    await loadEditor(page, 'light')
    let settings = await openSettings(page)
    await settings.drawer.getByRole('radio', { name: 'Dark' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.grid-container')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    settings = await openSettings(page)
    await expect(
      settings.drawer.getByRole('radio', { name: 'Dark' }),
    ).toBeChecked()
  },
)

test(
  'glyph colors are theme-specific, persistent, and restorable',
  {
    tag: '@cross-browser',
  },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await loadEditor(page, 'light')
    const filledCell = page.locator('[data-row="0"][data-col="0"]')
    const emptyCell = page.locator('[data-row="0"][data-col="1"]')
    await filledCell.click()

    let settings = await openSettings(page)
    const colorInput = (id: string) => settings.drawer.locator(`#${id}`)
    const setColor = async (id: string, value: string): Promise<void> => {
      const input = colorInput(id)
      await input.evaluate((element, color) => {
        const colorInput = element as HTMLInputElement
        colorInput.value = color
        colorInput.dispatchEvent(new Event('input', { bubbles: true }))
      }, value)
      await expect(input).toHaveValue(value)
    }

    await setColor('lightGlyphForegroundColor', '#123456')
    await setColor('lightGlyphBackgroundColor', '#abcdef')
    await expect(filledCell).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await expect(emptyCell).toHaveCSS('background-color', 'rgb(171, 205, 239)')

    await settings.drawer.getByRole('radio', { name: 'Dark' }).check()
    await setColor('darkGlyphForegroundColor', '#fedcba')
    await setColor('darkGlyphBackgroundColor', '#102030')
    await expect(filledCell).toHaveCSS('background-color', 'rgb(254, 220, 186)')
    await expect(emptyCell).toHaveCSS('background-color', 'rgb(16, 32, 48)')

    await expect
      .poll(() =>
        page.evaluate(() => {
          const stored = localStorage.getItem('unicucumber_settings')
          return stored === null ? null : JSON.parse(stored)
        }),
      )
      .toMatchObject({
        lightGlyphForegroundColor: '#123456',
        lightGlyphBackgroundColor: '#abcdef',
        darkGlyphForegroundColor: '#fedcba',
        darkGlyphBackgroundColor: '#102030',
      })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('.grid-container')).toBeVisible()
    settings = await openSettings(page)
    await expect(colorInput('lightGlyphForegroundColor')).toHaveValue('#123456')
    await expect(colorInput('lightGlyphBackgroundColor')).toHaveValue('#abcdef')
    await expect(colorInput('darkGlyphForegroundColor')).toHaveValue('#fedcba')
    await expect(colorInput('darkGlyphBackgroundColor')).toHaveValue('#102030')

    await settings.drawer
      .getByRole('button', { name: 'Restore default colors' })
      .click()
    await expect(colorInput('darkGlyphForegroundColor')).toHaveValue('#e0e0e0')
    await expect(colorInput('darkGlyphBackgroundColor')).toHaveValue('#333333')

    const resetEmptyCell = page.locator('[data-row="0"][data-col="2"]')
    await expect(resetEmptyCell).toHaveCSS(
      'background-color',
      'rgb(51, 51, 51)',
    )
    await resetEmptyCell.click()
    await expect(resetEmptyCell).toHaveCSS(
      'background-color',
      'rgb(224, 224, 224)',
    )

    await settings.drawer.getByRole('radio', { name: 'Light' }).check()
    await expect(colorInput('lightGlyphForegroundColor')).toHaveValue('#333333')
    await expect(colorInput('lightGlyphBackgroundColor')).toHaveValue('#f8f9fa')
  },
)

test('local preview font is prepended to the fallback stack and persists', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class LocalFontFaceMock {
      constructor(
        readonly family: string,
        readonly source: string | BufferSource,
      ) {}

      async load(): Promise<LocalFontFaceMock> {
        return this
      }
    }

    Object.defineProperty(window, 'FontFace', {
      configurable: true,
      value: LocalFontFaceMock,
    })
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add: () => undefined,
        delete: () => true,
      },
    })
  })
  await loadEditor(page)
  let settings = await openSettings(page)
  const fontInput = settings.drawer.locator(
    'input[type="file"][accept*=".ttf"]',
  )
  await fontInput.setInputFiles({
    name: 'priority-preview.ttf',
    mimeType: 'font/ttf',
    buffer: Buffer.from([0, 1, 2, 3]),
  })
  await expect(
    settings.drawer.getByText('Local font: priority-preview.ttf'),
  ).toBeVisible()

  const previewFont = await page
    .locator('.unicode-char')
    .evaluate((element) => (element as HTMLElement).style.fontFamily)
  expect(previewFont).toMatch(/^"?UniCucumber Local Preview"?,/)
  expect(previewFont).toContain('Noto Sans')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  settings = await openSettings(page)
  await expect(
    settings.drawer.getByText('Local font: priority-preview.ttf'),
  ).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('.unicode-char')
        .evaluate((element) => (element as HTMLElement).style.fontFamily),
    )
    .toMatch(/^"?UniCucumber Local Preview"?,/)

  await settings.drawer.getByRole('button', { name: 'Remove' }).click()
  await expect(
    settings.drawer.getByText('Local font: priority-preview.ttf'),
  ).toBeHidden()
  await expect
    .poll(() =>
      page
        .locator('.unicode-char')
        .evaluate((element) => (element as HTMLElement).style.fontFamily),
    )
    .not.toContain('UniCucumber Local Preview')
})

test('boolean settings render as animated keyboard-operable switches', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await loadEditor(page)
  const { drawer } = await openSettings(page)
  const toggle = drawer.locator('#showBorder')

  await expect(toggle).toHaveAttribute('role', 'switch')
  const switchStyle = await toggle.evaluate((element) => {
    const track = getComputedStyle(element)
    const thumb = getComputedStyle(element, '::after')
    return {
      appearance: track.appearance,
      width: Number.parseFloat(track.width),
      height: Number.parseFloat(track.height),
      thumbTransition: thumb.transitionDuration,
      thumbTransform: thumb.transform,
    }
  })
  expect(switchStyle.appearance).toBe('none')
  expect(switchStyle.width).toBeGreaterThan(switchStyle.height)
  expect(switchStyle.thumbTransition).not.toBe('0s')

  const initiallyChecked = await toggle.isChecked()
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toBeChecked({ checked: !initiallyChecked })
  await expect
    .poll(() =>
      toggle.evaluate(
        (element) => getComputedStyle(element, '::after').transform,
      ),
    )
    .not.toBe(switchStyle.thumbTransform)
})

test('desktop drawer is non-modal, keyboard operable, and preserves editor state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await loadEditor(page, 'light')
  const cell = page.locator('[data-row="0"][data-col="0"]')
  const secondCell = page.locator('[data-row="0"][data-col="1"]')
  await cell.click()
  await expect(cell).toHaveClass(/filled/)

  const { trigger, drawer } = await openSettings(page)
  await expect(drawer).not.toHaveAttribute('aria-modal', 'true')
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await expect(page.locator('.settings-overlay')).toBeHidden()

  const auto = drawer.getByRole('radio', { name: 'Auto' })
  await auto.focus()
  await page.keyboard.press('ArrowRight')
  await expect(drawer.getByRole('radio', { name: 'Light' })).toBeChecked()

  await secondCell.click()
  await expect(secondCell).toHaveClass(/filled/)
  await expect(cell).toHaveClass(/filled/)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.getByRole('button', { name: /Undo/i }).last().click()
  await expect(cell).toHaveClass(/filled/)
  await expect(secondCell).not.toHaveClass(/filled/)
})

test('close button returns focus to the settings trigger', async ({ page }) => {
  await loadEditor(page)
  const { trigger, drawer } = await openSettings(page)
  await drawer.getByRole('button', { name: 'Close settings' }).click()
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('settings shows the application version and update-check control', async ({
  page,
}) => {
  await loadEditor(page)
  const { drawer } = await openSettings(page)

  await expect(drawer.getByText('Updates', { exact: true })).toBeVisible()
  await expect(drawer.locator('.settings-version')).toHaveText(
    new RegExp(`^v${escapedPackageVersion}(?:-[0-9a-f]{7})?$`),
  )
  await expect(
    drawer.getByRole('button', { name: 'Check for updates' }),
  ).toBeVisible()
})

test('settings drawer uses distinct enter and leave motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await loadEditor(page)
  const trigger = page.getByRole('button', { name: 'Open settings' })
  const drawer = page.getByRole('dialog', { name: 'Settings' })

  await trigger.click()
  await drawer.waitFor({ state: 'attached' })
  await expect(drawer).toHaveClass(/settings-drawer-enter-active/)
  expect(
    await drawer.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toContain('0.24s')
  await expect(drawer).toHaveCSS('transform', 'none')

  const leaveDuration = await drawer
    .getByRole('button', { name: 'Close settings' })
    .evaluate(
      (button) =>
        new Promise<string>((resolve) => {
          button.click()
          requestAnimationFrame(() => {
            const element = document.querySelector('.settings-sidebar')
            resolve(element ? getComputedStyle(element).transitionDuration : '')
          })
        }),
    )
  expect(leaveDuration).toContain('0.18s')
  await expect(drawer).toBeHidden()
})

test(
  'tablet overlay closes outside, stays open inside, and locks the page',
  {
    tag: '@tablet',
  },
  async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await loadEditor(page)
    let settings = await openSettings(page)
    await expect(settings.drawer).toHaveAttribute('aria-modal', 'true')
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    await settings.drawer.getByText('Canvas & tools', { exact: true }).click()
    await expect(settings.drawer).toBeVisible()
    await page
      .locator('.settings-overlay')
      .click({ position: { x: 20, y: 120 } })
    await expect(settings.drawer).toBeHidden()
    await expect(settings.trigger).toBeFocused()

    settings = await openSettings(page)
    await page.keyboard.press('Escape')
    await expect(settings.drawer).toBeHidden()
  },
)

test(
  'mobile drawer fills the viewport and keeps its content scrollable',
  {
    tag: '@phone',
  },
  async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loadEditor(page, 'dark')
    const { drawer } = await openSettings(page)
    const bounds = await drawer.boundingBox()

    expect(bounds?.x).toBe(0)
    expect(bounds?.width).toBe(390)
    expect(bounds?.height).toBeLessThanOrEqual(844)
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    await expect(drawer.getByRole('radio', { name: 'Auto' })).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(
      page.getByRole('button', { name: 'Toggle color theme' }),
    ).toBeHidden()
    await expect(
      page.getByRole('link', {
        name: 'Open the UniCucumber repository on GitHub',
      }),
    ).toHaveCount(1)
    await expect(
      drawer.getByRole('link', {
        name: 'Open the UniCucumber repository on GitHub',
      }),
    ).toBeVisible()

    const scrollMetrics = await drawer
      .locator('.settings-content')
      .evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }))
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(
      scrollMetrics.clientHeight,
    )
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
    await expect(page.locator('html')).not.toHaveCSS('overflow-x', 'auto')
  },
)

test('legacy manual theme values migrate into the new preference', async ({
  page,
}) => {
  await loadEditor(page, 'light', { theme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const { drawer } = await openSettings(page)
  await expect(drawer.getByRole('radio', { name: 'Dark' })).toBeChecked()
  const storage = await page.evaluate(() => ({
    current: localStorage.getItem('unicucumber_theme_preference'),
    legacy: localStorage.getItem('theme'),
  }))
  expect(storage).toEqual({ current: 'dark', legacy: null })
})
