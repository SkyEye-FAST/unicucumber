import type { GridCell, GridData } from '@/types/glyph'
import type {
  CompositionCommand,
  CompositionDocument,
  CompositionLayer,
  CompositionOperation,
} from '@/types/composition'
import { createGrid, deepCloneGrid } from '@/utils/hexUtils'

const COMPOSITION_SIZE = 16

const cloneLayer = (layer: CompositionLayer): CompositionLayer => ({
  ...layer,
  bitmap: deepCloneGrid(layer.bitmap),
  mask: layer.mask === null ? null : deepCloneGrid(layer.mask),
})

const replaceLayer = (
  document: CompositionDocument,
  index: number,
  layer: CompositionLayer,
): CompositionDocument => ({
  ...document,
  layers: document.layers.map((current, currentIndex) =>
    currentIndex === index ? layer : current,
  ),
})

const nextDuplicateId = (
  document: CompositionDocument,
  sourceId: string,
): string => {
  const used = new Set(document.layers.map(({ id }) => id))
  const base = `${sourceId}-copy`
  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

const isAllEnabledMask = (mask: GridData): boolean =>
  mask.length === COMPOSITION_SIZE &&
  mask.every(
    (row) => row.length === COMPOSITION_SIZE && row.every((cell) => cell === 1),
  )

export const combineCell = (
  base: GridCell,
  current: GridCell,
  operation: CompositionOperation,
): GridCell => {
  switch (operation) {
    case 'add':
      return base === 1 || current === 1 ? 1 : 0
    case 'subtract':
      return base === 1 && current === 0 ? 1 : 0
    case 'intersect':
      return base === 1 && current === 1 ? 1 : 0
  }
}

export const translateLayerBitmap = (layer: CompositionLayer): GridData => {
  const translated = createGrid(COMPOSITION_SIZE)
  if (
    !Number.isSafeInteger(layer.offsetX) ||
    !Number.isSafeInteger(layer.offsetY)
  ) {
    return translated
  }

  for (let row = 0; row < COMPOSITION_SIZE; row += 1) {
    for (let col = 0; col < COMPOSITION_SIZE; col += 1) {
      if (layer.bitmap[row]?.[col] !== 1) continue
      if (layer.mask !== null && layer.mask[row]?.[col] !== 1) continue

      const targetRow = row + layer.offsetY
      const targetCol = col + layer.offsetX
      if (
        targetRow < 0 ||
        targetRow >= COMPOSITION_SIZE ||
        targetCol < 0 ||
        targetCol >= COMPOSITION_SIZE
      ) {
        continue
      }
      translated[targetRow]![targetCol] = 1
    }
  }

  return translated
}

export const composeLayers = (
  layers: readonly CompositionLayer[],
): GridData => {
  let result = createGrid(COMPOSITION_SIZE)

  for (const layer of layers) {
    if (!layer.visible) continue
    const effective = translateLayerBitmap(layer)
    result = result.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        combineCell(
          cell,
          effective[rowIndex]?.[colIndex] ?? 0,
          layer.operation,
        ),
      ),
    )
  }

  return result
}

export const createCompositionDocument = (
  codePoint: string,
  initialGrid?: GridData,
): CompositionDocument => {
  const hasInitialPixels =
    initialGrid?.some((row) => row.some(Boolean)) ?? false

  return {
    schemaVersion: 1,
    codePoint,
    width: 16,
    layers:
      initialGrid !== undefined && hasInitialPixels
        ? [
            {
              id: 'current-glyph',
              name: 'Current glyph',
              bitmap: deepCloneGrid(initialGrid),
              offsetX: 0,
              offsetY: 0,
              mask: null,
              operation: 'add',
              visible: true,
              locked: false,
            },
          ]
        : [],
  }
}

export const applyCompositionCommand = (
  document: CompositionDocument,
  command: CompositionCommand,
): CompositionDocument => {
  if (command.type === 'addLayer') {
    if (document.layers.some(({ id }) => id === command.layer.id))
      return document
    return {
      ...document,
      layers: [...document.layers, cloneLayer(command.layer)],
    }
  }

  const index = document.layers.findIndex(({ id }) => id === command.layerId)
  if (index < 0) return document
  const layer = document.layers[index]!

  switch (command.type) {
    case 'removeLayer':
      if (layer.locked) return document
      return {
        ...document,
        layers: document.layers.filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      }

    case 'duplicateLayer': {
      const duplicate = cloneLayer(layer)
      duplicate.id = nextDuplicateId(document, layer.id)
      return {
        ...document,
        layers: [
          ...document.layers.slice(0, index + 1),
          duplicate,
          ...document.layers.slice(index + 1),
        ],
      }
    }

    case 'renameLayer':
      if (layer.locked || layer.name === command.name) return document
      return replaceLayer(document, index, { ...layer, name: command.name })

    case 'moveLayer': {
      if (
        layer.locked ||
        !Number.isSafeInteger(command.dx) ||
        !Number.isSafeInteger(command.dy) ||
        (command.dx === 0 && command.dy === 0)
      ) {
        return document
      }
      const offsetX = layer.offsetX + command.dx
      const offsetY = layer.offsetY + command.dy
      if (!Number.isSafeInteger(offsetX) || !Number.isSafeInteger(offsetY)) {
        return document
      }
      return replaceLayer(document, index, { ...layer, offsetX, offsetY })
    }

    case 'reorderLayer': {
      if (layer.locked || !Number.isInteger(command.targetIndex))
        return document
      const targetIndex = Math.max(
        0,
        Math.min(document.layers.length - 1, command.targetIndex),
      )
      if (targetIndex === index) return document
      const layers = [...document.layers]
      layers.splice(index, 1)
      layers.splice(targetIndex, 0, layer)
      return { ...document, layers }
    }

    case 'setOperation':
      if (layer.locked || layer.operation === command.operation) return document
      return replaceLayer(document, index, {
        ...layer,
        operation: command.operation,
      })

    case 'setVisibility':
      if (layer.visible === command.visible) return document
      return replaceLayer(document, index, {
        ...layer,
        visible: command.visible,
      })

    case 'setLocked':
      if (layer.locked === command.locked) return document
      return replaceLayer(document, index, { ...layer, locked: command.locked })

    case 'replaceMask': {
      if (layer.locked) return document
      const mask =
        command.mask === null || isAllEnabledMask(command.mask)
          ? null
          : deepCloneGrid(command.mask)
      if (layer.mask === null && mask === null) return document
      return replaceLayer(document, index, { ...layer, mask })
    }

    case 'replaceBitmap':
      if (layer.locked) return document
      return replaceLayer(document, index, {
        ...layer,
        bitmap: deepCloneGrid(command.bitmap),
      })
  }
}
