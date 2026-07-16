import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { createGrid } from '@/utils/hexUtils'

import {
  IndexedDbGlyphRepository,
  LocalStorageGlyphRepository,
  StorageQuotaError,
  validateDraft,
} from './glyphRepository'

describe('glyph repository', () => {
  beforeEach(() => localStorage.clear())

  it('migrates valid legacy glyphs exactly once and keeps the original backup', async () => {
    localStorage.setItem(
      'unicucumber_glyphs',
      JSON.stringify([
        { codePoint: '41', hexValue: '0'.repeat(32) },
        { codePoint: 'D800', hexValue: '0'.repeat(32) },
      ]),
    )
    const repository = new IndexedDbGlyphRepository(
      new IDBFactory(),
      localStorage,
      'unicucumber-test-migration',
    )

    await expect(repository.migrateLegacyGlyphs()).resolves.toEqual({
      migrated: 1,
      rejected: 1,
      alreadyComplete: false,
    })
    await expect(repository.listGlyphs()).resolves.toEqual([
      { codePoint: '0041', hexValue: '0'.repeat(32) },
    ])
    expect(localStorage.getItem('unicucumber_glyphs')).not.toBeNull()
    await expect(repository.migrateLegacyGlyphs()).resolves.toMatchObject({
      alreadyComplete: true,
    })
  })

  it('rejects corrupted drafts and round-trips a valid draft', async () => {
    expect(validateDraft({ schemaVersion: 1 })).toBeNull()
    const repository = new IndexedDbGlyphRepository(
      new IDBFactory(),
      localStorage,
      'unicucumber-test-draft',
    )
    const draft = {
      id: 'current' as const,
      schemaVersion: 1 as const,
      updatedAt: 123,
      snapshot: {
        codePoint: '0041',
        width: 8 as const,
        grid: createGrid(8),
        activeGlyphId: null,
      },
    }
    await repository.saveDraft(draft)
    await expect(repository.loadDraft()).resolves.toEqual(draft)
    await repository.deleteDraft()
    await expect(repository.loadDraft()).resolves.toBeNull()
  })

  it('reports quota failures from the local-storage fallback', async () => {
    const quotaStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } satisfies Storage
    const repository = new LocalStorageGlyphRepository(quotaStorage)
    await expect(
      repository.replaceGlyphs([
        { codePoint: '0041', hexValue: '0'.repeat(32) },
      ]),
    ).rejects.toBeInstanceOf(StorageQuotaError)
  })
})
