import { expect, test, type Page } from '@playwright/test'

const COMPONENT_ID = 'AA00000000000000'
const COMPONENT_HEX = `8${'0'.repeat(63)}`

const installCompositionFixture = async (page: Page): Promise<void> => {
  await page.route('**/composition/index.json', (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        dataVersion: 'e2e-v1',
        componentCount: 1,
        idsCount: 0,
        componentChunkFormat: 1,
        idsChunkFormat: 1,
      },
    }),
  )
  await page.route('**/composition/catalog.json', (route) =>
    route.fulfill({
      json: [
        {
          id: COMPONENT_ID,
          characters: ['木'],
          bounds: [0, 0, 1, 1],
          chunk: 'AA',
        },
      ],
    }),
  )
  await page.route('**/composition/components/AA.json', (route) =>
    route.fulfill({
      json: [
        {
          id: COMPONENT_ID,
          characters: ['木'],
          bounds: [0, 0, 1, 1],
          chunk: 'AA',
          hex: COMPONENT_HEX,
        },
      ],
    }),
  )
  for (const chunk of ['004', '006']) {
    await page.route(`**/composition/ids/${chunk}.json`, (route) =>
      route.fulfill({ json: {} }),
    )
  }
}

const selectCjkGlyph = async (page: Page): Promise<void> => {
  const codePoint = page.locator('.code-point-input input')
  await codePoint.fill('660E')
  await codePoint.press('Enter')
  await expect(page.getByTestId('composition-open')).toBeEnabled()
}

const openComposition = async (page: Page): Promise<void> => {
  await selectCjkGlyph(page)
  await page.getByTestId('composition-open').click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

const searchAndAddFixtureComponent = async (page: Page): Promise<void> => {
  const search = page.locator('.component-search input')
  await search.fill('木')
  await search.dispatchEvent('input')
  await page.getByTestId(`composition-component-${COMPONENT_ID}`).click()
}

const compositionDraftLayerCount = (page: Page): Promise<number> =>
  page.evaluate(async () => {
    const databases = await indexedDB.databases()
    if (!databases.some(({ name }) => name === 'unicucumber-composition')) {
      return 0
    }
    return new Promise<number>((resolve, reject) => {
      const request = indexedDB.open('unicucumber-composition')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (!request.result.objectStoreNames.contains('drafts')) {
          resolve(0)
          return
        }
        const transaction = request.result.transaction('drafts', 'readonly')
        const getRequest = transaction.objectStore('drafts').get('660E')
        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () =>
          resolve(getRequest.result?.document?.layers?.length ?? 0)
      }
    })
  })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.route(
    /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
    (route) => route.fulfill({ contentType: 'text/css', body: '' }),
  )
})

