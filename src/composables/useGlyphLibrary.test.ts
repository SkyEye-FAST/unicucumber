import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GlyphRepository } from '@/storage/glyphRepository'
import type { Glyph } from '@/types/glyph'

import {
  __resetGlyphLibraryForTests,
  loadGlyphLibrary,
  preloadGlyphLibrary,
  replaceGlyphLibrary,
  useGlyphLibrary,
} from './useGlyphLibrary'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const createRepository = () =>
  ({
    persistent: true,
    migrateLegacyGlyphs: vi.fn(),
    listGlyphs: vi.fn(),
    replaceGlyphs: vi.fn().mockResolvedValue(undefined),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    deleteDraft: vi.fn(),
  }) satisfies GlyphRepository

describe('shared glyph library', () => {
  let repository: ReturnType<typeof createRepository>

  beforeEach(() => {
    repository = createRepository()
    __resetGlyphLibraryForTests(repository)
  })

  it('shares one in-flight load and retains the loaded collection', async () => {
    const pending = deferred<Glyph[]>()
    repository.listGlyphs.mockReturnValue(pending.promise)

    const first = preloadGlyphLibrary()
    const second = loadGlyphLibrary()
    expect(second).toBe(first)
    expect(repository.listGlyphs).toHaveBeenCalledTimes(1)

    pending.resolve([{ codePoint: '0041', hexValue: '00'.repeat(16) }])
    await first
    expect(useGlyphLibrary().loaded.value).toBe(true)
    expect(useGlyphLibrary().glyphs.value).toHaveLength(1)

    await loadGlyphLibrary()
    expect(repository.listGlyphs).toHaveBeenCalledTimes(1)
  })

  it('treats an empty collection as loaded', async () => {
    repository.listGlyphs.mockResolvedValue([])
    await loadGlyphLibrary()
    expect(useGlyphLibrary().glyphs.value).toEqual([])
    expect(useGlyphLibrary().loaded.value).toBe(true)
  })

  it('exposes a load error and retries after failure', async () => {
    repository.listGlyphs
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([])
    await expect(loadGlyphLibrary()).rejects.toThrow('offline')
    expect(useGlyphLibrary().loadError.value?.message).toBe('offline')
    await expect(loadGlyphLibrary()).resolves.toEqual([])
    expect(repository.listGlyphs).toHaveBeenCalledTimes(2)
    expect(useGlyphLibrary().loadError.value).toBeNull()
  })

  it('does not let a stale load overwrite a newer mutation', async () => {
    const pending = deferred<Glyph[]>()
    repository.listGlyphs.mockReturnValue(pending.promise)
    const loading = loadGlyphLibrary()

    const added = { codePoint: '0042', hexValue: 'AA'.repeat(16) }
    await replaceGlyphLibrary([added])
    pending.resolve([{ codePoint: '0041', hexValue: '00'.repeat(16) }])
    await loading

    expect(useGlyphLibrary().glyphs.value).toEqual([added])
    expect(repository.replaceGlyphs).toHaveBeenCalledWith([added])
  })
})
