import { chromium } from '@playwright/test'

const counts = (process.env.GLYPH_PROFILE_COUNTS ?? '0,100,1000,5000')
  .split(',')
  .map((value) => Number.parseInt(value, 10))
  .filter(Number.isFinite)
const baseURL = process.env.GLYPH_PROFILE_URL ?? 'http://127.0.0.1:4173'

const makeGlyphs = (count) =>
  Array.from({ length: count }, (_, index) => {
    const codePoint = (0x21 + index).toString(16).toUpperCase().padStart(4, '0')
    const width = index % 5 === 0 ? 8 : 16
    const bytes = Array.from({ length: (width / 8) * 16 }, (__, byteIndex) =>
      ((index * 37 + byteIndex * 19) & 0xff)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0'),
    ).join('')
    return { codePoint, hexValue: bytes }
  })

const round = (value) => Math.round(value * 10) / 10

const seedGlyphs = async (page, glyphs) => {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.locator('.grid-container').waitFor({ state: 'visible' })
  await page.evaluate(
    ({ items }) =>
      new Promise((resolve, reject) => {
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
    { items: glyphs },
  )
}

const waitForLibrary = async (page, count) => {
  await page.waitForFunction(
    (expected) => {
      const manager = document.querySelector('.glyph-manager')
      if (!manager) return false
      const total = manager.getAttribute('data-glyph-count')
      if (total !== null) return Number(total) === expected
      return expected === 0
        ? document.querySelectorAll('.glyph-card').length === 0
        : document.querySelectorAll('.glyph-card').length > 0
    },
    count,
    { timeout: 30_000 },
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  )
}

const profileOpen = async (page, count) => {
  const session = await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const before = await session.send('Performance.getMetrics')
  const beforeMetrics = Object.fromEntries(
    before.metrics.map(({ name, value }) => [name, value]),
  )

  const openButton = page.locator('.editor-header .modal-button').nth(1)
  await openButton.waitFor({ state: 'attached' })
  const buttonHandle = await openButton.elementHandle()
  if (!buttonHandle) throw new Error('Open button missing')
  const timing = await buttonHandle.evaluate(async (button) => {
    window.__glyphProfile.longTasks = []
    const started = performance.now()
    button.click()

    const waitFor = async (selector) => {
      while (!document.querySelector(selector)) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      return performance.now() - started
    }

    return {
      panelFrameMs: await waitFor('.glyph-manager'),
      controlsMs: await waitFor('.glyph-manager .search-input'),
      started,
    }
  })

  await waitForLibrary(page, count)
  const loadedAt = await page.evaluate(() => performance.now())
  const previewAt = await page.evaluate(
    async ({ expected, started }) => {
      if (expected === 0) return null
      const selector = '.glyph-card canvas, .glyph-card .bitmap-svg'
      while (!document.querySelector(selector)) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      return performance.now() - started
    },
    { expected: count, started: timing.started },
  )

  const after = await session.send('Performance.getMetrics')
  const afterMetrics = Object.fromEntries(
    after.metrics.map(({ name, value }) => [name, value]),
  )
  await session.detach()

  const details = await page.evaluate(() => ({
    cards: document.querySelectorAll('.glyph-card').length,
    canvases: document.querySelectorAll('.glyph-card canvas').length,
    svgs: document.querySelectorAll('.glyph-card .bitmap-svg').length,
    idbReads: window.__glyphProfile.idbReads,
    longTasks: window.__glyphProfile.longTasks,
  }))

  return {
    panelFrameMs: round(timing.panelFrameMs),
    controlsMs: round(timing.controlsMs),
    previewsMs: previewAt === null ? null : round(previewAt),
    loadedMs: round(loadedAt - timing.started),
    taskDurationMs: round(
      ((afterMetrics.TaskDuration ?? 0) - (beforeMetrics.TaskDuration ?? 0)) *
        1000,
    ),
    scriptDurationMs: round(
      ((afterMetrics.ScriptDuration ?? 0) -
        (beforeMetrics.ScriptDuration ?? 0)) *
        1000,
    ),
    ...details,
  }
}

const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const count of counts) {
    console.error(`Profiling ${count} glyphs...`)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()
    const unifontChunkRequests = []
    page.on('request', (request) => {
      if (/\/unifont\/[0-9A-F]{3}\.json/.test(request.url())) {
        unifontChunkRequests.push(request.url())
      }
    })
    await page.addInitScript(() => {
      window.__glyphProfile = { idbReads: 0, longTasks: [], openStarted: 0 }
      const originalGetAll = IDBObjectStore.prototype.getAll
      IDBObjectStore.prototype.getAll = function (...args) {
        window.__glyphProfile.idbReads += 1
        return originalGetAll.apply(this, args)
      }
      try {
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            window.__glyphProfile.longTasks.push({
              duration: Math.round(entry.duration * 10) / 10,
              startTime: Math.round(entry.startTime * 10) / 10,
            })
          }
        }).observe({ type: 'longtask', buffered: true })
      } catch {}
      document.addEventListener(
        'click',
        (event) => {
          const target =
            event.target instanceof Element
              ? event.target.closest('button')
              : null
          if (target?.getAttribute('aria-label') === 'Open glyph manager') {
            window.__glyphProfile.openStarted = performance.now()
          }
        },
        { capture: true },
      )
    })
    await page.addInitScript(() => {
      localStorage.clear()
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { saveData: true, effectiveType: '4g' },
      })
      localStorage.setItem(
        'unicucumber_settings',
        JSON.stringify({ version: 2, glyphPreviewMode: 'both' }),
      )
    })
    await page.route(
      /^https:\/\/(fonts\.googleapis|fontsapi\.zeoseven)\.com\//,
      (route) => route.fulfill({ contentType: 'text/css', body: '' }),
    )
    await seedGlyphs(page, makeGlyphs(count))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.grid-container').waitFor({ state: 'visible' })
    const startup = await page.evaluate(() => ({
      editorReadyMs: Math.round(performance.now() * 10) / 10,
      firstContentfulPaintMs:
        Math.round(
          (performance.getEntriesByName('first-contentful-paint')[0]
            ?.startTime ?? 0) * 10,
        ) / 10,
      idbReadsBeforeOpen: window.__glyphProfile.idbReads,
    }))

    const firstOpen = await profileOpen(page, count)
    await page.locator('.btn-close-sidebar').click()
    await page.locator('.sidebar:not(.active)').waitFor({ state: 'visible' })
    await page.waitForTimeout(350)
    const readsBeforeReopen = await page.evaluate(
      () => window.__glyphProfile.idbReads,
    )
    const reopen = await profileOpen(page, count)
    const readsAfterReopen = await page.evaluate(
      () => window.__glyphProfile.idbReads,
    )

    results.push({
      glyphs: count,
      startup,
      firstOpen,
      reopen: {
        ...reopen,
        additionalIdbReads: readsAfterReopen - readsBeforeReopen,
      },
      unifontChunkRequests: unifontChunkRequests.length,
    })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ baseURL, results }, null, 2))