test(
  'saves the composed bitmap to the glyph manager without changing the editor',
  {
    tag: '@cross-browser',
  },
  async ({ page }) => {
    await installCompositionFixture(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await openComposition(page)

    const preview = page.getByTestId(
      `composition-component-${COMPONENT_ID}-preview`,
    )
    await expect(preview).toBeVisible()
    await expect(preview.locator('.component-preview-pixel')).toHaveCount(1)

    await page.getByTestId('composition-expand').click()
    const workspaceBounds = await page
      .locator('.composition-workspace')
      .boundingBox()
    const viewport = page.viewportSize()
    expect(workspaceBounds).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(workspaceBounds?.width).toBe(viewport?.width)
    expect(workspaceBounds?.height).toBe(viewport?.height)

    const grid = page.locator('.canvas-grid')
    await expect(grid).toHaveCSS('vector-effect', 'none')
    await expect(page.getByTestId('composition-canvas')).toHaveCSS(
      'border-radius',
      '0px',
    )

    await searchAndAddFixtureComponent(page)
    await page.getByTestId('composition-canvas').focus()
    await page.keyboard.press('ArrowRight')

    await searchAndAddFixtureComponent(page)
    await page
      .getByTestId(`composition-layer-component-${COMPONENT_ID}-2-operation`)
      .selectOption('subtract')

    await page.getByTestId('composition-save').click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await expect(page.locator('.cell.filled')).toHaveCount(0)
    await expect(page.locator('.code-point-input input')).toHaveValue('660E')

    await page.getByRole('button', { name: 'Open glyph manager' }).click()
    await expect(page.locator('.glyph-manager')).toHaveAttribute(
      'data-glyph-count',
      '1',
    )
  },
)

test('restores an unfinished composition draft after reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'draft workflow runs once')
  await installCompositionFixture(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await openComposition(page)
  await searchAndAddFixtureComponent(page)

  await expect.poll(() => compositionDraftLayerCount(page)).toBe(1)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await openComposition(page)
  await expect(
    page.getByTestId(`composition-layer-component-${COMPONENT_ID}-1-select`),
  ).toBeVisible()
})

test(
  'uses mobile tabs without overflowing the viewport',
  { tag: '@phone' },
  async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('phone'), 'phone workflow')
    await installCompositionFixture(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await openComposition(page)

    const tabs = page.locator('.composition-mobile-tabs')
    await expect(tabs).toBeVisible()
    const confirmCodePoint = page.getByTestId('composition-code-point-confirm')
    await expect(confirmCodePoint).toBeVisible()
    const codePointFontSize = await page
      .getByTestId('composition-code-point')
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize))
    expect(codePointFontSize).toBeGreaterThanOrEqual(16)
    await page.getByTestId('composition-code-point').fill('4e00')
    await expect(page.getByTestId('composition-code-point')).toHaveValue('4E00')
    await confirmCodePoint.click()
    await expect(page.getByTestId('composition-code-point')).toHaveValue('4E00')
    await tabs.getByRole('button', { name: 'Components' }).click()
    await expect(page.locator('.component-browser')).toBeVisible()
    await page.getByTestId('composition-add-blank').click()
    await tabs.getByRole('button', { name: 'Layers' }).click()
    await expect(page.locator('.composition-layers')).toBeVisible()

    const deleteButton = page.getByTestId('composition-layer-blank-1-delete')
    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()
    await expect(
      page.getByTestId('composition-layer-blank-1-select'),
    ).toHaveCount(0)
    await expect(page.getByTestId('composition-save')).toBeInViewport()

    const toolbarButtons = page.locator('.composition-toolbar .ui-button')
    await expect(toolbarButtons).toHaveCount(5)
    const toolbarButtonBoxes = await toolbarButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          top: Math.round(box.top),
        }
      }),
    )
    expect(new Set(toolbarButtonBoxes.map(({ top }) => top)).size).toBe(2)
    expect(
      new Set(toolbarButtonBoxes.slice(0, 2).map(({ width }) => width)).size,
    ).toBe(1)
    expect(toolbarButtonBoxes[2]?.width).toBe(toolbarButtonBoxes[3]?.width)
    expect(toolbarButtonBoxes[4]?.width).toBeGreaterThan(
      toolbarButtonBoxes[3]?.width ?? 0,
    )
    expect(
      Math.min(...toolbarButtonBoxes.map(({ height }) => height)),
    ).toBeGreaterThanOrEqual(60)

    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      bodyOverflow: document.body.style.overflow,
    }))
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport)
    expect(metrics.bodyOverflow).toBe('hidden')
  },
)

test('does not request composition data before the workspace is opened', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'network smoke test runs once',
  )
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/composition/')) requests.push(request.url())
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.grid-container')).toBeVisible()
  expect(requests).toEqual([])
})

test('uses real IDS leaves to filter component candidates', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'real-data workflow runs once',
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await openComposition(page)

  const codePoint = page.getByTestId('composition-code-point')
  await codePoint.fill('30ede')
  await codePoint.blur()

  const idsGuide = page.getByTestId('composition-ids-guide')
  await expect(idsGuide.locator('.ids-list')).toBeVisible()
  const complexIdsLayout = await idsGuide.evaluate((guide) => {
    const list = guide.querySelector<HTMLElement>('.ids-list')
    const leaves = [...guide.querySelectorAll<HTMLElement>('.ids-leaf')]
    const centers = leaves.map((leaf) => {
      const bounds = leaf.getBoundingClientRect()
      return bounds.top + bounds.height / 2
    })
    return {
      clientWidth: list?.clientWidth ?? 0,
      scrollWidth: list?.scrollWidth ?? 0,
      centerDelta:
        centers.length === 0 ? 0 : Math.max(...centers) - Math.min(...centers),
    }
  })
  expect(complexIdsLayout.clientWidth).toBeGreaterThanOrEqual(760)
  expect(complexIdsLayout.scrollWidth).toBeLessThanOrEqual(
    complexIdsLayout.clientWidth,
  )
  expect(complexIdsLayout.centerDelta).toBeLessThanOrEqual(1)

  await codePoint.fill('660e')
  await expect(codePoint).toHaveValue('660E')
  await codePoint.blur()

  const sunLeaf = page.getByTestId('composition-ids-leaf-日')
  await expect(sunLeaf).toBeVisible()
  await sunLeaf.click()
  await expect(page.locator('.component-search input')).toHaveValue('日')
  await expect(page.locator('.component-card').first()).toBeVisible()
})

test('keeps composition code point independent from a non-CJK editor glyph', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop workflow runs once')
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByTestId('composition-open')).toBeEnabled()
  await page.getByTestId('composition-open').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('composition-code-point')).toHaveValue('4E00')
  await page.keyboard.press('Escape')
  await expect(page.locator('.code-point-input input')).toHaveValue('0000')
})
