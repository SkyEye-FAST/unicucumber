import { describe, expect, it } from 'vitest'

import { parseHexFile } from './hexImport'

describe('Unifont hexadecimal import parsing', () => {
  it('reports malformed lines with line numbers while retaining valid entries', () => {
    const result = parseHexFile(
      [
        `0041:${'0'.repeat(32)}`,
        'missing separator',
        `D800:${'0'.repeat(32)}`,
        '0042:ABC',
        `1F600:${'F'.repeat(64)}`,
      ].join('\n'),
    )
    expect(result.glyphs).toEqual([
      { codePoint: '0041', hexValue: '0'.repeat(32) },
      { codePoint: '1F600', hexValue: 'F'.repeat(64) },
    ])
    expect(result.errors.map(({ line, reason }) => ({ line, reason }))).toEqual(
      [
        { line: 2, reason: 'missing-separator' },
        { line: 3, reason: 'invalid-code-point' },
        { line: 4, reason: 'invalid-glyph-data' },
      ],
    )
  })
})
