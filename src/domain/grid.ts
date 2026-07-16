import type {
  GridCell,
  GridData,
  GridPosition,
  SelectionRectangle,
} from '@/types/glyph'
import type { EditorCommand, ShiftDirection } from '@/types/editor'
import {
  clampSelectionPosition,
  normalizeSelectionRectangle,
} from '@/utils/selection'

import { createGrid, deepCloneGrid } from '@/utils/hexUtils'

export const gridsEqual = (left: GridData, right: GridData): boolean =>
  left.length === right.length &&
  left.every(
    (row, rowIndex) =>
      row.length === right[rowIndex]?.length &&
      row.every((cell, colIndex) => cell === right[rowIndex]?.[colIndex]),
  )

export const isGridPositionInBounds = (
  grid: GridData,
  position: GridPosition,
): boolean =>
  position.row >= 0 &&
  position.col >= 0 &&
  position.row < grid.length &&
  position.col < (grid[position.row]?.length ?? 0)

export const setGridCell = (
  grid: GridData,
  position: GridPosition,
  value: GridCell,
): GridData => {
  if (!isGridPositionInBounds(grid, position)) return grid
  if (grid[position.row]?.[position.col] === value) return grid

  const next = [...grid]
  next[position.row] = [...(grid[position.row] ?? [])]
  next[position.row]![position.col] = value
  return next
}

export const linePositions = (
  start: GridPosition,
  end: GridPosition,
): GridPosition[] => {
  const points: GridPosition[] = []
  let x = start.col
  let y = start.row
  const dx = Math.abs(end.col - start.col)
  const sx = start.col < end.col ? 1 : -1
  const dy = -Math.abs(end.row - start.row)
  const sy = start.row < end.row ? 1 : -1
  let error = dx + dy

  while (true) {
    points.push({ row: y, col: x })
    if (x === end.col && y === end.row) break
    const doubledError = error * 2
    if (doubledError >= dy) {
      error += dy
      x += sx
    }
    if (doubledError <= dx) {
      error += dx
      y += sy
    }
  }

  return points
}

export const applyStroke = (
  grid: GridData,
  points: readonly GridPosition[],
  value: GridCell,
): GridData => {
  let next = grid
  const visited = new Set<string>()
  for (const point of points) {
    const key = `${point.row}:${point.col}`
    if (visited.has(key)) continue
    visited.add(key)
    next = setGridCell(next, point, value)
  }
  return next
}

export const drawLine = (
  grid: GridData,
  start: GridPosition,
  end: GridPosition,
  value: GridCell,
): GridData => applyStroke(grid, linePositions(start, end), value)

const rectanglePositions = (
  start: GridPosition,
  end: GridPosition,
  filled: boolean,
): GridPosition[] => {
  const startRow = Math.min(start.row, end.row)
  const endRow = Math.max(start.row, end.row)
  const startCol = Math.min(start.col, end.col)
  const endCol = Math.max(start.col, end.col)
  const points: GridPosition[] = []

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (
        filled ||
        row === startRow ||
        row === endRow ||
        col === startCol ||
        col === endCol
      ) {
        points.push({ row, col })
      }
    }
  }
  return points
}

export const drawRectangle = (
  grid: GridData,
  start: GridPosition,
  end: GridPosition,
  value: GridCell,
  filled = false,
): GridData => applyStroke(grid, rectanglePositions(start, end, filled), value)

export const floodFill = (
  grid: GridData,
  origin: GridPosition,
  value: GridCell,
): GridData => {
  if (!isGridPositionInBounds(grid, origin)) return grid
  const target = grid[origin.row]?.[origin.col]
  if (target === undefined || target === value) return grid

  const next = deepCloneGrid(grid)
  const queue: GridPosition[] = [origin]
  let cursor = 0
  while (cursor < queue.length) {
    const position = queue[cursor++]!
    if (!isGridPositionInBounds(next, position)) continue
    if (next[position.row]?.[position.col] !== target) continue
    next[position.row]![position.col] = value
    queue.push(
      { row: position.row - 1, col: position.col },
      { row: position.row + 1, col: position.col },
      { row: position.row, col: position.col - 1 },
      { row: position.row, col: position.col + 1 },
    )
  }
  return next
}

export const invertGrid = (grid: GridData): GridData =>
  grid.map((row) => row.map((cell) => (cell === 1 ? 0 : 1)))

export const flipGridHorizontal = (grid: GridData): GridData =>
  grid.map((row) => [...row].reverse())

export const flipGridVertical = (grid: GridData): GridData =>
  [...grid].reverse().map((row) => [...row])

