import { computed, type ComputedRef, ref, type Ref } from 'vue'

import { applyCompositionCommand, composeLayers } from '@/domain/composition'
import type {
  CompositionCommand,
  CompositionDocument,
  CompositionLayer,
} from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { deepCloneGrid } from '@/utils/hexUtils'

interface GlyphComposerController {
  document: Ref<CompositionDocument>
  resultGrid: ComputedRef<GridData>
  dirty: ComputedRef<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  history: Readonly<Ref<CompositionDocument[]>>
  selectedLayerId: Ref<string | null>
  execute: (command: CompositionCommand) => boolean
  undo: () => boolean
  redo: () => boolean
  reset: (document: CompositionDocument) => void
  markSaved: () => void
}

const cloneLayer = (layer: CompositionLayer): CompositionLayer => ({
  ...layer,
  bitmap: deepCloneGrid(layer.bitmap),
  mask: layer.mask === null ? null : deepCloneGrid(layer.mask),
})

const cloneDocument = (document: CompositionDocument): CompositionDocument => ({
  ...document,
  layers: document.layers.map(cloneLayer),
})

const fingerprint = (document: CompositionDocument): string =>
  JSON.stringify(document)

export function useGlyphComposer(
  initial: CompositionDocument,
  historyLimit = 100,
): GlyphComposerController {
  const maxHistory = Math.max(1, Math.trunc(historyLimit))
  const initialDocument = cloneDocument(initial)
  const document = ref<CompositionDocument>(initialDocument)
  const history = ref<CompositionDocument[]>([cloneDocument(initialDocument)])
  const currentIndex = ref(0)
  const savedFingerprint = ref(fingerprint(initialDocument))
  const selectedLayerId = ref<string | null>(null)

  const applySnapshot = (snapshot: CompositionDocument): void => {
    document.value = cloneDocument(snapshot)
  }

  const pushSnapshot = (snapshot: CompositionDocument): void => {
    const nextHistory = history.value.slice(0, currentIndex.value + 1)
    nextHistory.push(cloneDocument(snapshot))
    while (nextHistory.length > maxHistory) nextHistory.shift()
    history.value = nextHistory
    currentIndex.value = nextHistory.length - 1
    applySnapshot(snapshot)
  }

  const execute = (command: CompositionCommand): boolean => {
    const next = applyCompositionCommand(document.value, command)
    if (next === document.value) return false
    pushSnapshot(next)
    return true
  }

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  const undo = (): boolean => {
    if (!canUndo.value) return false
    currentIndex.value -= 1
    const snapshot = history.value[currentIndex.value]
    if (!snapshot) return false
    applySnapshot(snapshot)
    return true
  }

  const redo = (): boolean => {
    if (!canRedo.value) return false
    currentIndex.value += 1
    const snapshot = history.value[currentIndex.value]
    if (!snapshot) return false
    applySnapshot(snapshot)
    return true
  }

  const reset = (next: CompositionDocument): void => {
    const snapshot = cloneDocument(next)
    history.value = [cloneDocument(snapshot)]
    currentIndex.value = 0
    applySnapshot(snapshot)
    selectedLayerId.value = null
    savedFingerprint.value = fingerprint(snapshot)
  }

  const markSaved = (): void => {
    savedFingerprint.value = fingerprint(document.value)
  }

  const resultGrid = computed(() => composeLayers(document.value.layers))
  const dirty = computed(
    () => fingerprint(document.value) !== savedFingerprint.value,
  )

  return {
    document,
    resultGrid,
    dirty,
    canUndo,
    canRedo,
    history,
    selectedLayerId,
    execute,
    undo,
    redo,
    reset,
    markSaved,
  }
}
