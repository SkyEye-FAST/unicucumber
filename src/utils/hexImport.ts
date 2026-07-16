import type { Glyph } from '@/types/glyph'
import { normalizeCodePointHex } from './charUtils'
import { normalizeHex } from './hexUtils'

export interface HexImportError {
  line: number
  content: string
  reason: 'missing-separator' | 'invalid-code-point' | 'invalid-glyph-data'
}

export interface HexImportResult {
  glyphs: Glyph[]
  errors: HexImportError[]
}

export const parseHexFile = (text: string): HexImportResult => {
  const glyphs = new Map<string, Glyph>()
  const errors: HexImportError[] = []
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)

  lines.forEach((rawLine, index) => {
    const content = rawLine.trim()
    if (!content || content.startsWith('#')) return
    const separator = content.indexOf(':')
    if (separator <= 0 || separator === content.length - 1) {
      errors.push({
        line: index + 1,
        content: rawLine,
        reason: 'missing-separator',
      })
      return
    }
    const codePoint = normalizeCodePointHex(content.slice(0, separator))
    if (codePoint === null) {
      errors.push({
        line: index + 1,
        content: rawLine,
        reason: 'invalid-code-point',
      })
      return
    }
    const hexValue = normalizeHex(content.slice(separator + 1))
    if (hexValue === null) {
      errors.push({
        line: index + 1,
        content: rawLine,
        reason: 'invalid-glyph-data',
      })
      return
    }
    glyphs.set(codePoint, { codePoint, hexValue })
  })

  return { glyphs: [...glyphs.values()], errors }
}
