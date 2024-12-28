import { ref } from 'vue'

const deepCloneGrid = (grid) => {
  return grid.map((row) => [...row])
}

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

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
