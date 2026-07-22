import type {
  GlyphWidth,
  GridCell,
  GridData,
  GridPosition,
  SelectionRectangle,
} from './glyph'

export type ShiftDirection = 'up' | 'down' | 'left' | 'right'
export type RectangleMode = 'outline' | 'filled'
export type MobileAction =
  | 'paste'
  | 'invert'
  | 'flipHorizontal'
  | 'flipVertical'
  | 'restore'
  | 'clear'
  | `shift-${ShiftDirection}`

export interface CellUpdate extends GridPosition {
  value: GridCell
}

export type EditorCommand =
  | ({ type: 'setCell' } & CellUpdate)
  | {
      type: 'applyStroke'
      points: GridPosition[]
      value: GridCell
    }
  | {
      type: 'fillRegion'
      origin: GridPosition
      value: GridCell
    }
  | {
      type: 'drawLine'
      start: GridPosition
      end: GridPosition
      value: GridCell
    }
  | {
      type: 'drawRectangle'
      start: GridPosition
      end: GridPosition
      value: GridCell
      mode: RectangleMode
    }
  | {
      type: 'replaceGrid'
      grid: GridData
      reason: 'hex' | 'import' | 'restore' | 'load' | 'width-change'
    }
  | { type: 'clearGrid' }
  | {
      type: 'moveSelection'
      rectangle: SelectionRectangle
      target: GridPosition
    }
  | {
      type: 'deleteSelection'
      rectangle: SelectionRectangle
    }
  | {
      type: 'pasteSelection'
      data: GridData
      target: GridPosition
    }
  | { type: 'invert' }
  | { type: 'flipHorizontal' }
  | { type: 'flipVertical' }
  | {
      type: 'shiftGrid'
      direction: ShiftDirection
      wrap?: boolean
    }
  | { type: 'setCodePoint'; codePoint: string }

export interface EditorDocumentSnapshot {
  codePoint: string
  width: GlyphWidth
  grid: GridData
  activeGlyphId: string | null
}

export interface EditorHistoryEntry {
  snapshot: EditorDocumentSnapshot
  command: EditorCommand | { type: 'loadDocument'; source: string }
}
