import { describe, expect, it } from 'vitest'

import { createGlyphBackup, getBitmapSheetLayout } from './libraryExport'

describe('glyph-library exports', () => {
  it('creates a versioned, sorted backup with metadata', () => {
    const backup = createGlyphBackup(
      [
        { codePoint: '0042', hexValue: '0'.repeat(32) },
        { codePoint: '0041', hexValue: 'F'.repeat(32) },
      ],
      new Date('2026-01-02T03:04:05.000Z'),
    )
    expect(backup.schemaVersion).toBe(1)
    expect(backup.metadata.glyphCount).toBe(2)
    expect(backup.glyphs.map((glyph) => glyph.codePoint)).toEqual([
      '0041',
      '0042',
    ])
  })

  it('calculates a stable 16-column bitmap sheet layout', () => {
    expect(getBitmapSheetLayout(17, { scale: 2 })).toEqual({
      columns: 16,
      rows: 2,
      scale: 2,
      tileWidth: 32,
      tileHeight: 32,
    })
  })
})
