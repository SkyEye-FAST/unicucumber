import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from 'fflate'

import type { Glyph } from '@/types/glyph'
import { isUnicodeScalarValue, normalizeCodePointHex } from '@/utils/charUtils'
import {
  canvasToBlob,
  createCanvasFromGrid,
  createSVGFromGrid,
  type RasterExportOptions,
} from '@/utils/exportUtils'
import { sortGlyphsByCodePoint } from '@/utils/glyphLibrary'
import { normalizeHex, requireHexGrid } from '@/utils/hexUtils'

export type BatchExportScope = 'saved' | 'selected' | 'filtered' | 'characters'
export type BatchExportFormat = 'hex' | 'svg' | 'png'
export interface BatchExportRequest {
  scope: BatchExportScope
  format: BatchExportFormat
  characters: string
  scale: number
  transparent: boolean
}

export const characterListCodePoints = (text: string): string[] => [
  ...new Set(
    Array.from(text.replaceAll(/[\r\n\t]/g, ''), (character) => {
      const value = character.codePointAt(0)!
      if (!isUnicodeScalarValue(value))
        throw new Error('Invalid Unicode character.')
      return value.toString(16).toUpperCase().padStart(4, '0')
    }),
  ),
]

const normalizeExportGlyphs = (glyphs: Glyph[]): Glyph[] => {
  if (!glyphs.length) throw new Error('No glyphs to export.')
  return sortGlyphsByCodePoint(
    glyphs.map((glyph) => {
      const codePoint = normalizeCodePointHex(glyph.codePoint)
      const hexValue = normalizeHex(glyph.hexValue)
      if (!codePoint || !hexValue) throw new Error('Invalid export glyph.')
      return { codePoint, hexValue }
    }),
  )
}

export const createHexExport = (glyphs: Glyph[]): string =>
  normalizeExportGlyphs(glyphs)
    .map(
      ({ codePoint, hexValue }) =>
        `${codePoint.padStart(codePoint.length > 4 ? 6 : 4, '0')}:${hexValue}`,
    )
    .join('\n')

export const createGlyphArchive = async (
  glyphs: Glyph[],
  format: 'svg' | 'png',
  options: RasterExportOptions = {},
): Promise<Blob> => {
  const sorted = normalizeExportGlyphs(glyphs)
  const chunks: ArrayBuffer[] = []
  let archiveError: Error | null = null
  const archive = new Zip((error, chunk) => {
    if (error) archiveError = error
    else chunks.push(new Uint8Array(chunk).buffer)
  })
  try {
    for (const [index, glyph] of sorted.entries()) {
      if (archiveError) throw archiveError
      const grid = requireHexGrid(glyph.hexValue)
      const content =
        format === 'svg'
          ? strToU8(createSVGFromGrid(grid, options))
          : new Uint8Array(
              await (
                await canvasToBlob(createCanvasFromGrid(grid, options))
              ).arrayBuffer(),
            )
      const filename = `U+${glyph.codePoint}.${format}`
      const file =
        format === 'svg'
          ? new ZipDeflate(filename, { level: 6 })
          : new ZipPassThrough(filename)
      archive.add(file)
      file.push(content, true)
      if (index % 50 === 49)
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    archive.end()
    if (archiveError) throw archiveError
    return new Blob(chunks, { type: 'application/zip' })
  } catch (error) {
    archive.terminate()
    throw error
  }
}
