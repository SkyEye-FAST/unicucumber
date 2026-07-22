import { describe, expect, it, vi } from 'vitest'

import { getUnifontChunkId, UnifontLoader } from './unifontLoader'

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('UnifontLoader', () => {
  it.each([
    [0, '000'],
    [0xfff, '000'],
    [0x1000, '001'],
    [0x10ffff, '10F'],
  ])('maps U+%s to chunk %s', (codePoint, chunk) => {
    expect(getUnifontChunkId(codePoint)).toBe(chunk)
  })

  it('loads and validates the manifest only once', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        version: '17.0.03',
        source: 'unifont_all',
        chunkSize: 4096,
        chunkCount: 272,
      }),
    )
    const loader = new UnifontLoader(fetcher)
    const [first, second] = await Promise.all([
      loader.loadManifest(),
      loader.loadManifest(),
    ])
    expect(first).toBe(second)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('loads the complete catalog as normalized glyph records only once', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        meta: { version: '17.0.03', source: 'unifont_all' },
        glyphs: {
          '65': 'aa'.repeat(16),
          '19968': 'BB'.repeat(32),
          invalid: '00',
        },
      }),
    )
    const loader = new UnifontLoader(fetcher)
    const [first, second] = await Promise.all([
      loader.loadAllGlyphs(),
      loader.loadAllGlyphs(),
    ])
    expect(first).toEqual([
      { codePoint: '0041', hexValue: 'AA'.repeat(16) },
      { codePoint: '4E00', hexValue: 'BB'.repeat(32) },
    ])
    expect(second).toBe(first)
    expect(fetcher).toHaveBeenCalledWith('/unifont-map.json')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('deduplicates speculative and explicit requests for the same chunk', async () => {
    const pending = deferred<Response>()
    const fetcher = vi.fn().mockReturnValue(pending.promise)
    const loader = new UnifontLoader(fetcher)
    const speculative = loader.prefetchCodePoint(0x41)
    const explicit = loader.getGlyph(0x41)
    expect(fetcher).toHaveBeenCalledTimes(1)
    pending.resolve(jsonResponse({ '65': 'AA'.repeat(16) }))
    await expect(explicit).resolves.toBe('AA'.repeat(16))
    await expect(speculative).resolves.toBeUndefined()
  })

  it('uses deterministic LRU eviction for resolved chunks', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({})))
    const loader = new UnifontLoader(fetcher, 2)
    await loader.loadChunk('000')
    await loader.loadChunk('001')
    await loader.loadChunk('000')
    await loader.loadChunk('002')
    expect(loader.cachedChunkIds).toEqual(['000', '002'])
  })

  it('retries failed chunks and returns null for a missing glyph', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({}))
    const loader = new UnifontLoader(fetcher)
    await expect(loader.getGlyph(0x41)).rejects.toThrow('500')
    await expect(loader.getGlyph(0x41)).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps background prefetch failures silent', async () => {
    const loader = new UnifontLoader(
      vi.fn().mockRejectedValue(new Error('offline')),
    )
    await expect(loader.prefetchCodePoint(0x41)).resolves.toBeUndefined()
  })
})
