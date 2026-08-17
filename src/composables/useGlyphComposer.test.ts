import { describe, expect, it } from 'vitest'

import type { CompositionDocument, CompositionLayer } from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { createGrid } from '@/utils/hexUtils'

import { useGlyphComposer } from './useGlyphComposer'

const pixelGrid = (row: number, col: number): GridData => {
  const grid = createGrid(16)
  grid[row]![col] = 1
  return grid
}

const layer = (id: string, row = 0, col = 0): CompositionLayer => ({
  id,
  name: id,
  bitmap: pixelGrid(row, col),
  offsetX: 0,
  offsetY: 0,
  mask: null,
  operation: 'add',
  visible: true,
  locked: false,
})

const document = (layers: CompositionLayer[] = []): CompositionDocument => ({
  schemaVersion: 1,
  codePoint: '660E',
  width: 16,
  layers,
})

describe('useGlyphComposer', () => {
  it('keeps composition history independent and bounded', () => {
    const composer = useGlyphComposer(document(), 2)

    expect(composer.execute({ type: 'addLayer', layer: layer('a') })).toBe(true)
    expect(composer.execute({ type: 'addLayer', layer: layer('b') })).toBe(true)
    expect(composer.execute({ type: 'addLayer', layer: layer('c') })).toBe(true)

    expect(composer.history.value).toHaveLength(2)
    expect(composer.document.value.layers.map(({ id }) => id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(composer.canUndo.value).toBe(true)
    expect(composer.undo()).toBe(true)
    expect(composer.document.value.layers.map(({ id }) => id)).toEqual([
      'a',
      'b',
    ])
    expect(composer.redo()).toBe(true)
    expect(composer.document.value.layers.map(({ id }) => id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('keeps selection transient and outside document history', () => {
    const composer = useGlyphComposer(document([layer('a')]))
    const historyLength = composer.history.value.length

    composer.selectedLayerId.value = 'a'

    expect(composer.history.value).toHaveLength(historyLength)
    expect(composer.dirty.value).toBe(false)
  })

  it('tracks dirty state against saved content and truncates redo branches', () => {
    const composer = useGlyphComposer(document([layer('a')]))

    expect(composer.dirty.value).toBe(false)
    expect(
      composer.execute({ type: 'moveLayer', layerId: 'a', dx: 1, dy: 0 }),
    ).toBe(true)
    expect(composer.dirty.value).toBe(true)

    composer.markSaved()
    expect(composer.dirty.value).toBe(false)

    expect(composer.undo()).toBe(true)
    expect(composer.dirty.value).toBe(true)
    expect(composer.redo()).toBe(true)
    expect(composer.dirty.value).toBe(false)

    expect(composer.undo()).toBe(true)
    expect(
      composer.execute({ type: 'renameLayer', layerId: 'a', name: 'renamed' }),
    ).toBe(true)
    expect(composer.canRedo.value).toBe(false)
  })

  it('derives the composed result and ignores no-op commands', () => {
    const composer = useGlyphComposer(document([layer('a', 2, 3)]))
    const historyLength = composer.history.value.length

    expect(composer.resultGrid.value[2]?.[3]).toBe(1)
    expect(
      composer.execute({ type: 'moveLayer', layerId: 'missing', dx: 1, dy: 0 }),
    ).toBe(false)
    expect(composer.history.value).toHaveLength(historyLength)
  })

  it('resets to a new clean document without preserving transient selection', () => {
    const composer = useGlyphComposer(document([layer('a')]))
    composer.selectedLayerId.value = 'a'
    composer.execute({ type: 'moveLayer', layerId: 'a', dx: 1, dy: 0 })

    const next = document([layer('b', 4, 5)])
    composer.reset(next)

    expect(composer.document.value).toEqual(next)
    expect(composer.document.value).not.toBe(next)
    expect(composer.selectedLayerId.value).toBeNull()
    expect(composer.history.value).toHaveLength(1)
    expect(composer.dirty.value).toBe(false)
    expect(composer.canUndo.value).toBe(false)
    expect(composer.canRedo.value).toBe(false)
  })
})
