import { describe, expect, it } from 'vitest'

import {
  clampSelectionPosition,
  normalizeSelectionRectangle,
} from './selection'

describe('selection geometry', () => {
  it('normalizes reverse selection rectangles', () => {
    expect(
      normalizeSelectionRectangle({
        startRow: 7,
        startCol: 6,
        endRow: 2,
        endCol: 1,
      }),
    ).toEqual({
      startRow: 2,
      startCol: 1,
      endRow: 7,
      endCol: 6,
    })
  })

  it('clamps movement to the grid bounds', () => {
    expect(clampSelectionPosition({ row: -2, col: 99 }, 3, 4, 8, 16)).toEqual({
      row: 0,
      col: 5,
    })
  })
})
