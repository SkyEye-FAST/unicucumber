import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompositionDocument } from '@/types/composition'
import { createGrid } from '@/utils/hexUtils'

import {
  FallbackCompositionDraftRepository,
  IndexedDbCompositionDraftRepository,
  LocalStorageCompositionDraftRepository,
  type StoredCompositionDraft,
  validateCompositionDraft,
} from './compositionDraftRepository'
import {
  StorageQuotaError,
  StorageUnavailableError,
} from './glyphRepository'

const makeDocument = (codePoint: string): CompositionDocument => ({
  schemaVersion: 1,
  codePoint,
  width: 16,
  layers: [
    {
      id: 'current-glyph',
      name: 'Current glyph',
      bitmap: createGrid(16),
      offsetX: 0,
      offsetY: 0,
      mask: null,
      operation: 'add',
      visible: true,
      locked: false,
    },
  ],
})

const makeDraft = (codePoint: string, updatedAt = 123): StoredCompositionDraft => ({
  id: codePoint,
  schemaVersion: 1,
  updatedAt,
  document: makeDocument(codePoint),
})

describe('composition draft repository', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips drafts independently and deletes only one code point', async () => {
    const repository = new IndexedDbCompositionDraftRepository(
      new IDBFactory(),
      'unicucumber-composition-roundtrip',
    )
    const first = makeDraft('0041', 1)
    const second = makeDraft('0042', 2)

    await repository.saveDraft(first)
    await repository.saveDraft(second)

    await expect(repository.loadDraft('0041')).resolves.toEqual(first)
    await expect(repository.loadDraft('0042')).resolves.toEqual(second)
    expect(repository.persistent).toBe(true)

    await repository.deleteDraft('0041')
    await expect(repository.loadDraft('0041')).resolves.toBeNull()
    await expect(repository.loadDraft('0042')).resolves.toEqual(second)
  })

  it('strictly rejects malformed or non-normalized draft content', () => {
    const valid = makeDraft('0041')
    expect(validateCompositionDraft(valid)).toEqual(valid)
    expect(validateCompositionDraft({ ...valid, id: '41' })).toBeNull()
    expect(
      validateCompositionDraft({
        ...valid,
        document: { ...valid.document, codePoint: '0042' },
      }),
    ).toBeNull()
    expect(
      validateCompositionDraft({
        ...valid,
        document: {
          ...valid.document,
          layers: [
            {
              ...valid.document.layers[0],
              bitmap: createGrid(8),
            },
          ],
        },
      }),
    ).toBeNull()
  })

  it('ignores malformed individual local-storage drafts without losing valid siblings', async () => {
    const first = makeDraft('0041', 1)
    localStorage.setItem(
      'unicucumber_composition_drafts_v1',
      JSON.stringify({
        '0041': first,
        '0042': { ...makeDraft('0042', 2), schemaVersion: 2 },
      }),
    )
    const repository = new LocalStorageCompositionDraftRepository(localStorage)

    await expect(repository.loadDraft('0041')).resolves.toEqual(first)
    await expect(repository.loadDraft('0042')).resolves.toBeNull()

    const third = makeDraft('0043', 3)
    await repository.saveDraft(third)
    await expect(repository.loadDraft('0043')).resolves.toEqual(third)
    await expect(repository.loadDraft('0041')).resolves.toEqual(first)
  })

  it('selects the local-storage fallback when the primary backend fails', async () => {
    const primary = {
      persistent: true,
      saveDraft: vi
        .fn()
        .mockRejectedValue(new StorageUnavailableError('blocked')),
      loadDraft: vi
        .fn()
        .mockRejectedValue(new StorageUnavailableError('blocked')),
      deleteDraft: vi
        .fn()
        .mockRejectedValue(new StorageUnavailableError('blocked')),
    }
    const fallback = {
      persistent: false,
      saveDraft: vi.fn().mockResolvedValue(undefined),
      loadDraft: vi.fn().mockResolvedValue(makeDraft('0041')),
      deleteDraft: vi.fn().mockResolvedValue(undefined),
    }
    const repository = new FallbackCompositionDraftRepository(primary, fallback)

    await expect(repository.loadDraft('0041')).resolves.toEqual(makeDraft('0041'))
    expect(repository.persistent).toBe(false)
    await repository.saveDraft(makeDraft('0041'))
    expect(primary.saveDraft).not.toHaveBeenCalled()
    expect(fallback.saveDraft).toHaveBeenCalledTimes(1)
  })

  it('reports quota errors from the local-storage fallback', async () => {
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
    const repository = new LocalStorageCompositionDraftRepository(quotaStorage)

    await expect(repository.saveDraft(makeDraft('0041'))).rejects.toBeInstanceOf(
      StorageQuotaError,
    )
  })
})
