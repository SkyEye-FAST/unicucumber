import type { Glyph } from '@/types/glyph'
import { hexToGrid } from '@/utils/hexUtils'

export interface GlyphBackup {
  schemaVersion: 1
  exportedAt: string
  generator: 'UniCucumber'
  metadata: { glyphCount: number; format: 'unifont-hex' }
  glyphs: Glyph[]
}

export interface BitmapSheetOptions {
  columns?: number
  scale?: number
}

export const sortGlyphs = (glyphs: Glyph[]): Glyph[] =>
  [...glyphs].sort(
    (a, b) => parseInt(a.codePoint, 16) - parseInt(b.codePoint, 16),
  )

export const createGlyphBackup = (
  glyphs: Glyph[],
  now = new Date(),
): GlyphBackup => ({
  schemaVersion: 1,
  exportedAt: now.toISOString(),
  generator: 'UniCucumber',
  metadata: { glyphCount: glyphs.length, format: 'unifont-hex' },
  glyphs: sortGlyphs(glyphs).map((glyph) => ({ ...glyph })),
})

export const getBitmapSheetLayout = (
  glyphCount: number,
  options: BitmapSheetOptions = {},
): {
  columns: number
  rows: number
  scale: number
  tileWidth: number
  tileHeight: number
} => {
  const columns = Math.max(1, Math.min(64, Math.round(options.columns ?? 16)))
  const scale = Math.max(1, Math.min(16, Math.round(options.scale ?? 2)))
  return {
    columns,
    rows: Math.max(1, Math.ceil(glyphCount / columns)),
    scale,
    tileWidth: 16 * scale,
    tileHeight: 16 * scale,
  }
}

export const createBitmapSheet = (
  glyphs: Glyph[],
  options: BitmapSheetOptions = {},
): HTMLCanvasElement => {
  const sorted = sortGlyphs(glyphs)
  const layout = getBitmapSheetLayout(sorted.length, options)
  const canvas = document.createElement('canvas')
  canvas.width = layout.columns * layout.tileWidth
  canvas.height = layout.rows * layout.tileHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create bitmap-sheet canvas.')
  context.imageSmoothingEnabled = false
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#000000'

  sorted.forEach((glyph, index) => {
    const grid = hexToGrid(glyph.hexValue)
    if (!grid) return
    const tileX = (index % layout.columns) * layout.tileWidth
    const tileY = Math.floor(index / layout.columns) * layout.tileHeight
    const contentWidth = (grid[0]?.length ?? 0) * layout.scale
    const offsetX = tileX + Math.floor((layout.tileWidth - contentWidth) / 2)
    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          context.fillRect(
            offsetX + colIndex * layout.scale,
            tileY + rowIndex * layout.scale,
            layout.scale,
            layout.scale,
          )
        }
      })
    })
  })
  return canvas
}
