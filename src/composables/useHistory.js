import { ref } from 'vue'
import { deepCloneGrid } from '@/utils/hexUtils'

export function useHistory(initialState) {
  const history = ref([deepCloneGrid(initialState)])
  const currentIndex = ref(0)

  const pushState = (newState) => {
    history.value = history.value.slice(0, currentIndex.value + 1)
    history.value.push(deepCloneGrid(newState))
    currentIndex.value++
  }

  const undo = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--
      return deepCloneGrid(history.value[currentIndex.value])
    }
    return null
  }

  const redo = () => {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return deepCloneGrid(history.value[currentIndex.value])
    }
    return null
  }

  const canUndo = () => currentIndex.value > 0
  const canRedo = () => currentIndex.value < history.value.length - 1

  const resetHistory = (newState) => {
    history.value = [deepCloneGrid(newState)]
    currentIndex.value = 0
  }

  const clearHistory = () => {
    history.value = []
    currentIndex.value = 0
  }

  const initHistory = (newState) => {
    clearHistory()
    history.value = [deepCloneGrid(newState)]
    currentIndex.value = 0
  }

  const clearAndInitHistory = (newState) => {
    history.value = []
    currentIndex.value = 0
    history.value = [deepCloneGrid(newState)]
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
  }
}
