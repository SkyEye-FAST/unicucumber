import { describe, expect, it } from 'vitest'

import { createSVGFromGrid, encodeBmp } from './exportUtils'
import { createGrid } from './hexUtils'

describe('verified glyph encoders', () => {
  it('writes a genuine 24-bit BMP header, dimensions and padded file size', async () => {
    const grid = createGrid(8)
    grid[0]![0] = 1
    const blob = encodeBmp(grid, { scale: 2 })
    expect(blob.type).toBe('image/bmp')
    const view = new DataView(await blob.arrayBuffer())
    expect(view.getUint8(0)).toBe(0x42)
    expect(view.getUint8(1)).toBe(0x4d)
    expect(view.getUint32(2, true)).toBe(blob.size)
    expect(view.getUint32(10, true)).toBe(54)
    expect(view.getUint32(14, true)).toBe(40)
    expect(view.getInt32(18, true)).toBe(16)
    expect(view.getInt32(22, true)).toBe(32)
    expect(view.getUint16(28, true)).toBe(24)
  })

  it('keeps SVG pixels crisp and supports transparent scaled output', () => {
    const grid = createGrid(8)
    grid[0]![0] = 1
    const svg = createSVGFromGrid(grid, { scale: 4, transparent: true })
    expect(svg).toContain('width="32"')
    expect(svg).toContain('height="64"')
    expect(svg).toContain('shape-rendering="crispEdges"')
    expect(svg).not.toContain('fill="#FFFFFF"')
  })
})
