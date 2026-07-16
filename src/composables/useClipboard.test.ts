import { describe, expect, it } from 'vitest'

import { useClipboard } from './useClipboard'

describe('clipboard selection data', () => {
  it('copies, validates bounds, and returns an isolated paste payload', () => {
    const clipboard = useClipboard()
    clipboard.copy({
      data: [
        [1, 0],
        [0, 1],
      ],
      width: 2,
      height: 2,
      originalRect: { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    })

    expect(clipboard.canPasteAt({ row: 14, col: 6 }, 8, 16)).toBe(true)
    expect(clipboard.canPasteAt({ row: 15, col: 6 }, 8, 16)).toBe(false)
    const payload = clipboard.getPasteData({ row: 3, col: 4 })
    payload?.data[0]?.fill(0)
    expect(clipboard.getPasteData({ row: 3, col: 4 })?.data[0]).toEqual([1, 0])
  })
})
