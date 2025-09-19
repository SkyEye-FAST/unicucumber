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
  hexValue?: string // 添加DialogBox组件需要的属性
  width?: number // 添加DialogBox组件需要的属性
  displayMode?: string // 添加DialogBox组件可能需要的属性
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

// GlyphAdder组件的类型
export interface GlyphAdderProps {
  modelValue: GlyphData
  prefillData?: PrefillData | null
  unifontMap?: UnifontMapType
  editMode?: boolean
  duplicateGlyph?: Glyph | null
}
