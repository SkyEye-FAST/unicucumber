import { ref, watch, type Ref } from 'vue'

interface GridDataType {
  value: number[][]
}

interface UseGridDataReturn {
  gridData: GridDataType
  resetGrid: (width?: number) => void
  updateGrid: (newSize: number) => void
}

export function useGridData(widthRef: Ref<number>): UseGridDataReturn {
  const gridData = ref<number[][]>([])

  const resetGrid = (width: number = 16): void => {
    const size = typeof width === 'number' ? width : 16
    gridData.value = Array.from({ length: 16 }, () => Array(size).fill(0))
  }

  const updateGrid = (newSize: number): void => {
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
