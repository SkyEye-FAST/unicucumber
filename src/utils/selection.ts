import type { GridPosition, SelectionRectangle } from '@/types/glyph'

export const normalizeSelectionRectangle = (
  rectangle: SelectionRectangle,
): SelectionRectangle => ({
  startRow: Math.min(rectangle.startRow, rectangle.endRow),
  startCol: Math.min(rectangle.startCol, rectangle.endCol),
  endRow: Math.max(rectangle.startRow, rectangle.endRow),
  endCol: Math.max(rectangle.startCol, rectangle.endCol),
})

export const clampSelectionPosition = (
  position: GridPosition,
  selectionWidth: number,
  selectionHeight: number,
  gridWidth: number,
  gridHeight: number,
): GridPosition => ({
  row: Math.max(0, Math.min(gridHeight - selectionHeight, position.row)),
  col: Math.max(0, Math.min(gridWidth - selectionWidth, position.col)),
})
