import { ref, watch } from 'vue'

export function useGridData(widthRef) {
  const gridData = ref([])

  const resetGrid = (width = 16) => {
    const size = typeof width === 'number' ? width : 16
    gridData.value = Array.from({ length: 16 }, () => Array(size).fill(0))
  }

  const updateGrid = (newSize) => {
    resetGrid(newSize)
  }

  watch(
    widthRef,
    (newWidth) => {
      updateGrid(newWidth)
    },
    { immediate: true },
  )

  return {
    gridData,
    resetGrid,
    updateGrid,
  }
}
