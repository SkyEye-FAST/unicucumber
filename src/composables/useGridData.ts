import { ref, watch, type Ref } from 'vue'

export type GridDataType = number[][]

interface UseGridDataReturn {
  gridData: Ref<GridDataType>
  resetGrid: (width?: number) => void
  updateGrid: (newSize: number) => void
}

export function useGridData(widthRef: Ref<number>): UseGridDataReturn {
  const gridData = ref<number[][]>([])

  const resetGrid = (width: number = 16): void => {
    const size = typeof width === 'number' ? width : 16
    const newGrid = Array.from({ length: 16 }, () => Array(size).fill(0))
    gridData.value = newGrid
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
