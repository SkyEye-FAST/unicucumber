import { describe, expect, it } from 'vitest'

import { CompositionDataLoader } from './compositionDataLoader'

class MemoryCacheStorage {
  private readonly stores = new Map<string, Map<string, Response>>()

  async open(name: string) {
    const store = this.stores.get(name) ?? new Map<string, Response>()
    this.stores.set(name, store)
    return {
      match: async (request: RequestInfo | URL) =>
        store.get(String(request))?.clone(),
      put: async (request: RequestInfo | URL, response: Response) => {
        store.set(String(request), response.clone())
      },
    }
  }

  async keys(): Promise<string[]> {
    return [...this.stores.keys()]
  }

  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name)
  }
}

interface FixtureResponse {
  status?: number
  body: unknown
}

const componentId = (chunk: string): string => `${chunk}AABBCCDDEEFF00`
const componentHex = (nibble: string): string => nibble.repeat(64)

const makeSummary = (chunk: string, character: string) => ({
  id: componentId(chunk),
  characters: [character],
  bounds: [0, 0, 16, 16],
  chunk,
})

const manifest = (componentCount: number) => ({
  schemaVersion: 1,
  dataVersion: 'fixture-v1',
  componentCount,
  idsCount: 1,
  componentChunkFormat: 1,
  idsChunkFormat: 1,
})

