import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import { IndexedDbLocalPreviewFontRepository } from './localPreviewFontRepository'

describe('IndexedDbLocalPreviewFontRepository', () => {
  it('persists and removes a local preview font', async () => {
    const repository = new IndexedDbLocalPreviewFontRepository(new IDBFactory())
    const record = {
      id: 'current' as const,
      fileName: 'preview.ttf',
      mimeType: 'font/ttf',
      data: new Uint8Array([1, 2, 3]).buffer,
      updatedAt: Date.now(),
    }

    await repository.save(record)
    const restored = await repository.load()
    expect(restored).toMatchObject({
      id: 'current',
      fileName: 'preview.ttf',
      mimeType: 'font/ttf',
    })
    expect(restored?.data.byteLength).toBe(3)

    await repository.clear()
    await expect(repository.load()).resolves.toBeNull()
  })
})
