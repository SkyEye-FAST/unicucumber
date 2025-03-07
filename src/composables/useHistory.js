import { ref } from 'vue'
import { deepCloneGrid } from '@/utils/hexUtils'

export function useHistory(initialState) {
  const history = ref([
    {
      grid: deepCloneGrid(initialState),
      action: 'initial',
    },
  ])
  const currentIndex = ref(0)

  const pushState = (newState, action) => {
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
      return deepCloneGrid(history.value[currentIndex.value].grid)
    }
    return null
  }

  const redo = () => {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return deepCloneGrid(history.value[currentIndex.value].grid)
    }
    return null
  }

  const canUndo = () => currentIndex.value > 0
  const canRedo = () => currentIndex.value < history.value.length - 1

  const resetHistory = (newState) => {
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

  const initHistory = (newState) => {
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'initial',
      },
    ]
    currentIndex.value = 0
  }

  const clearAndInitHistory = (newState) => {
    history.value = []
    currentIndex.value = 0
    history.value = [
      {
        grid: deepCloneGrid(newState),
        action: 'initial',
      },
    ]
  }

  const getLastAction = () => {
    if (history.value.length === 0) return null
    return history.value[currentIndex.value].action
  }

  const getCurrentState = () => {
    if (history.value.length === 0) return null
    return deepCloneGrid(history.value[currentIndex.value].grid)
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
