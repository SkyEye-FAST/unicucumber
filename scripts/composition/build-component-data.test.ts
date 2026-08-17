import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  parseCompositionCatalog,
  parseCompositionComponentChunk,
  parseCompositionIdsChunk,
  parseCompositionManifest,
} from '../../src/services/compositionManifest'
import { buildCompositionData } from './build-component-data.mjs'
import { createUgeFixture, fixtureHex } from './test-fixture'

const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, 'utf8'))

describe('build composition runtime data', () => {
  it('emits deterministic source-neutral runtime data matching validators', async () => {
    const source = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-build-'))
    await createUgeFixture(source)
    const output = path.join(
      await mkdtemp(path.join(tmpdir(), 'unicucumber-out-')),
      'composition',
    )

    const first = await buildCompositionData(source, output, 'fixture-v1')
    const firstCatalogText = await readFile(
      path.join(output, 'catalog.json'),
      'utf8',
    )
    const second = await buildCompositionData(source, output, 'fixture-v1')
    const secondCatalogText = await readFile(
      path.join(output, 'catalog.json'),
      'utf8',
    )

    expect(second).toEqual(first)
    expect(secondCatalogText).toBe(firstCatalogText)
    expect(first).toMatchObject({
      dataVersion: 'fixture-v1',
      componentCount: 3,
      idsCount: 2,
      droppedIdsRecords: 1,
    })

    const manifest = parseCompositionManifest(
      await readJson(path.join(output, 'index.json')),
    )
    expect(manifest).toEqual({
      schemaVersion: 1,
      dataVersion: 'fixture-v1',
      componentCount: 3,
      idsCount: 2,
      componentChunkFormat: 1,
      idsChunkFormat: 1,
    })

    const catalog = parseCompositionCatalog(
      await readJson(path.join(output, 'catalog.json')),
    )
    expect(catalog).toHaveLength(3)
    expect(
      catalog?.every(
        (record) =>
          Object.keys(record).sort().join(',') === 'bounds,characters,chunk,id',
      ),
    ).toBe(true)

    const sharedHex = fixtureHex([
      [0, 0],
      [15, 15],
    ])
    const expectedId = createHash('sha256')
      .update(JSON.stringify({ characters: ['木'], hex: sharedHex }), 'utf8')
      .digest('hex')
      .toUpperCase()
      .slice(0, 32)
    const shared = catalog?.find(({ id }) => id === expectedId)
    expect(shared).toEqual({
      id: expectedId,
      characters: ['木'],
      bounds: [0, 0, 16, 16],
      chunk: expectedId.slice(0, 2),
    })

    for (const summary of catalog ?? []) {
      const records = parseCompositionComponentChunk(
        summary.chunk,
        await readJson(
          path.join(output, 'components', `${summary.chunk}.json`),
        ),
      )
      expect(records?.some(({ id }) => id === summary.id)).toBe(true)
    }

    const ids = parseCompositionIdsChunk(
      '006',
      await readJson(path.join(output, 'ids', '006.json')),
    )
    expect(ids?.['26126']).toEqual(['⿰日月'])
    expect(ids?.['26127']).toEqual(['⿱日勿', '⿴囗一'])
  })

  it('atomically replaces stale output and leaves old output intact on failure', async () => {
    const source = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-build-'))
    await createUgeFixture(source)
    const output = path.join(
      await mkdtemp(path.join(tmpdir(), 'unicucumber-out-')),
      'composition',
    )
    await mkdir(path.join(output, 'components'), { recursive: true })
    await writeFile(path.join(output, 'components', 'STALE.json'), '{}', 'utf8')

    await buildCompositionData(source, output, 'fixture-v1')
    expect(await readdir(path.join(output, 'components'))).not.toContain(
      'STALE.json',
    )

    const invalidSource = await mkdtemp(
      path.join(tmpdir(), 'unicucumber-invalid-'),
    )
    await writeFile(path.join(output, 'sentinel.txt'), 'keep', 'utf8')
    await expect(
      buildCompositionData(invalidSource, output, 'fixture-v2'),
    ).rejects.toThrow()
    expect(await readFile(path.join(output, 'sentinel.txt'), 'utf8')).toBe(
      'keep',
    )
  })
})
