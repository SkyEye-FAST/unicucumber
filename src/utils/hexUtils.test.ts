import { describe, expect, it } from 'vitest'

import {
  createGrid,
  getGlyphWidthFromHex,
  gridToHex,
  hexToGrid,
  normalizeHex,
} from './hexUtils'

describe('glyph hexadecimal conversion', () => {
  it('creates and converts 8- and 16-column grids', () => {
    const narrow = createGrid(8)
    narrow[0]![0] = 1
    expect(narrow).toHaveLength(16)
    expect(narrow[0]).toHaveLength(8)
    expect(gridToHex(narrow)).toBe(`8${'0'.repeat(31)}`)

    const wide = hexToGrid(`F${'0'.repeat(63)}`)
    expect(wide?.[0]).toHaveLength(16)
    expect(gridToHex(wide!)).toBe(`F${'0'.repeat(63)}`)
  })

  it('normalizes valid input and rejects incomplete, malformed and boundary lengths', () => {
    expect(normalizeHex('ab'.padEnd(32, '0'))).toBe('AB'.padEnd(32, '0'))
    expect(getGlyphWidthFromHex('0'.repeat(31))).toBeNull()
    expect(hexToGrid('0'.repeat(33))).toBeNull()
    expect(hexToGrid('G'.repeat(32))).toBeNull()
    expect(hexToGrid('0'.repeat(64))).not.toBeNull()
  })
})