export const shiftGrid = (
  grid: GridData,
  direction: ShiftDirection,
  wrap = false,
): GridData => {
  const width = grid[0]?.length
  if (width !== 8 && width !== 16) return grid
  const height = grid.length
  const next = createGrid(width)
  const delta = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  }[direction]

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let targetRow = row + delta.row
      let targetCol = col + delta.col
      if (wrap) {
        targetRow = (targetRow + height) % height
        targetCol = (targetCol + width) % width
      }
      if (
        targetRow >= 0 &&
        targetRow < height &&
        targetCol >= 0 &&
        targetCol < width
      ) {
        next[targetRow]![targetCol] = grid[row]?.[col] ?? 0
      }
    }
  }
  return next
}

export const extractSelection = (
  grid: GridData,
  rectangle: SelectionRectangle,
): GridData => {
  const normalized = normalizeSelectionRectangle(rectangle)
  return Array.from(
    { length: normalized.endRow - normalized.startRow + 1 },
    (_, rowOffset) =>
      Array.from(
        { length: normalized.endCol - normalized.startCol + 1 },
        (_, colOffset) =>
          grid[normalized.startRow + rowOffset]?.[
            normalized.startCol + colOffset
          ] ?? 0,
      ),
  )
}

export const deleteSelection = (
  grid: GridData,
  rectangle: SelectionRectangle,
): GridData => {
  const normalized = normalizeSelectionRectangle(rectangle)
  const next = deepCloneGrid(grid)
  for (let row = normalized.startRow; row <= normalized.endRow; row++) {
    for (let col = normalized.startCol; col <= normalized.endCol; col++) {
      if (next[row]?.[col] !== undefined) next[row]![col] = 0
    }
  }
  return gridsEqual(grid, next) ? grid : next
}

export const pasteSelection = (
  grid: GridData,
  data: GridData,
  target: GridPosition,
): { grid: GridData; rectangle: SelectionRectangle } => {
  const gridHeight = grid.length
  const gridWidth = grid[0]?.length ?? 0
  const dataHeight = Math.min(data.length, gridHeight)
  const dataWidth = Math.min(data[0]?.length ?? 0, gridWidth)
  const position = clampSelectionPosition(
    target,
    dataWidth,
    dataHeight,
    gridWidth,
    gridHeight,
  )
  const next = deepCloneGrid(grid)

  for (let row = 0; row < dataHeight; row++) {
    for (let col = 0; col < dataWidth; col++) {
      next[position.row + row]![position.col + col] = data[row]?.[col] ?? 0
    }
  }

  return {
    grid: gridsEqual(grid, next) ? grid : next,
    rectangle: {
      startRow: position.row,
      startCol: position.col,
      endRow: position.row + Math.max(0, dataHeight - 1),
      endCol: position.col + Math.max(0, dataWidth - 1),
    },
  }
}

export const moveSelection = (
  grid: GridData,
  rectangle: SelectionRectangle,
  target: GridPosition,
): { grid: GridData; rectangle: SelectionRectangle } => {
  const normalized = normalizeSelectionRectangle(rectangle)
  const data = extractSelection(grid, normalized)
  const cleared = deleteSelection(grid, normalized)
  return pasteSelection(cleared, data, target)
}

export const applyEditorCommand = (
  grid: GridData,
  command: Exclude<EditorCommand, { type: 'setCodePoint' }>,
): GridData => {
  switch (command.type) {
    case 'setCell':
      return setGridCell(grid, command, command.value)
    case 'applyStroke':
      return applyStroke(grid, command.points, command.value)
    case 'fillRegion':
      return floodFill(grid, command.origin, command.value)
    case 'drawLine':
      return drawLine(grid, command.start, command.end, command.value)
    case 'drawRectangle':
      return drawRectangle(
        grid,
        command.start,
        command.end,
        command.value,
        command.mode === 'filled',
      )
    case 'replaceGrid':
      return deepCloneGrid(command.grid)
    case 'clearGrid': {
      const width = grid[0]?.length
      return width === 8 || width === 16 ? createGrid(width) : grid
    }
    case 'moveSelection':
      return moveSelection(grid, command.rectangle, command.target).grid
    case 'deleteSelection':
      return deleteSelection(grid, command.rectangle)
    case 'pasteSelection':
      return pasteSelection(grid, command.data, command.target).grid
    case 'invert':
      return invertGrid(grid)
    case 'flipHorizontal':
      return flipGridHorizontal(grid)
    case 'flipVertical':
      return flipGridVertical(grid)
    case 'shiftGrid':
      return shiftGrid(grid, command.direction, command.wrap)
  }
}
