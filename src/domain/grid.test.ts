import { describe, expect, it } from 'vitest'

import { createGrid } from '@/utils/hexUtils'

import {
  drawLine,
  drawRectangle,
  floodFill,
  flipGridHorizontal,
  flipGridVertical,
  invertGrid,
  moveSelection,
  pasteSelection,
  shiftGrid,
} from './grid'

describe('grid editing commands', () => {
  it('draws gap-free lines and rectangle variants', () => {
    const grid = createGrid(8)
    const line = drawLine(grid, { row: 0, col: 0 }, { row: 7, col: 3 }, 1)
    expect(line.flat().filter(Boolean)).toHaveLength(8)

    const outline = drawRectangle(
      grid,
      { row: 1, col: 1 },
      { row: 3, col: 4 },
      1,
    )
    expect(outline.flat().filter(Boolean)).toHaveLength(10)

    const filled = drawRectangle(
      grid,
      { row: 1, col: 1 },
      { row: 3, col: 4 },
      1,
      true,
    )
    expect(filled.flat().filter(Boolean)).toHaveLength(12)
  })

  it('flood fills a bounded region without crossing its border', () => {
    let grid = createGrid(8)
    grid = drawRectangle(grid, { row: 1, col: 1 }, { row: 5, col: 5 }, 1)
    const filled = floodFill(grid, { row: 2, col: 2 }, 1)
    expect(filled[3]?.[3]).toBe(1)
    expect(filled[0]?.[0]).toBe(0)
  })

  it('inverts, flips and clips shifts', () => {
    const grid = createGrid(8)
    grid[0]![0] = 1
    expect(invertGrid(grid)[0]?.[0]).toBe(0)
    expect(flipGridHorizontal(grid)[0]?.[7]).toBe(1)
    expect(flipGridVertical(grid)[15]?.[0]).toBe(1)
    expect(shiftGrid(grid, 'left').flat().filter(Boolean)).toHaveLength(0)
    expect(shiftGrid(grid, 'right')[0]?.[1]).toBe(1)
  })

  it('moves overlapping selections atomically and clamps them to bounds', () => {
    const grid = createGrid(8)
    grid[0]![0] = 1
    grid[0]![1] = 1
    grid[1]![0] = 1

    const moved = moveSelection(
      grid,
      { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      { row: 0, col: 1 },
    )
    expect(moved.grid[0]?.slice(0, 3)).toEqual([0, 1, 1])
    expect(moved.grid[1]?.slice(0, 3)).toEqual([0, 1, 0])

    const pasted = pasteSelection(grid, [[1, 1]], { row: 99, col: 99 })
    expect(pasted.rectangle).toEqual({
      startRow: 15,
      startCol: 6,
      endRow: 15,
      endCol: 7,
    })
  })
})
