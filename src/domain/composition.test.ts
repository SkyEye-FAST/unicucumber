import { describe, expect, it } from 'vitest'

import type { GridData } from '@/types/glyph'
import { createGrid } from '@/utils/hexUtils'

import type { CompositionLayer } from '@/types/composition'
import {
  applyCompositionCommand,
  combineCell,
  composeLayers,
  createCompositionDocument,
  translateLayerBitmap,
} from './composition'

const layer = (
  id: string,
  bitmap: GridData,
  overrides: Partial<CompositionLayer> = {},
): CompositionLayer => ({
  id,
  name: id,
  bitmap,
  offsetX: 0,
  offsetY: 0,
  mask: null,
  operation: 'add',
  visible: true,
  locked: false,
  ...overrides,
})

const pixelGrid = (row: number, col: number): GridData => {
  const grid = createGrid(16)
  grid[row]![col] = 1
  return grid
}

describe('glyph composition domain', () => {
  it.each([
    [0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0],
    [1, 0, 1, 1, 0],
    [1, 1, 1, 0, 1],
  ] as const)(
    'combines %i and %i with exact binary semantics',
    (base, current, add, subtract, intersect) => {
      expect(combineCell(base, current, 'add')).toBe(add)
      expect(combineCell(base, current, 'subtract')).toBe(subtract)
      expect(combineCell(base, current, 'intersect')).toBe(intersect)
    },
  )

  it('composes visible layers bottom-to-top', () => {
    const base = createGrid(16)
    base[1]![1] = 1
    base[1]![2] = 1
    const subtract = pixelGrid(1, 2)
    const addBack = pixelGrid(1, 2)

    const result = composeLayers([
      layer('base', base),
      layer('subtract', subtract, { operation: 'subtract' }),
      layer('hidden', pixelGrid(5, 5), { visible: false }),
      layer('add-back', addBack),
    ])

    expect(result[1]?.[1]).toBe(1)
    expect(result[1]?.[2]).toBe(1)
    expect(result[5]?.[5]).toBe(0)
  })

  it('keeps translation non-destructive while clipping the rendered layer', () => {
    const source = pixelGrid(0, 0)
    const translatedLayer = layer('translated', source, { offsetX: -1 })

    const rendered = translateLayerBitmap(translatedLayer)

    expect(rendered.flat().filter(Boolean)).toHaveLength(0)
    expect(translatedLayer.bitmap[0]?.[0]).toBe(1)
  })

  it('applies a local mask before translating the layer', () => {
    const bitmap = createGrid(16)
    bitmap[2]![2] = 1
    bitmap[2]![3] = 1
    const mask = createGrid(16)
    mask[2]![3] = 1

    const rendered = translateLayerBitmap(
      layer('masked', bitmap, { mask, offsetX: 1, offsetY: 2 }),
    )

    expect(rendered[4]?.[3]).toBe(0)
    expect(rendered[4]?.[4]).toBe(1)
  })

  it('creates a current-glyph layer only when the initial grid has pixels', () => {
    const empty = createCompositionDocument('660E', createGrid(16))
    expect(empty.layers).toEqual([])

    const initial = pixelGrid(3, 4)
    const populated = createCompositionDocument('660E', initial)
    expect(populated.layers).toHaveLength(1)
    expect(populated.layers[0]?.bitmap).toEqual(initial)
    expect(populated.layers[0]?.bitmap).not.toBe(initial)
  })

  it('duplicates bitmap and mask data instead of sharing mutable arrays', () => {
    const bitmap = pixelGrid(1, 1)
    const mask = pixelGrid(1, 1)
    const document = {
      schemaVersion: 1 as const,
      codePoint: '660E',
      width: 16 as const,
      layers: [layer('source', bitmap, { mask })],
    }

    const duplicated = applyCompositionCommand(document, {
      type: 'duplicateLayer',
      layerId: 'source',
    })

    expect(duplicated.layers).toHaveLength(2)
    const copy = duplicated.layers[1]!
    expect(copy.id).not.toBe('source')
    expect(copy.bitmap).toEqual(bitmap)
    expect(copy.bitmap).not.toBe(bitmap)
    expect(copy.mask).toEqual(mask)
    expect(copy.mask).not.toBe(mask)
  })

  it('rejects content-changing commands for locked layers', () => {
    const locked = layer('locked', pixelGrid(1, 1), { locked: true })
    const document = {
      schemaVersion: 1 as const,
      codePoint: '660E',
      width: 16 as const,
      layers: [locked],
    }

    expect(
      applyCompositionCommand(document, {
        type: 'moveLayer',
        layerId: 'locked',
        dx: 1,
        dy: 0,
      }),
    ).toBe(document)
    expect(
      applyCompositionCommand(document, {
        type: 'removeLayer',
        layerId: 'locked',
      }),
    ).toBe(document)
    expect(
      applyCompositionCommand(document, {
        type: 'setVisibility',
        layerId: 'locked',
        visible: false,
      }).layers[0]?.visible,
    ).toBe(false)
  })

  it('reorders unlocked layers without changing their content', () => {
    const first = layer('first', pixelGrid(0, 0))
    const second = layer('second', pixelGrid(1, 1))
    const third = layer('third', pixelGrid(2, 2))
    const document = {
      schemaVersion: 1 as const,
      codePoint: '660E',
      width: 16 as const,
      layers: [first, second, third],
    }

    const reordered = applyCompositionCommand(document, {
      type: 'reorderLayer',
      layerId: 'first',
      targetIndex: 2,
    })

    expect(reordered.layers.map(({ id }) => id)).toEqual([
      'second',
      'third',
      'first',
    ])
    expect(reordered.layers[2]?.bitmap).toEqual(first.bitmap)
  })
})
