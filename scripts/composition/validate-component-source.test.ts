import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  decodeUgeSource,
  validateComponentSource,
} from './validate-component-source.mjs'
import { createUgeFixture, fixtureHex } from './test-fixture'

describe('validate UGE component source', () => {
  it('decodes real UGE GS sheets, structure metadata, and normalized IDS', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-'))
    await createUgeFixture(root)

    const decoded = await decodeUgeSource(root)
    expect(decoded.components).toHaveLength(4)
    expect(decoded.components).toContainEqual({
      characters: ['木'],
      hex: fixtureHex([
        [0, 0],
        [15, 15],
      ]),
    })
    expect(decoded.components).toContainEqual({
      characters: ['日', '月'],
      hex: fixtureHex([
        [3, 2],
        [5, 4],
      ]),
    })
    expect(decoded.ids.get(0x660e)).toEqual(['⿰日月'])
    expect(decoded.ids.get(0x660f)).toEqual(['⿱日勿', '⿴囗一'])
    expect(decoded.ids.has(0x6610)).toBe(false)
    expect(decoded.droppedIdsRecords).toBe(1)
  })

  it('rejects non-directories and incomplete extracted sources', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-file-'))
    const file = path.join(root, 'source.txt')
    await writeFile(file, 'source', 'utf8')

    await expect(validateComponentSource(file)).rejects.toThrow(/directory/i)
    await expect(validateComponentSource(root)).rejects.toThrow(/GS directory/i)
  })
})
