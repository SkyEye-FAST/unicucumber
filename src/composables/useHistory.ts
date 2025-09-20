import { ref, type Ref } from 'vue'
import { deepCloneGrid } from '@/utils/hexUtils'

interface HistoryEntry<T extends number[][]> {
  grid: number[][]
  action: string
}

interface HistoryState<T extends number[][]> {
  history: Ref<HistoryEntry<T>[]>
  currentIndex: Ref<number>
  pushState: (newState: T, action: string) => void
  undo: () => T | null
  redo: () => T | null
  canUndo: () => boolean
  canRedo: () => boolean
  resetHistory: (newState: T) => void
  clearHistory: () => void
  initHistory: (newState: T) => void
  clearAndInitHistory: (newState: T) => void
  getLastAction: () => string | null
  getCurrentState: () => T | null
}

export function useHistory<T extends number[][]>(
  initialState: T,
): HistoryState<T> {
  const history = ref<HistoryEntry<T>[]>([
    {
      grid: deepCloneGrid(initialState),
      action: 'initial',
    },
  ])
  const currentIndex = ref(0)

  const pushState = (newState: T, action: string) => {
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
      return deepCloneGrid(history.value[currentIndex.value]?.grid ?? []) as T
    }
    return null
  }

  const redo = () => {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return deepCloneGrid(
        (history.value[currentIndex.value]?.grid ?? []) as number[][],
      ) as T
    }
    return null
  }

  const canUndo = () => currentIndex.value > 0
  const canRedo = () => currentIndex.value < history.value.length - 1

  const resetHistory = (newState: T) => {
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

  const initHistory = (newState: T) => {
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'initial',
      },
    ]
    currentIndex.value = 0
  }

  const clearAndInitHistory = (newState: T) => {
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
    ) as T
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
