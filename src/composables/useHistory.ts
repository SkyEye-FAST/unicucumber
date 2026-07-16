import { computed, ref, type ComputedRef, type Ref } from 'vue'

import type { GridData } from '@/types/glyph'
import { deepCloneGrid } from '@/utils/hexUtils'

export type HistoryAction =
  | 'initial'
  | 'draw'
  | 'erase'
  | 'clear-grid'
  | 'paste'
  | 'cut'
  | 'move-selection'
  | 'replace-glyph'

export interface HistoryEntry {
  grid: GridData
  action: HistoryAction
}

export interface HistoryState {
  history: Ref<HistoryEntry[]>
  currentIndex: Ref<number>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  pushState: (
    newState: GridData,
    action: Exclude<HistoryAction, 'initial'>,
  ) => void
  undo: () => GridData | null
  redo: () => GridData | null
  reset: (newState: GridData, action?: HistoryAction) => void
  getLastAction: () => HistoryAction | null
  getCurrentState: () => GridData | null
}

export function useHistory(initialState: GridData): HistoryState {
  const history = ref<HistoryEntry[]>([])
  const currentIndex = ref(-1)
  const canUndo = computed(() => currentIndex.value > 0)
  const canRedo = computed(
    () =>
      currentIndex.value >= 0 && currentIndex.value < history.value.length - 1,
  )

  const reset = (newState: GridData, action: HistoryAction = 'initial') => {
    history.value = [{ grid: deepCloneGrid(newState), action }]
    currentIndex.value = 0
  }

  const pushState = (
    newState: GridData,
    action: Exclude<HistoryAction, 'initial'>,
  ) => {
    const current = history.value[currentIndex.value]
    if (
      current !== undefined &&
      JSON.stringify(current.grid) === JSON.stringify(newState)
    )
      return
    history.value = history.value.slice(0, currentIndex.value + 1)
    history.value.push({ grid: deepCloneGrid(newState), action })
    currentIndex.value = history.value.length - 1
  }

  const undo = (): GridData | null => {
    if (!canUndo.value) return null
    currentIndex.value -= 1
    const entry = history.value[currentIndex.value]
    return entry === undefined ? null : deepCloneGrid(entry.grid)
  }

  const redo = (): GridData | null => {
    if (!canRedo.value) return null
    currentIndex.value += 1
    const entry = history.value[currentIndex.value]
    return entry === undefined ? null : deepCloneGrid(entry.grid)
  }

  const getLastAction = (): HistoryAction | null =>
    history.value[currentIndex.value]?.action ?? null
  const getCurrentState = (): GridData | null => {
    const entry = history.value[currentIndex.value]
    return entry === undefined ? null : deepCloneGrid(entry.grid)
  }

  reset(initialState)
  return {
    history,
    currentIndex,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    reset,
    getLastAction,
    getCurrentState,
  }
}
