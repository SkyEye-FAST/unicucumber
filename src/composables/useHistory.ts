import { ref, type Ref } from 'vue'

import { deepCloneGrid } from '@/utils/hexUtils'

interface HistoryEntry {
  grid: number[][]
  action: string
}

interface HistoryState {
  history: Ref<HistoryEntry[]>
  currentIndex: Ref<number>
  pushState: (newState: number[][], action: string) => void
  undo: () => number[][] | null
  redo: () => number[][] | null
  canUndo: () => boolean
  canRedo: () => boolean
  resetHistory: (newState: number[][]) => void
  clearHistory: () => void
  initHistory: (newState: number[][]) => void
  clearAndInitHistory: (newState: number[][]) => void
  getLastAction: () => string | null
  getCurrentState: () => number[][] | null
}

export function useHistory(initialState: number[][]): HistoryState {
  const history = ref<HistoryEntry[]>([
    {
      grid: deepCloneGrid(initialState),
      action: 'initial',
    },
  ])
  const currentIndex = ref(0)

  const pushState = (newState: number[][], action: string) => {
    history.value = history.value.slice(0, currentIndex.value + 1)
    history.value.push({
      grid: deepCloneGrid(newState),
      action: action,
    })
    currentIndex.value++
  }

  const undo = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--
      return deepCloneGrid(
        history.value[currentIndex.value]?.grid ?? [],
      ) as number[][]
    }
    return null
  }

  const redo = () => {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return deepCloneGrid(
        (history.value[currentIndex.value]?.grid ?? []) as number[][],
      ) as number[][]
    }
    return null
  }

  const canUndo = () => currentIndex.value > 0
  const canRedo = () => currentIndex.value < history.value.length - 1

  const resetHistory = (newState: number[][]) => {
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'reset',
      },
    ]
    currentIndex.value = 0
  }

  const clearHistory = () => {
    history.value = []
    currentIndex.value = 0
  }

  const initHistory = (newState: number[][]) => {
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'initial',
      },
    ]
    currentIndex.value = 0
  }

  const clearAndInitHistory = (newState: number[][]) => {
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'initial',
      },
    ]
    currentIndex.value = 0
  }

  const getLastAction = () => {
    if (history.value.length === 0) return null
    return history.value[currentIndex.value]?.action ?? null
  }

  const getCurrentState = () => {
    if (history.value.length === 0) return null
    return deepCloneGrid(
      (history.value[currentIndex.value]?.grid ?? []) as number[][],
    ) as number[][]
  }

  return {
    history,
    currentIndex,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    clearHistory,
    initHistory,
    clearAndInitHistory,
    getLastAction,
    getCurrentState,
  }
}
