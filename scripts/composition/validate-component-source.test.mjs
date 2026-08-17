import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  decodeUgeSource,
  validateComponentSource,
} from './validate-component-source.mjs'

const bitString = (pixels) => {
  const bits = Array.from({ length: 256 }, () => '0')
  for (const [row, col] of pixels) bits[row * 16 + col] = '1'
  return bits.join('')
}

const makeSource = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-'))
  const dataDir = path.join(root, 'Data')
  await mkdir(dataDir, { recursive: true })
  await writeFile(
    path.join(root, 'MainCommand_1_1_0.py'),
    '# extracted UGE package marker\n',
    'utf8',
  )
  await writeFile(
    path.join(dataDir, 'components.yaml'),
    [
      '- character: 木',
      `  bitmap: ${bitString([[0, 0], [15, 15]])}`,
      '- character: 林',
      `  bitmap: ${bitString([[0, 0], [15, 15]])}`,
      '- unicode: U+65E5',
      `  bitmap: ${bitString([[1, 2], [4, 6]])}`,
    ].join('\n'),
    'utf8',
  )
  await writeFile(
    path.join(dataDir, 'ids.yaml'),
    ['明: ⿰日月', '林: ⿰木木'].join('\n'),
    'utf8',
  )
  return root
}

describe('validate UGE component source', () => {
  it('discovers bitmaps and IDS records directly from an extracted directory', async () => {
    const root = await makeSource()
    const decoded = await decodeUgeSource(root)

    expect(decoded.components).toHaveLength(2)
    const shared = decoded.components.find(({ characters }) =>
      characters.includes('木'),
    )
    expect(shared?.characters).toEqual(['木', '林'])
    expect(decoded.components.every(({ hex }) => /^[0-9A-F]{64}$/.test(hex))).toBe(
      true,
    )
    expect(decoded.ids.get(0x660e)).toEqual(['⿰日月'])
    expect(decoded.ids.get(0x6797)).toEqual(['⿰木木'])
  })

  it('rejects directories without any valid 16x16 component records', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-empty-'))
    await writeFile(path.join(root, 'notes.txt'), 'not component data', 'utf8')

    await expect(validateComponentSource(root)).rejects.toThrow(
      /valid 16x16 component/i,
    )
  })

  it('rejects non-directory source paths', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'unicucumber-uge-file-'))
    const file = path.join(root, 'source.txt')
    await writeFile(file, 'source', 'utf8')

    await expect(validateComponentSource(file)).rejects.toThrow(/directory/i)
  })
})
