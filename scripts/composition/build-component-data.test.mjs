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

const bitString = (pixels) => {
  const bits = Array.from({ length: 256 }, () => '0')
  for (const [row, col] of pixels) bits[row * 16 + col] = '1'
  return bits.join('')
}

const makeSource = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-build-'))
  await mkdir(path.join(root, 'raw'), { recursive: true })
  await writeFile(
    path.join(root, 'raw', 'components.yml'),
    [
      '- char: 木',
      `  data: ${bitString([[0, 0], [1, 1]])}`,
      '- char: 林',
      `  data: ${bitString([[0, 0], [1, 1]])}`,
      '- char: 日',
      `  data: ${bitString([[3, 4], [7, 8]])}`,
    ].join('\n'),
    'utf8',
  )
  await writeFile(
    path.join(root, 'raw', 'structure.txt'),
    ['U+660E = ⿰日月', 'U+6797 = ⿰木木'].join('\n'),
    'utf8',
  )
  return root
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))

describe('build composition runtime data', () => {
  it('emits deterministic manifest, catalog, component chunks and IDS chunks', async () => {
    const source = await makeSource()
    const output = path.join(await mkdtemp(path.join(tmpdir(), 'unicucumber-out-')), 'composition')

    const first = await buildCompositionData(source, output)
    const firstCatalogText = await readFile(path.join(output, 'catalog.json'), 'utf8')
    const second = await buildCompositionData(source, output)
    const secondCatalogText = await readFile(path.join(output, 'catalog.json'), 'utf8')

    expect(second).toEqual(first)
    expect(secondCatalogText).toBe(firstCatalogText)

    const manifest = parseCompositionManifest(
      await readJson(path.join(output, 'index.json')),
    )
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      componentCount: 2,
      idsCount: 2,
      componentChunkFormat: 1,
      idsChunkFormat: 1,
    })

    const catalog = parseCompositionCatalog(
      await readJson(path.join(output, 'catalog.json')),
    )
    expect(catalog).toHaveLength(2)
    expect(
      catalog?.find(({ characters }) => characters.includes('木'))?.characters,
    ).toEqual(['木', '林'])

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
    expect(ids?.['26519']).toEqual(['⿰木木'])
  })

  it('replaces the output tree so stale chunks cannot survive rebuilds', async () => {
    const source = await makeSource()
    const output = path.join(await mkdtemp(path.join(tmpdir(), 'unicucumber-out-')), 'composition')
    await mkdir(path.join(output, 'components'), { recursive: true })
    await writeFile(path.join(output, 'components', 'STALE.json'), '{}', 'utf8')

    await buildCompositionData(source, output)

    expect(await readdir(path.join(output, 'components'))).not.toContain('STALE.json')
  })

  it('leaves the previous output intact if source validation fails', async () => {
    const source = await mkdtemp(path.join(tmpdir(), 'unicucumber-invalid-'))
    const output = path.join(await mkdtemp(path.join(tmpdir(), 'unicucumber-out-')), 'composition')
    await mkdir(output, { recursive: true })
    await writeFile(path.join(output, 'sentinel.txt'), 'keep', 'utf8')

    await expect(buildCompositionData(source, output)).rejects.toThrow()
    expect(await readFile(path.join(output, 'sentinel.txt'), 'utf8')).toBe('keep')
  })
})
