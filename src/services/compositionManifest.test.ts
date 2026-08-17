import { describe, expect, it } from 'vitest'

import {
  getCompositionRuntimeCacheNames,
  parseCompositionCatalog,
  parseCompositionComponentChunk,
  parseCompositionManifest,
} from './compositionManifest'

const summary = {
  id: '00AABBCCDDEEFF00',
  characters: ['木'],
  bounds: [0, 0, 16, 16],
  chunk: '00',
}

describe('composition manifest validation', () => {
  it('parses a complete v1 manifest and derives versioned cache names', () => {
    expect(
      parseCompositionManifest({
        schemaVersion: 1,
        dataVersion: '2026.08 fixture',
        componentCount: 3,
        idsCount: 2,
        componentChunkFormat: 1,
        idsChunkFormat: 1,
      }),
    ).toEqual({
      schemaVersion: 1,
      dataVersion: '2026.08 fixture',
      componentCount: 3,
      idsCount: 2,
      componentChunkFormat: 1,
      idsChunkFormat: 1,
    })

    expect(getCompositionRuntimeCacheNames('2026.08 fixture')).toEqual({
      manifest: 'unicucumber-composition-manifest-2026.08-fixture',
      catalog: 'unicucumber-composition-catalog-2026.08-fixture',
      components: 'unicucumber-composition-components-2026.08-fixture',
      ids: 'unicucumber-composition-ids-2026.08-fixture',
    })
  })

  it('rejects incomplete manifests and invalid catalog metadata', () => {
    expect(
      parseCompositionManifest({
        schemaVersion: 1,
        dataVersion: '',
        componentCount: 0,
        idsCount: 0,
        componentChunkFormat: 1,
        idsChunkFormat: 1,
      }),
    ).toBeNull()
    expect(
      parseCompositionCatalog([{ ...summary, bounds: [4, 0, 3, 16] }]),
    ).toBeNull()
    expect(parseCompositionCatalog([summary, summary])).toBeNull()
  })

  it('requires normalized uppercase 64-digit component payloads', () => {
    expect(
      parseCompositionComponentChunk('00', [
        { ...summary, hex: 'F'.repeat(64) },
      ]),
    ).toEqual([{ ...summary, hex: 'F'.repeat(64) }])

    expect(
      parseCompositionComponentChunk('00', [
        { ...summary, hex: 'f'.repeat(64) },
      ]),
    ).toBeNull()
    expect(
      parseCompositionComponentChunk('00', [
        { ...summary, hex: `${'F'.repeat(63)}G` },
      ]),
    ).toBeNull()
  })
})
