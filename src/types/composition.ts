import type { GridData } from './glyph'

export type CompositionOperation = 'add' | 'subtract' | 'intersect'

export interface CompositionLayer {
  id: string
  name: string
  bitmap: GridData
  offsetX: number
  offsetY: number
  mask: GridData | null
  operation: CompositionOperation
  visible: boolean
  locked: boolean
  componentId?: string
}

export interface CompositionDocument {
  schemaVersion: 1
  codePoint: string
  width: 16
  layers: CompositionLayer[]
}

export interface CompositionDataManifest {
  schemaVersion: 1
  dataVersion: string
  componentCount: number
  idsCount: number
  componentChunkFormat: 1
  idsChunkFormat: 1
}

export interface CompositionComponentSummary {
  id: string
  characters: string[]
  bounds: [left: number, top: number, right: number, bottom: number]
  chunk: string
}

export interface CompositionComponentRecord extends CompositionComponentSummary {
  hex: string
}

export type CompositionIdsChunk = Record<string, string[]>

export type CompositionCommand =
  | { type: 'addLayer'; layer: CompositionLayer }
  | { type: 'removeLayer'; layerId: string }
  | { type: 'duplicateLayer'; layerId: string }
  | { type: 'renameLayer'; layerId: string; name: string }
  | { type: 'moveLayer'; layerId: string; dx: number; dy: number }
  | { type: 'reorderLayer'; layerId: string; targetIndex: number }
  | {
      type: 'setOperation'
      layerId: string
      operation: CompositionOperation
    }
  | { type: 'setVisibility'; layerId: string; visible: boolean }
  | { type: 'setLocked'; layerId: string; locked: boolean }
  | { type: 'replaceMask'; layerId: string; mask: GridData | null }
  | {
      type: 'replaceBitmap'
      layerId: string
      bitmap: GridData
      reason: 'transform' | 'component-reset'
    }
