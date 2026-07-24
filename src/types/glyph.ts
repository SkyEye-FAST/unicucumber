export interface Glyph {
  codePoint: string
  hexValue: string
}

export type GridCell = 0 | 1
export type GlyphWidth = 8 | 16
export type GridData = GridCell[][]
export type EditorTool =
  | 'draw'
  | 'erase'
  | 'select'
  | 'fill'
  | 'line'
  | 'rectangle'
  | 'filledRectangle'
  | 'pan'
export type DrawMode = 'singleButtonDraw' | 'doubleButtonDraw'
export type GlyphPreviewMode = 'pixelOnly' | 'browserOnly' | 'both'
export type GlyphLibraryDensity = 'compact' | 'comfortable' | 'large'
export type ExportScale = 1 | 2 | 4 | 8 | 16
export type ImageImportMode = 'fit' | 'crop'
export type AutoSaveInterval = 500 | 1000 | 3000 | 5000 | 10000
export type GlyphSourceFilter = 'all' | 'modified'
export type GlyphUnicodePlaneFilter = 'all' | `${number}`
export type GlyphUnicodeBlockFilter = 'all' | string

export interface GridPosition {
  row: number
  col: number
}

export interface SelectionRectangle {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface EditorSettings {
  glyphWidth: GlyphWidth
  drawMode: DrawMode
  alwaysShowMouseCursor: boolean
  showBorder: boolean
  confirmClear: boolean
  glyphPreviewMode: GlyphPreviewMode
  glyphLibraryDensity: GlyphLibraryDensity
  browserPreviewFont: string
  enableSelection: boolean
  exportScale: ExportScale
  exportTransparent: boolean
  imageImportMode: ImageImportMode
  imageImportThreshold: number
  imageImportTransparentAsWhite: boolean
  autoSaveEnabled: boolean
  autoSaveInterval: AutoSaveInterval
}

export interface PrefillData extends Glyph {
  [key: string]: unknown
}

export interface DialogConfig {
  show: boolean
  title: string
  message: string
  type: 'alert' | 'confirm' | 'list'
  items?: Glyph[]
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  danger?: boolean
  hexValue?: string
  width?: number
  displayMode?: string
  showProgress?: boolean
  progressCurrent?: number
  progressTotal?: number
  customButtons?: Array<{
    text: string
    action: string
    class?: string
  }>
  onConfirm: (selectedItems?: Glyph[]) => void
  onCancel?: () => void
}

export interface GlyphManagerProps {
  glyphs: Glyph[]
  libraryLoading?: boolean
  libraryLoaded?: boolean
  libraryError?: Error | null
  onGlyphChange: (glyphs: Glyph[]) => void | Promise<void>
  onRetryLoad?: () => void | Promise<unknown>
  prefillData?: PrefillData | null
  activeCodePoint?: string
}

export interface GlyphManagerEmits {
  (e: 'edit-in-grid', hexValue: string, glyph?: Glyph): void
  (e: 'clear-prefill'): void
  (e: 'saved', glyph: Glyph): void
}

export interface GlyphData {
  codePoint: string
  hexValue: string
}

export interface ImageWithDimensions extends HTMLImageElement {
  width: number
  height: number
}

export interface GlyphAdderProps {
  modelValue: GlyphData
  prefillData?: PrefillData | null
  editMode?: boolean
  duplicateGlyph?: Glyph | null
}
