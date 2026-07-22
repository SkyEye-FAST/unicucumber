import { describe, expect, it } from 'vitest'

import {
  blocksForPlane,
  UNICODE_BLOCK_NAMES_ZH_HANS,
  UNICODE_BLOCK_NAMES_ZH_HANT,
  UNICODE_BLOCKS,
} from '@/data/unicodeBlocks'
import type { Glyph } from '@/types/glyph'

import {
  createGlyphBitmapPath,
  glyphCharacter,
  glyphWidthFromData,
  prepareGlyphPreview,
  sortGlyphsByCodePoint,
} from './glyphLibrary'

describe('glyph-library preview preparation', () => {
  it('uses Unicode 17 plane and block ranges for catalog filtering', () => {
    expect(UNICODE_BLOCKS.length).toBeGreaterThan(300)
    expect(
      blocksForPlane(0).find((block) => block.id === 'basic-latin'),
    ).toMatchObject({ start: 0x0000, end: 0x007f })
    expect(
      blocksForPlane(0).find(
        (block) => block.id === 'cjk-unified-ideographs-extension-a',
      ),
    ).toMatchObject({ start: 0x3400, end: 0x4dbf })
    expect(
      blocksForPlane(2).find(
        (block) => block.id === 'cjk-unified-ideographs-extension-b',
      ),
    ).toMatchObject({ start: 0x20000, end: 0x2a6df })
  })

  it('provides a Chinese name for every Unicode block', () => {
    expect(
      UNICODE_BLOCKS.filter((block) => !UNICODE_BLOCK_NAMES_ZH_HANS[block.id]),
    ).toEqual([])
    expect(
      UNICODE_BLOCKS.filter((block) => !UNICODE_BLOCK_NAMES_ZH_HANT[block.id]),
    ).toEqual([])
    expect(UNICODE_BLOCK_NAMES_ZH_HANS['basic-latin']).toBe('基本拉丁字母')
    expect(UNICODE_BLOCK_NAMES_ZH_HANT.cyrillic).toBe('西里爾字母')
    expect(Object.values(UNICODE_BLOCK_NAMES_ZH_HANS)).not.toContainEqual(
      expect.stringMatching(/英[语語]\s*：/),
    )
    expect(Object.values(UNICODE_BLOCK_NAMES_ZH_HANT)).not.toContainEqual(
      expect.stringMatching(/英[语語]\s*：/),
    )
    expect(
      UNICODE_BLOCKS.filter((block) => !UNICODE_BLOCK_NAMES_ZH_HANS[block.id]),
    ).toEqual([])
    expect(
      UNICODE_BLOCKS.filter((block) => !UNICODE_BLOCK_NAMES_ZH_HANT[block.id]),
    ).toEqual([])
  })

  it('sorts glyphs by numeric code point', () => {
    const glyphs: Glyph[] = [
      { codePoint: '10000', hexValue: '00'.repeat(32) },
      { codePoint: '0042', hexValue: '00'.repeat(16) },
      { codePoint: '00FF', hexValue: '00'.repeat(16) },
    ]
    expect(
      sortGlyphsByCodePoint(glyphs).map((glyph) => glyph.codePoint),
    ).toEqual(['0042', '00FF', '10000'])
  })

  it('builds crisp single-path previews for 8-pixel and 16-pixel data', () => {
    expect(createGlyphBitmapPath(`80${'00'.repeat(15)}`, 8)).toBe(
      'M0 0h1v1h-1z',
    )
    expect(createGlyphBitmapPath(`8000${'00'.repeat(30)}`, 16)).toBe(
      'M0 0h1v1h-1z',
    )
    expect(glyphWidthFromData('00'.repeat(16))).toBe(8)
    expect(glyphWidthFromData('00'.repeat(32))).toBe(16)
  })

  it('memoizes normalized preview metadata without changing glyph data', () => {
    const glyph = { codePoint: '41', hexValue: `80${'00'.repeat(15)}` }
    const first = prepareGlyphPreview(glyph)
    const second = prepareGlyphPreview(glyph)
    expect(first).toBe(second)
    expect(first).toMatchObject({ character: 'A', codePoint: '0041', width: 8 })
    expect(glyph).toEqual({ codePoint: '41', hexValue: `80${'00'.repeat(15)}` })
    expect(glyphCharacter('110000')).toBe('\uFFFD')
  })

  it('uses changed hexadecimal data as a distinct preview cache key', () => {
    const first = prepareGlyphPreview({
      codePoint: '0041',
      hexValue: `80${'00'.repeat(15)}`,
    })
    const updated = prepareGlyphPreview({
      codePoint: '0041',
      hexValue: `40${'00'.repeat(15)}`,
    })
    expect(updated).not.toBe(first)
    expect(updated.path).not.toBe(first.path)
  })

  it.each([100, 1_000, 5_000])(
    'prepares %i stable previews without per-cell reactive state',
    (count) => {
      const source = Array.from({ length: count }, (_, index) => ({
        codePoint: (0x100 + index).toString(16).toUpperCase(),
        hexValue: index % 2 === 0 ? 'AA'.repeat(16) : '55'.repeat(32),
      }))
      const started = performance.now()
      const previews = sortGlyphsByCodePoint(source).map(prepareGlyphPreview)
      expect(previews).toHaveLength(count)
      expect(new Set(previews.map((preview) => preview.codePoint)).size).toBe(
        count,
      )
      expect(performance.now() - started).toBeLessThan(3_000)
    },
  )
})
