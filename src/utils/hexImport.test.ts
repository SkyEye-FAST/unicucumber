import { describe, expect, it } from 'vitest'

import { parseHexFile } from './hexImport'

describe('Unifont hexadecimal import parsing', () => {
  it('reports malformed lines with line numbers while retaining valid entries', () => {
    const result = parseHexFile(
      [
        `0041:${'0'.repeat(32)}`,
        `0042:${'1'.repeat(16)}`,
        `0043:${'2'.repeat(48)}`,
        'missing separator',
        `D800:${'0'.repeat(32)}`,
        '0042:ABC',
        `1F600:${'F'.repeat(64)}`,
        `1F601:${'A'.repeat(80)}`,
      ].join('\n'),
    )
    expect(result.glyphs).toEqual([
      { codePoint: '0041', hexValue: '0'.repeat(32) },
      { codePoint: '0042', hexValue: '1'.repeat(16) },
      { codePoint: '0043', hexValue: '2'.repeat(48) },
      { codePoint: '1F600', hexValue: 'F'.repeat(64) },
      { codePoint: '1F601', hexValue: 'A'.repeat(80) },
    ])
    expect(result.errors.map(({ line, reason }) => ({ line, reason }))).toEqual(
      [
        { line: 4, reason: 'missing-separator' },
        { line: 5, reason: 'invalid-code-point' },
        { line: 6, reason: 'invalid-glyph-data' },
      ],
    )
  })
})
