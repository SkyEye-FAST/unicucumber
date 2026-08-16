import {
  parseUnifontManifest,
  type UnifontManifest,
} from '@/services/unifontManifest'
import type { Glyph } from '@/types/glyph'
import { isUnicodeScalarValue } from '@/utils/charUtils'
import { normalizeHex } from '@/utils/hexUtils'

export type UnifontChunk = Record<string, string>

export const getUnifontChunkId = (codePoint: number): string => {
  if (!isUnicodeScalarValue(codePoint)) {
    throw new RangeError('Invalid Unicode code point.')
  }
  return Math.floor(codePoint / 0x1000)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0')
}

export const shouldPrefetchUnifont = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (connection?.saveData) return false
  return !['slow-2g', '2g'].includes(connection?.effectiveType ?? '')
}

export class UnifontLoader {
  private readonly resolvedChunks = new Map<string, UnifontChunk>()
  private readonly activeChunks = new Map<string, Promise<UnifontChunk>>()
  private manifestPromise: Promise<UnifontManifest> | null = null
  private catalogPromise: Promise<number[]> | null = null

  constructor(
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
    private readonly maxChunks = 8,
    private readonly basePath = '/unifont',
  ) {}

  loadManifest(): Promise<UnifontManifest> {
    if (this.manifestPromise) return this.manifestPromise
    const request = this.fetcher(`${this.basePath}/index.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unifont manifest: ${response.status}`)
        }
        const manifest = parseUnifontManifest(await response.json())
        if (!manifest) throw new TypeError('Invalid Unifont manifest.')
        return manifest
      })
      .catch((error) => {
        if (this.manifestPromise === request) this.manifestPromise = null
        throw error
      })
    this.manifestPromise = request
    return request
  }

  loadCatalogCodePoints(): Promise<number[]> {
    if (this.catalogPromise) return this.catalogPromise
    const request = Promise.all([
      this.loadManifest(),
      this.fetcher(`${this.basePath}/catalog.json`),
    ])
      .then(async ([manifest, response]) => {
        if (!response.ok) {
          throw new Error(`Unifont catalog index: ${response.status}`)
        }
        const value = (await response.json()) as {
          version?: unknown
          ranges?: unknown
        }
        if (
          value?.version !== manifest.version ||
          !Array.isArray(value.ranges)
        ) {
          throw new TypeError('Invalid Unifont catalog index.')
        }

        const codePoints: number[] = []
        let previous = -1
        for (const range of value.ranges) {
          if (
            !Array.isArray(range) ||
            range.length !== 2 ||
            typeof range[0] !== 'number' ||
            typeof range[1] !== 'number' ||
            !isUnicodeScalarValue(range[0]) ||
            !isUnicodeScalarValue(range[1]) ||
            range[0] > range[1] ||
            range[0] <= previous ||
            (range[0] <= 0xdfff && range[1] >= 0xd800)
          ) {
            throw new TypeError('Invalid Unifont catalog range.')
          }
          for (
            let codePoint = range[0];
            codePoint <= range[1];
            codePoint += 1
          ) {
            codePoints.push(codePoint)
          }
          previous = range[1]
        }
        return codePoints
      })
      .catch((error) => {
        if (this.catalogPromise === request) this.catalogPromise = null
        throw error
      })
    this.catalogPromise = request
    return request
  }

  async loadGlyphsInRange(start: number, end: number): Promise<Glyph[]> {
    if (
      !isUnicodeScalarValue(start) ||
      !isUnicodeScalarValue(end) ||
      start > end
    ) {
      throw new RangeError('Invalid Unicode code point range.')
    }

    const firstChunk = Number.parseInt(getUnifontChunkId(start), 16)
    const lastChunk = Number.parseInt(getUnifontChunkId(end), 16)
    const chunks = await Promise.all(
      Array.from({ length: lastChunk - firstChunk + 1 }, (_, offset) =>
        this.loadChunk(
          (firstChunk + offset).toString(16).toUpperCase().padStart(3, '0'),
        ),
      ),
    )

    return chunks.flatMap((chunk) =>
      Object.entries(chunk).flatMap(([decimal, hexValue]) => {
        const codePoint = Number.parseInt(decimal, 10)
        const normalizedHex = normalizeHex(hexValue)
        if (
          !isUnicodeScalarValue(codePoint) ||
          codePoint < start ||
          codePoint > end ||
          normalizedHex === null
        ) {
          return []
        }
        return [
          {
            codePoint: codePoint.toString(16).toUpperCase().padStart(4, '0'),
            hexValue: normalizedHex.toUpperCase(),
          },
        ]
      }),
    )
  }

  loadChunkForCodePoint(codePoint: number): Promise<UnifontChunk> {
    return this.loadChunk(getUnifontChunkId(codePoint))
  }

  loadChunk(chunkId: string): Promise<UnifontChunk> {
    const normalized = chunkId.trim().toUpperCase()
    if (!/^[0-9A-F]{3}$/.test(normalized)) {
      return Promise.reject(new RangeError('Invalid Unifont chunk ID.'))
    }
    const cached = this.resolvedChunks.get(normalized)
    if (cached) {
      this.resolvedChunks.delete(normalized)
      this.resolvedChunks.set(normalized, cached)
      return Promise.resolve(cached)
    }
    const active = this.activeChunks.get(normalized)
    if (active) return active

    const request = this.fetcher(`${this.basePath}/${normalized}.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unifont chunk ${normalized}: ${response.status}`)
        }
        const value = await response.json()
        if (
          value === null ||
          typeof value !== 'object' ||
          Array.isArray(value)
        ) {
          throw new TypeError(`Invalid Unifont chunk ${normalized}.`)
        }
        const chunk: UnifontChunk = {}
        for (const [decimal, hexValue] of Object.entries(value)) {
          const codePoint = /^\d+$/.test(decimal)
            ? Number.parseInt(decimal, 10)
            : Number.NaN
          const normalizedHex =
            typeof hexValue === 'string' ? normalizeHex(hexValue) : null
          if (
            !isUnicodeScalarValue(codePoint) ||
            getUnifontChunkId(codePoint) !== normalized ||
            normalizedHex === null
          ) {
            throw new TypeError(`Invalid Unifont chunk ${normalized}.`)
          }
          chunk[String(codePoint)] = normalizedHex.toUpperCase()
        }
        this.resolvedChunks.set(normalized, chunk)
        while (this.resolvedChunks.size > this.maxChunks) {
          const oldest = this.resolvedChunks.keys().next().value
          if (oldest === undefined) break
          this.resolvedChunks.delete(oldest)
        }
        return chunk
      })
      .finally(() => {
        if (this.activeChunks.get(normalized) === request) {
          this.activeChunks.delete(normalized)
        }
      })
    this.activeChunks.set(normalized, request)
    return request
  }

  async getGlyph(codePoint: number): Promise<string | null> {
    const chunk = await this.loadChunkForCodePoint(codePoint)
    return chunk[String(codePoint)] ?? null
  }

  async prefetchCodePoint(codePoint: number): Promise<void> {
    if (!shouldPrefetchUnifont()) return
    await this.loadChunkForCodePoint(codePoint).then(
      () => undefined,
      () => undefined,
    )
  }

  get cachedChunkIds(): string[] {
    return [...this.resolvedChunks.keys()]
  }
}

export const unifontLoader = new UnifontLoader()
