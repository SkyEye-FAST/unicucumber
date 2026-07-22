import type { Glyph, GlyphWidth } from '@/types/glyph'

export interface GlyphLibraryPreview {
  character: string
  codePoint: string
  hexValue: string
  path: string
  width: GlyphWidth
}

const previewCache = new Map<string, GlyphLibraryPreview>()
const MAX_PREVIEW_CACHE_SIZE = 4096

export const glyphWidthFromData = (hexValue: string): GlyphWidth =>
  hexValue.length === 32 ? 8 : 16

export const formatGlyphCodePoint = (codePoint: string): string =>
  codePoint.trim().toUpperCase().padStart(4, '0')

export const glyphCharacter = (codePoint: string): string => {
  const value = Number.parseInt(codePoint, 16)
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return '\uFFFD'
  try {
    return String.fromCodePoint(value)
  } catch {
    return '\uFFFD'
  }
}

export const glyphDisplayCharacter = (codePoint: string): string => {
  const value = Number.parseInt(codePoint, 16)
  if (!Number.isFinite(value)) return '\uFFFD'
  if (value === 0x20) return '\u2420'
  if (value >= 0 && value <= 0x1f) return String.fromCodePoint(0x2400 + value)
  if (value === 0x7f) return '\u2421'
  return glyphCharacter(codePoint)
}

export const createGlyphBitmapPath = (
  hexValue: string,
  width: GlyphWidth,
): string => {
  const expectedLength = width === 8 ? 32 : 64
  if (hexValue.length !== expectedLength || !/^[0-9a-f]+$/i.test(hexValue)) {
    return ''
  }

  const commands: string[] = []
  for (let y = 0; y < 16; y += 1) {
    let runStart = -1
    for (let x = 0; x <= width; x += 1) {
      let filled = false
      if (x < width) {
        const linearIndex = y * width + x
        const nibble = Number.parseInt(
          hexValue.charAt(Math.floor(linearIndex / 4)),
          16,
        )
        filled = ((nibble >> (3 - (linearIndex % 4))) & 1) === 1
      }
      if (filled && runStart < 0) runStart = x
      if (!filled && runStart >= 0) {
        const runLength = x - runStart
        commands.push(`M${runStart} ${y}h${runLength}v1h-${runLength}z`)
        runStart = -1
      }
    }
  }
  return commands.join('')
}

export const prepareGlyphPreview = (glyph: Glyph): GlyphLibraryPreview => {
  const codePoint = formatGlyphCodePoint(glyph.codePoint)
  const cacheKey = `${codePoint}:${glyph.hexValue}`
  const cached = previewCache.get(cacheKey)
  if (cached) {
    previewCache.delete(cacheKey)
    previewCache.set(cacheKey, cached)
    return cached
  }

  const width = glyphWidthFromData(glyph.hexValue)
  const preview: GlyphLibraryPreview = {
    character: glyphDisplayCharacter(codePoint),
    codePoint,
    hexValue: glyph.hexValue,
    path: createGlyphBitmapPath(glyph.hexValue, width),
    width,
  }

  if (previewCache.size >= MAX_PREVIEW_CACHE_SIZE) {
    const oldestKey = previewCache.keys().next().value
    if (oldestKey) previewCache.delete(oldestKey)
  }
  previewCache.set(cacheKey, preview)
  return preview
}

export const sortGlyphsByCodePoint = (glyphs: Glyph[]): Glyph[] =>
  [...glyphs].sort(
    (left, right) =>
      Number.parseInt(left.codePoint, 16) -
      Number.parseInt(right.codePoint, 16),
  )
