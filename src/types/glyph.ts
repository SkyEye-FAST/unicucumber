export interface Glyph {
  codePoint: string
  hexValue: string
}

export interface PrefillData extends Glyph {
  [key: string]: any
}

export interface UnifontMapType {
  [key: number]: string
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
  onGlyphChange: (glyphs: Glyph[]) => void
  prefillData?: PrefillData | null
}

export interface GlyphManagerEmits {
  (e: 'edit-in-grid', hexValue: string, glyph?: Glyph): void
  (e: 'clear-prefill'): void
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
  unifontMap?: UnifontMapType
  editMode?: boolean
  duplicateGlyph?: Glyph | null
}
