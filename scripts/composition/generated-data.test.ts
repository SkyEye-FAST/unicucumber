import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  parseCompositionCatalog,
  parseCompositionComponentChunk,
  parseCompositionIdsChunk,
  parseCompositionManifest,
} from '../../src/services/compositionManifest'

const ROOT = path.resolve('public/composition')

const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, 'utf8'))

describe('generated composition data', () => {
  it('is internally consistent and accepted by runtime validators', async () => {
    const manifest = parseCompositionManifest(
      await readJson(path.join(ROOT, 'index.json')),
    )
    expect(manifest).not.toBeNull()
    if (manifest === null) return

    const catalog = parseCompositionCatalog(
      await readJson(path.join(ROOT, 'catalog.json')),
    )
    expect(catalog).not.toBeNull()
    if (catalog === null) return
    expect(catalog).toHaveLength(manifest.componentCount)

    const catalogIds = new Set(catalog.map(({ id }) => id))
    const componentFiles = (await readdir(path.join(ROOT, 'components'))).sort()
    expect(componentFiles).toHaveLength(256)
    let componentCount = 0
    const hydratedIds = new Set<string>()
    for (const file of componentFiles) {
      expect(file).toMatch(/^[0-9A-F]{2}\.json$/)
      const chunk = file.slice(0, 2)
      const records = parseCompositionComponentChunk(
        chunk,
        await readJson(path.join(ROOT, 'components', file)),
      )
      expect(records).not.toBeNull()
      for (const record of records ?? []) {
        expect(catalogIds.has(record.id)).toBe(true)
        expect(hydratedIds.has(record.id)).toBe(false)
        hydratedIds.add(record.id)
        componentCount += 1
      }
    }
    expect(componentCount).toBe(manifest.componentCount)
    expect(hydratedIds).toEqual(catalogIds)

    const idsFiles = (await readdir(path.join(ROOT, 'ids'))).sort()
    let idsCount = 0
    const idsCodePoints = new Set<string>()
    for (const file of idsFiles) {
      expect(file).toMatch(/^[0-9A-F]{3}\.json$/)
      const chunk = file.slice(0, 3)
      const records = parseCompositionIdsChunk(
        chunk,
        await readJson(path.join(ROOT, 'ids', file)),
      )
      expect(records).not.toBeNull()
      for (const codePoint of Object.keys(records ?? {})) {
        expect(idsCodePoints.has(codePoint)).toBe(false)
        idsCodePoints.add(codePoint)
        idsCount += 1
      }
    }
    expect(idsCount).toBe(manifest.idsCount)
  })
})
