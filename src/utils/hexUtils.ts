import type { GlyphWidth, GridCell, GridData } from '@/types/glyph'

export const GRID_HEIGHT = 16
const HEX_LENGTHS: Readonly<Record<GlyphWidth, number>> = { 8: 32, 16: 64 }

export class InvalidHexCodeError extends Error {
  constructor(hex: string) {
    super(
      `Expected a 32- or 64-character hexadecimal glyph, received ${hex.length} characters.`,
    )
    this.name = 'InvalidHexCodeError'
  }
}

export const getGlyphWidthFromHex = (hex: string): GlyphWidth | null => {
  if (!/^[\dA-Fa-f]+$/.test(hex)) return null
  if (hex.length === HEX_LENGTHS[8]) return 8
  if (hex.length === HEX_LENGTHS[16]) return 16
  return null
}

export const normalizeHex = (hex: string): string | null => {
  const trimmed = hex.trim()
  return getGlyphWidthFromHex(trimmed) === null ? null : trimmed.toUpperCase()
}

export const createGrid = (width: GlyphWidth): GridData =>
  Array.from({ length: GRID_HEIGHT }, () => Array<GridCell>(width).fill(0))

export const hexToGrid = (hex: string): GridData | null => {
  const normalized = normalizeHex(hex)
  if (normalized === null) return null

  const width = getGlyphWidthFromHex(normalized)
  if (width === null) return null
  const binary = Array.from(normalized, (character) =>
    Number.parseInt(character, 16).toString(2).padStart(4, '0'),
  ).join('')

  return Array.from({ length: GRID_HEIGHT }, (_, row) =>
    Array.from({ length: width }, (_, col) =>
      binary[row * width + col] === '1' ? 1 : 0,
    ),
  )
}

export const requireHexGrid = (hex: string): GridData => {
  const grid = hexToGrid(hex)
  if (grid === null) throw new InvalidHexCodeError(hex)
  return grid
}

export const deepCloneGrid = (grid: GridData): GridData =>
  grid.map((row) => [...row])

export const gridToHex = (grid: GridData): string => {
  if (grid.length !== GRID_HEIGHT || grid[0] === undefined) return ''
  const width = grid[0].length
  if (width !== 8 && width !== 16) return ''
  if (grid.some((row) => row.length !== width)) return ''

  const binary = grid
    .flat()
    .map((cell) => (cell === 1 ? '1' : '0'))
    .join('')
  return (
    binary
      .match(/.{1,4}/g)
      ?.map((bits) => Number.parseInt(bits, 2).toString(16).toUpperCase())
      .join('') ?? ''
  )
}
