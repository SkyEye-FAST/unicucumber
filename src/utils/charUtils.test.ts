import { describe, expect, it } from 'vitest'

import {
  characterFromCodePoint,
  isCJKCodePoint,
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

describe('CJK code point detection', () => {
  it('recognizes every supported CJK ideograph range, including Extension J', () => {
    expect(isCJKCodePoint(0x0000)).toBe(false)
    expect(isCJKCodePoint(0x4e00)).toBe(true)
    expect(isCJKCodePoint(0x3400)).toBe(true)
    expect(isCJKCodePoint(0x20000)).toBe(true)
    expect(isCJKCodePoint(0x2ebf0)).toBe(true)
    expect(isCJKCodePoint(0x323b0)).toBe(true)
    expect(isCJKCodePoint(0x3347f)).toBe(true)
    expect(isCJKCodePoint(0xf900)).toBe(true)
    expect(isCJKCodePoint(0x2f800)).toBe(true)
    expect(isCJKCodePoint(0x110000)).toBe(false)
  })
})
