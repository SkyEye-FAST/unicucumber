import { describe, expect, it } from 'vitest'

import {
  characterFromCodePoint,
  isUnicodeScalarValue,
  normalizeCodePointHex,
} from './charUtils'

describe('Unicode scalar validation', () => {
  it('accepts scalar values and rejects surrogates and out-of-range values', () => {
    expect(normalizeCodePointHex('41')).toBe('0041')
    expect(normalizeCodePointHex('10ffff')).toBe('10FFFF')
    expect(normalizeCodePointHex('D800')).toBeNull()
    expect(normalizeCodePointHex('110000')).toBeNull()
    expect(normalizeCodePointHex('xyz')).toBeNull()
    expect(isUnicodeScalarValue(0x10ffff)).toBe(true)
    expect(characterFromCodePoint(0xdfff)).toBeNull()
  })
})
