import { describe, expect, it } from 'vitest'

import { prepareImageGrid } from './imageImport'

describe('mobile image preparation', () => {
  it('fits, thresholds, inverts and handles transparent pixels', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    data.set([0, 0, 0, 255], 0)
    data.set([0, 0, 0, 0], 4)
    const image = new ImageData(data, 4, 4)
    const grid = prepareImageGrid(image, {
      targetWidth: 8,
      mode: 'fit',
      threshold: 128,
      invert: false,
      transparentAsWhite: true,
    })
    expect(grid).toHaveLength(16)
    expect(grid[0]).toHaveLength(8)
    expect(grid.flat().some((cell) => cell === 1)).toBe(true)

    const inverted = prepareImageGrid(image, {
      targetWidth: 8,
      mode: 'crop',
      threshold: 128,
      invert: true,
      transparentAsWhite: false,
    })
    expect(inverted).not.toEqual(grid)
  })
})
