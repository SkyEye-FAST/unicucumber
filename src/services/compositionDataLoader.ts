import {
  cleanupStaleCompositionCaches,
  getCompositionIdsChunkId,
  getCompositionRuntimeCacheNames,
  parseCompositionCatalog,
  parseCompositionComponentChunk,
  parseCompositionIdsChunk,
  parseCompositionManifest,
} from '@/services/compositionManifest'
import type {
  CompositionComponentRecord,
  CompositionComponentSummary,
  CompositionDataManifest,
  CompositionIdsChunk,
} from '@/types/composition'

interface CompositionRuntimeCache {
  match: (request: RequestInfo | URL) => Promise<Response | undefined>
  put: (request: RequestInfo | URL, response: Response) => Promise<void>
}

interface CompositionRuntimeCacheStorage {
  open: (name: string) => Promise<CompositionRuntimeCache>
  keys: () => Promise<string[]>
  delete: (name: string) => Promise<boolean>
}

const getRuntimeCacheStorage = (): CompositionRuntimeCacheStorage | null =>
  (
    globalThis as typeof globalThis & {
      caches?: CompositionRuntimeCacheStorage
    }
  ).caches ?? null

const sameSummary = (
  left: CompositionComponentSummary,
  right: CompositionComponentSummary,
): boolean =>
  left.id === right.id &&
  left.chunk === right.chunk &&
  left.characters.length === right.characters.length &&
  left.characters.every((value, index) => value === right.characters[index]) &&
  left.bounds.every((value, index) => value === right.bounds[index])

const touchCacheEntry = <T>(cache: Map<string, T>, key: string): T | null => {
  const value = cache.get(key)
  if (value === undefined) return null
  cache.delete(key)
  cache.set(key, value)
  return value
}

