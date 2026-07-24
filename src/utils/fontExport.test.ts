import { describe, expect, it } from 'vitest'
import * as opentype from 'opentype.js'

import { createBdfFont, createPixelFont, createPsfFont } from './fontExport'

const readTag = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(...bytes.slice(offset, offset + 4))

const readUint32 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) * 0x1000000 +
    (bytes[offset + 1] ?? 0) * 0x10000 +
    (bytes[offset + 2] ?? 0) * 0x100 +
    (bytes[offset + 3] ?? 0)) >>>
  0

describe('pixel font export', () => {
  const glyphs = [
    {
      codePoint: '0041',
      hexValue:
        '8001800180018001800180018001800180018001800180018001800180018001',
    },
    { codePoint: '1F600', hexValue: '0'.repeat(64) },
  ]

  it('creates an OpenType CFF font with the expected required tables', () => {
    const font = createPixelFont(glyphs, 'otf')
    const tableCount = (font[4] ?? 0) * 0x100 + (font[5] ?? 0)
    const tags = Array.from({ length: tableCount }, (_, index) =>
      readTag(font, 12 + index * 16),
    )
    expect(readUint32(font, 0)).toBe(0x4f54544f)
    expect(tags).toEqual(
      expect.arrayContaining(['CFF ', 'cmap', 'head', 'name']),
    )
  })

  it('converts the OpenType source to a TrueType font', () => {
    const font = createPixelFont(glyphs, 'ttf')
    expect(readUint32(font, 0)).toBe(0x00010000)
    expect(opentype.parse(font.buffer).charToGlyphIndex('A')).toBe(1)
  })

  it('creates a WOFF wrapper with valid declared lengths', () => {
    const font = createPixelFont(glyphs, 'woff')
    expect(readTag(font, 0)).toBe('wOFF')
    expect(readUint32(font, 8)).toBe(font.length)
    expect(readUint32(font, 16)).toBeGreaterThan(0)
  })

  it('keeps Unifont bitmap data in BDF and PSF exports', () => {
    expect(createBdfFont(glyphs)).toContain('ENCODING 65')
    expect(readUint32(createPsfFont(glyphs), 0)).toBe(0x72b54a86)
  })
})
