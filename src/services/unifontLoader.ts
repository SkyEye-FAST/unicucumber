import {
  parseUnifontManifest,
  type UnifontManifest,
} from '@/services/unifontManifest'

export type UnifontChunk = Record<string, string>

export const getUnifontChunkId = (codePoint: number): string => {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
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
        const chunk = value as UnifontChunk
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