const addCacheEntry = <T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  limit: number,
): void => {
  cache.set(key, value)
  while (cache.size > limit) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

export class CompositionDataLoader {
  private manifestPromise: Promise<CompositionDataManifest> | null = null
  private catalogPromise: Promise<CompositionComponentSummary[]> | null = null
  private readonly resolvedComponentChunks = new Map<
    string,
    CompositionComponentRecord[]
  >()
  private readonly activeComponentChunks = new Map<
    string,
    Promise<CompositionComponentRecord[]>
  >()
  private readonly resolvedIdsChunks = new Map<string, CompositionIdsChunk>()
  private readonly activeIdsChunks = new Map<
    string,
    Promise<CompositionIdsChunk>
  >()

  constructor(
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
    private readonly maxChunks = 8,
    private readonly basePath = '/composition',
    private readonly cacheStorage: CompositionRuntimeCacheStorage | null = getRuntimeCacheStorage(),
  ) {
    if (!Number.isInteger(maxChunks) || maxChunks <= 0) {
      throw new RangeError('Composition cache size must be a positive integer.')
    }
  }

  loadManifest(): Promise<CompositionDataManifest> {
    if (this.manifestPromise) return this.manifestPromise
    const request = this.fetcher(`${this.basePath}/index.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Composition manifest: ${response.status}`)
        }
        const manifest = parseCompositionManifest(await response.json())
        if (manifest === null) {
          throw new TypeError('Invalid composition manifest.')
        }
        await cleanupStaleCompositionCaches(
          manifest.dataVersion,
          this.cacheStorage,
        ).catch(() => undefined)
        return Object.freeze(manifest)
      })
      .catch((error) => {
        if (this.manifestPromise === request) this.manifestPromise = null
        throw error
      })
    this.manifestPromise = request
    return request
  }

  loadCatalog(): Promise<CompositionComponentSummary[]> {
    if (this.catalogPromise) return this.catalogPromise
    const request = this.loadManifest()
      .then(async (manifest) => {
        const response = await this.fetchRuntimeResponse(
          `${this.basePath}/catalog.json`,
          getCompositionRuntimeCacheNames(manifest.dataVersion).catalog,
          'Composition catalog',
        )
        const catalog = parseCompositionCatalog(await response.json())
        if (catalog === null || catalog.length !== manifest.componentCount) {
          throw new TypeError('Invalid composition catalog.')
        }
        for (const summary of catalog) {
          Object.freeze(summary.characters)
          Object.freeze(summary.bounds)
          Object.freeze(summary)
        }
        return Object.freeze(
          catalog,
        ) as unknown as CompositionComponentSummary[]
      })
      .catch((error) => {
        if (this.catalogPromise === request) this.catalogPromise = null
        throw error
      })
    this.catalogPromise = request
    return request
  }

  async searchComponents(
    query: string,
  ): Promise<CompositionComponentSummary[]> {
    const catalog = await this.loadCatalog()
    const trimmed = query.trim()
    if (!trimmed) return [...catalog]

    const codePointMatch = /^(?:U\+)?([0-9A-F]{4,6})$/i.exec(trimmed)
    const numeric = codePointMatch
      ? Number.parseInt(codePointMatch[1] ?? '', 16)
      : Number.NaN
    const needle =
      Number.isFinite(numeric) && numeric <= 0x10ffff
        ? String.fromCodePoint(numeric)
        : trimmed

    return catalog.filter(({ characters }) =>
      characters.some(
        (character) => character === needle || needle.includes(character),
      ),
    )
  }

  async hydrateComponents(
    ids: string[],
  ): Promise<CompositionComponentRecord[]> {
    if (ids.length === 0) return []
    const catalog = await this.loadCatalog()
    const summaries = new Map(catalog.map((summary) => [summary.id, summary]))
    const requested = ids.map((id) => {
      const summary = summaries.get(id)
      if (!summary) throw new RangeError(`Unknown composition component: ${id}`)
      return summary
    })
    const chunks = [...new Set(requested.map(({ chunk }) => chunk))]
    const loaded = await Promise.all(
      chunks.map((chunk) => this.loadComponentChunk(chunk)),
    )
    const records = new Map(
      loaded.flatMap((chunk) =>
        chunk.map((record) => [record.id, record] as const),
      ),
    )

    return requested.map((summary) => {
      const record = records.get(summary.id)
      if (!record || !sameSummary(summary, record)) {
        throw new TypeError(
          `Composition component ${summary.id} does not match its catalog metadata.`,
        )
      }
      return record
    })
  }

  async loadIdsForCodePoint(codePoint: number): Promise<string[]> {
    const chunk = await this.loadIdsChunk(getCompositionIdsChunkId(codePoint))
    return [...(chunk[String(codePoint)] ?? [])]
  }

  private async fetchRuntimeResponse(
    url: string,
    cacheName: string,
    label: string,
  ): Promise<Response> {
    let networkFailure: unknown
    try {
      const response = await this.fetcher(url, { cache: 'no-store' })
      if (response.ok) {
        if (this.cacheStorage) {
          try {
            const cache = await this.cacheStorage.open(cacheName)
            await cache.put(url, response.clone())
          } catch {
            // Cache Storage is optional. A valid network response still wins.
          }
        }
        return response
      }
      networkFailure = new Error(`${label}: ${response.status}`)
    } catch (error) {
      networkFailure = error
    }

    if (this.cacheStorage) {
      try {
        const cache = await this.cacheStorage.open(cacheName)
        const cached = await cache.match(url)
        if (cached) return cached
      } catch {
        // Preserve the network failure if Cache Storage also fails.
      }
    }

    throw networkFailure
  }

  private loadComponentChunk(
    chunk: string,
  ): Promise<CompositionComponentRecord[]> {
    const normalized = chunk.trim().toUpperCase()
    if (!/^[0-9A-F]{2}$/.test(normalized)) {
      return Promise.reject(
        new RangeError('Invalid composition component chunk.'),
      )
    }
    const cached = touchCacheEntry(this.resolvedComponentChunks, normalized)
    if (cached) return Promise.resolve(cached)
    const active = this.activeComponentChunks.get(normalized)
    if (active) return active

    const request = this.loadManifest()
      .then(async (manifest) => {
        const response = await this.fetchRuntimeResponse(
          `${this.basePath}/components/${normalized}.json`,
          getCompositionRuntimeCacheNames(manifest.dataVersion).components,
          `Composition component chunk ${normalized}`,
        )
        const records = parseCompositionComponentChunk(
          normalized,
          await response.json(),
        )
        if (records === null) {
          throw new TypeError(
            `Invalid composition component chunk ${normalized}.`,
          )
        }
        for (const record of records) {
          Object.freeze(record.characters)
          Object.freeze(record.bounds)
          Object.freeze(record)
        }
        const frozen = Object.freeze(
          records,
        ) as unknown as CompositionComponentRecord[]
        addCacheEntry(
          this.resolvedComponentChunks,
          normalized,
          frozen,
          this.maxChunks,
        )
        return frozen
      })
      .finally(() => {
        if (this.activeComponentChunks.get(normalized) === request) {
          this.activeComponentChunks.delete(normalized)
        }
      })
    this.activeComponentChunks.set(normalized, request)
    return request
  }

  private loadIdsChunk(chunk: string): Promise<CompositionIdsChunk> {
    const normalized = chunk.trim().toUpperCase()
    if (!/^[0-9A-F]{3}$/.test(normalized)) {
      return Promise.reject(new RangeError('Invalid composition IDS chunk.'))
    }
    const cached = touchCacheEntry(this.resolvedIdsChunks, normalized)
    if (cached) return Promise.resolve(cached)
    const active = this.activeIdsChunks.get(normalized)
    if (active) return active

    const request = this.loadManifest()
      .then(async (manifest) => {
        const response = await this.fetchRuntimeResponse(
          `${this.basePath}/ids/${normalized}.json`,
          getCompositionRuntimeCacheNames(manifest.dataVersion).ids,
          `Composition IDS chunk ${normalized}`,
        )
        const ids = parseCompositionIdsChunk(normalized, await response.json())
        if (ids === null) {
          throw new TypeError(`Invalid composition IDS chunk ${normalized}.`)
        }
        for (const expressions of Object.values(ids)) Object.freeze(expressions)
        const frozen = Object.freeze(ids)
        addCacheEntry(
          this.resolvedIdsChunks,
          normalized,
          frozen,
          this.maxChunks,
        )
        return frozen
      })
      .finally(() => {
        if (this.activeIdsChunks.get(normalized) === request) {
          this.activeIdsChunks.delete(normalized)
        }
      })
    this.activeIdsChunks.set(normalized, request)
    return request
  }

  get cachedComponentChunkIds(): string[] {
    return [...this.resolvedComponentChunks.keys()]
  }

  get cachedIdsChunkIds(): string[] {
    return [...this.resolvedIdsChunks.keys()]
  }
}

export const compositionDataLoader = new CompositionDataLoader()
