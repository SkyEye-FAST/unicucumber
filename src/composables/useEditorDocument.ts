import { computed, type ComputedRef, ref, type Ref } from 'vue'

import { applyEditorCommand, gridsEqual } from '@/domain/grid'
import type {
  EditorCommand,
  EditorDocumentSnapshot,
  EditorHistoryEntry,
} from '@/types/editor'
import type { GlyphWidth, GridData } from '@/types/glyph'
import { normalizeCodePointHex } from '@/utils/charUtils'
import { createGrid, deepCloneGrid, gridToHex } from '@/utils/hexUtils'

interface InitialEditorDocument {
  codePoint?: string
  width?: GlyphWidth
  grid?: GridData
  activeGlyphId?: string | null
}

interface EditorDocumentController {
  codePoint: Ref<string>
  width: Ref<GlyphWidth>
  grid: Ref<GridData>
  activeGlyphId: Ref<string | null>
  dirty: ComputedRef<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  history: Readonly<Ref<EditorHistoryEntry[]>>
  execute: (command: EditorCommand) => boolean
  undo: () => boolean
  redo: () => boolean
  load: (
    document: InitialEditorDocument,
    source?: string,
    markAsSaved?: boolean,
  ) => void
  markSaved: (activeGlyphId?: string | null) => void
  restoreSaved: () => boolean
  snapshot: () => EditorDocumentSnapshot
}

const cloneSnapshot = (
  snapshot: EditorDocumentSnapshot,
): EditorDocumentSnapshot => ({
  ...snapshot,
  grid: deepCloneGrid(snapshot.grid),
})

const snapshotFingerprint = (snapshot: EditorDocumentSnapshot): string =>
  [
    snapshot.activeGlyphId ?? '',
    snapshot.codePoint,
    snapshot.width,
    gridToHex(snapshot.grid),
  ].join('|')

export function useEditorDocument(
  initial: InitialEditorDocument = {},
  historyLimit = 100,
): EditorDocumentController {
  const initialWidth = initial.grid?.[0]?.length ?? initial.width ?? 16
  const width = ref<GlyphWidth>(initialWidth === 8 ? 8 : 16)
  const codePoint = ref(
    normalizeCodePointHex(initial.codePoint ?? '0000') ?? '0000',
  )
  const grid = ref<GridData>(
    initial.grid ? deepCloneGrid(initial.grid) : createGrid(width.value),
  )
  const activeGlyphId = ref<string | null>(initial.activeGlyphId ?? null)
  const history = ref<EditorHistoryEntry[]>([])
  const currentIndex = ref(-1)
  const savedFingerprint = ref('')
  const savedSnapshot = ref<EditorDocumentSnapshot | null>(null)

  const snapshot = (): EditorDocumentSnapshot => ({
    codePoint: codePoint.value,
    width: width.value,
    grid: deepCloneGrid(grid.value),
    activeGlyphId: activeGlyphId.value,
  })

  const applySnapshot = (next: EditorDocumentSnapshot): void => {
    codePoint.value = next.codePoint
    width.value = next.width
    grid.value = deepCloneGrid(next.grid)
    activeGlyphId.value = next.activeGlyphId
  }

  const pushEntry = (
    next: EditorDocumentSnapshot,
    command: EditorHistoryEntry['command'],
  ): void => {
    history.value = history.value.slice(0, currentIndex.value + 1)
    history.value.push({ snapshot: cloneSnapshot(next), command })
    if (history.value.length > historyLimit) history.value.shift()
    currentIndex.value = history.value.length - 1
    applySnapshot(next)
  }

  const load = (
    document: InitialEditorDocument,
    source = 'load',
    markAsSaved = true,
  ): void => {
    const nextWidth =
      document.grid?.[0]?.length ?? document.width ?? width.value
    const normalizedWidth: GlyphWidth = nextWidth === 8 ? 8 : 16
    const normalizedCodePoint =
      normalizeCodePointHex(document.codePoint ?? codePoint.value) ?? '0000'
    const next: EditorDocumentSnapshot = {
      codePoint: normalizedCodePoint,
      width: normalizedWidth,
      grid: document.grid
        ? deepCloneGrid(document.grid)
        : createGrid(normalizedWidth),
      activeGlyphId: document.activeGlyphId ?? null,
    }
    history.value = [
      {
        snapshot: cloneSnapshot(next),
        command: { type: 'loadDocument', source },
      },
    ]
    currentIndex.value = 0
    applySnapshot(next)
    if (markAsSaved) {
      savedSnapshot.value = cloneSnapshot(next)
      savedFingerprint.value = snapshotFingerprint(next)
    }
  }

  const execute = (command: EditorCommand): boolean => {
    const current = snapshot()
    let next = current

    if (command.type === 'setCodePoint') {
      const normalized = normalizeCodePointHex(command.codePoint)
      if (normalized === null || normalized === current.codePoint) return false
      next = { ...current, codePoint: normalized }
    } else {
      const nextGrid = applyEditorCommand(current.grid, command)
      if (gridsEqual(current.grid, nextGrid)) return false
      const nextWidth = nextGrid[0]?.length
      next = {
        ...current,
        grid: nextGrid,
        width: nextWidth === 8 ? 8 : 16,
      }
    }

    pushEntry(next, command)
    return true
  }

  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)

  const undo = (): boolean => {
    if (!canUndo.value) return false
    currentIndex.value -= 1
    const entry = history.value[currentIndex.value]
    if (!entry) return false
    applySnapshot(entry.snapshot)
    return true
  }

  const redo = (): boolean => {
    if (!canRedo.value) return false
    currentIndex.value += 1
    const entry = history.value[currentIndex.value]
    if (!entry) return false
    applySnapshot(entry.snapshot)
    return true
  }

  const markSaved = (nextActiveGlyphId = activeGlyphId.value): void => {
    activeGlyphId.value = nextActiveGlyphId
    const current = snapshot()
    const entry = history.value[currentIndex.value]
    if (entry) entry.snapshot = cloneSnapshot(current)
    savedFingerprint.value = snapshotFingerprint(current)
    savedSnapshot.value = cloneSnapshot(current)
  }

  const restoreSaved = (): boolean => {
    const saved = savedSnapshot.value
    if (
      !saved ||
      snapshotFingerprint(saved) === snapshotFingerprint(snapshot())
    ) {
      return false
    }
    pushEntry(saved, {
      type: 'replaceGrid',
      grid: deepCloneGrid(saved.grid),
      reason: 'restore',
    })
    return true
  }

  const dirty = computed(
    () => snapshotFingerprint(snapshot()) !== savedFingerprint.value,
  )

  load(initial, 'initial')

  return {
    codePoint,
    width,
    grid,
    activeGlyphId,
    dirty,
    canUndo,
    canRedo,
    history,
    execute,
    undo,
    redo,
    load,
    markSaved,
    restoreSaved,
    snapshot,
  }
}