const fixtureFetcher = (responses: Record<string, FixtureResponse>) => {
  const calls: string[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = String(input)
    calls.push(url)
    const response = responses[url]
    if (!response) return new Response('', { status: 404 })
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return { fetcher, calls }
}

describe('CompositionDataLoader', () => {
  it('searches catalog metadata without fetching component chunks', async () => {
    const summaries = [makeSummary('00', '木'), makeSummary('01', '日')]
    const fixture = fixtureFetcher({
      '/composition/index.json': { body: manifest(summaries.length) },
      '/composition/catalog.json': { body: summaries },
    })
    const loader = new CompositionDataLoader(fixture.fetcher)

    await expect(loader.searchComponents('木')).resolves.toEqual([summaries[0]])
    expect(fixture.calls.filter((url) => url.includes('/components/'))).toEqual(
      [],
    )
  })

  it('deduplicates concurrent manifest, catalog and component requests', async () => {
    const summary = makeSummary('00', '木')
    const fixture = fixtureFetcher({
      '/composition/index.json': { body: manifest(1) },
      '/composition/catalog.json': { body: [summary] },
      '/composition/components/00.json': {
        body: [{ ...summary, hex: componentHex('F') }],
      },
    })
    const loader = new CompositionDataLoader(fixture.fetcher)

    await Promise.all([loader.loadCatalog(), loader.loadCatalog()])
    await Promise.all([
      loader.hydrateComponents([summary.id]),
      loader.hydrateComponents([summary.id]),
    ])

    expect(
      fixture.calls.filter((url) => url.endsWith('/index.json')),
    ).toHaveLength(1)
    expect(
      fixture.calls.filter((url) => url.endsWith('/catalog.json')),
    ).toHaveLength(1)
    expect(
      fixture.calls.filter((url) => url.endsWith('/components/00.json')),
    ).toHaveLength(1)
  })

  it('retries failed requests instead of caching their rejection', async () => {
    let attempts = 0
    const fetcher: typeof fetch = async (input) => {
      if (String(input).endsWith('/index.json')) {
        attempts += 1
        if (attempts === 1) return new Response('', { status: 503 })
        return new Response(JSON.stringify(manifest(0)), { status: 200 })
      }
      return new Response('', { status: 404 })
    }
    const loader = new CompositionDataLoader(fetcher)

    await expect(loader.loadManifest()).rejects.toThrow(/503/)
    await expect(loader.loadManifest()).resolves.toMatchObject({
      dataVersion: 'fixture-v1',
    })
    expect(attempts).toBe(2)
  })

  it('evicts the least recently used resolved component chunk after 8 entries', async () => {
    const chunks = Array.from({ length: 9 }, (_, index) =>
      index.toString(16).toUpperCase().padStart(2, '0'),
    )
    const summaries = chunks.map((chunk, index) =>
      makeSummary(chunk, String.fromCodePoint(0x4e00 + index)),
    )
    const responses: Record<string, FixtureResponse> = {
      '/composition/index.json': { body: manifest(summaries.length) },
      '/composition/catalog.json': { body: summaries },
    }
    for (const [index, summary] of summaries.entries()) {
      responses[`/composition/components/${summary.chunk}.json`] = {
        body: [
          { ...summary, hex: componentHex(index.toString(16).toUpperCase()) },
        ],
      }
    }
    const fixture = fixtureFetcher(responses)
    const loader = new CompositionDataLoader(fixture.fetcher)

    for (const summary of summaries) {
      await loader.hydrateComponents([summary.id])
    }
    await loader.hydrateComponents([summaries[0]!.id])

    expect(loader.cachedComponentChunkIds).toHaveLength(8)
    expect(
      fixture.calls.filter((url) => url.endsWith('/components/00.json')),
    ).toHaveLength(2)
  })

  it('loads IDS by Unicode chunk with a separate cache and validates the payload', async () => {
    const fixture = fixtureFetcher({
      '/composition/index.json': { body: manifest(0) },
      '/composition/ids/004.json': { body: { '19968': ['⿰木木'] } },
    })
    const loader = new CompositionDataLoader(fixture.fetcher)

    await expect(loader.loadIdsForCodePoint(0x4e00)).resolves.toEqual([
      '⿰木木',
    ])
    await expect(loader.loadIdsForCodePoint(0x4e00)).resolves.toEqual([
      '⿰木木',
    ])
    expect(loader.cachedIdsChunkIds).toEqual(['004'])
    expect(
      fixture.calls.filter((url) => url.endsWith('/ids/004.json')),
    ).toHaveLength(1)
  })

  it('returns no IDS expressions when the Unicode chunk has no data', async () => {
    const fixture = fixtureFetcher({
      '/composition/index.json': { body: manifest(0) },
    })
    const loader = new CompositionDataLoader(fixture.fetcher)

    await expect(loader.loadIdsForCodePoint(0)).resolves.toEqual([])
    expect(fixture.calls).toContain('/composition/ids/000.json')
  })

  it('rejects malformed hydrated component hex data', async () => {
    const summary = makeSummary('00', '木')
    const fixture = fixtureFetcher({
      '/composition/index.json': { body: manifest(1) },
      '/composition/catalog.json': { body: [summary] },
      '/composition/components/00.json': {
        body: [{ ...summary, hex: 'g'.repeat(64) }],
      },
    })
    const loader = new CompositionDataLoader(fixture.fetcher)

    await expect(loader.hydrateComponents([summary.id])).rejects.toThrow(
      /Invalid composition component chunk/,
    )
  })

  it('uses only same-version runtime caches when the network is unavailable', async () => {
    const summary = makeSummary('00', '木')
    const cacheStorage = new MemoryCacheStorage()
    const online = fixtureFetcher({
      '/composition/index.json': { body: manifest(1) },
      '/composition/catalog.json': { body: [summary] },
      '/composition/components/00.json': {
        body: [{ ...summary, hex: componentHex('F') }],
      },
    })
    const first = new CompositionDataLoader(
      online.fetcher,
      8,
      '/composition',
      cacheStorage,
    )
    await first.hydrateComponents([summary.id])

    const offlineCalls: string[] = []
    const offline: typeof fetch = async (input) => {
      const url = String(input)
      offlineCalls.push(url)
      if (url.endsWith('/index.json')) {
        return new Response(JSON.stringify(manifest(1)), { status: 200 })
      }
      throw new TypeError('offline')
    }
    const second = new CompositionDataLoader(
      offline,
      8,
      '/composition',
      cacheStorage,
    )

    await expect(second.hydrateComponents([summary.id])).resolves.toEqual([
      expect.objectContaining({ id: summary.id, hex: componentHex('F') }),
    ])
    expect(offlineCalls).toContain('/composition/catalog.json')
    expect(offlineCalls).toContain('/composition/components/00.json')
  })

  it('does not reuse stale runtime data after the manifest version changes', async () => {
    const summary = makeSummary('00', '木')
    const cacheStorage = new MemoryCacheStorage()
    const v1Manifest = manifest(1)
    const online = fixtureFetcher({
      '/composition/index.json': { body: v1Manifest },
      '/composition/catalog.json': { body: [summary] },
      '/composition/components/00.json': {
        body: [{ ...summary, hex: componentHex('F') }],
      },
    })
    const first = new CompositionDataLoader(
      online.fetcher,
      8,
      '/composition',
      cacheStorage,
    )
    await first.hydrateComponents([summary.id])

    const v2Manifest = { ...v1Manifest, dataVersion: 'fixture-v2' }
    const mixedNetwork: typeof fetch = async (input) => {
      if (String(input).endsWith('/index.json')) {
        return new Response(JSON.stringify(v2Manifest), { status: 200 })
      }
      throw new TypeError('offline')
    }
    const second = new CompositionDataLoader(
      mixedNetwork,
      8,
      '/composition',
      cacheStorage,
    )

    await expect(second.loadCatalog()).rejects.toThrow(/offline/)
    expect(await cacheStorage.keys()).not.toContain(
      'unicucumber-composition-catalog-fixture-v1',
    )
  })
})
