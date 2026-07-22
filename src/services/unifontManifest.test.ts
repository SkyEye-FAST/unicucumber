import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupStaleUnifontCaches,
  getUnifontRuntimeCacheNames,
  parseUnifontManifest,
} from './unifontManifest'

describe('Unifont manifest schema', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('parses the top-level version field', () => {
    expect(
      parseUnifontManifest({
        version: '17.0.03',
        source: 'unifont_all',
        chunkSize: 4096,
        chunkCount: 272,
      }),
    ).toMatchObject({ version: '17.0.03', chunkCount: 272 })
  })

  it('rejects invalid manifests and versions runtime cache names', () => {
    expect(parseUnifontManifest({ meta: { version: '17.0.03' } })).toBeNull()
    expect(getUnifontRuntimeCacheNames('17.0.03')).not.toEqual(
      getUnifontRuntimeCacheNames('18.0.00'),
    )
  })

  it('removes only stale versioned Unifont caches', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', {
      keys: vi
        .fn()
        .mockResolvedValue([
          'unicucumber-unifont-chunks-16.0.01',
          'unicucumber-unifont-chunks-17.0.03',
          'unrelated-cache',
        ]),
      delete: remove,
    })
    await cleanupStaleUnifontCaches('17.0.03')
    expect(remove).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('unicucumber-unifont-chunks-16.0.01')
  })
})
