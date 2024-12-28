import { ref } from 'vue'

export function useGridData(initialWidth = 16) {
  const createEmptyGrid = (width) => {
    return Array.from({ length: 16 }, () => Array(width).fill(0))
  }

  const gridData = ref(createEmptyGrid(initialWidth))

  const updateGrid = (newWidth) => {
    const newGrid = createEmptyGrid(newWidth)
    const minWidth = Math.min(newWidth, gridData.value[0].length)

    // 复制现有数据到新网格
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < minWidth; j++) {
        newGrid[i][j] = gridData.value[i][j]
      }
    }

    gridData.value = newGrid
  }

  const updateCell = (rowIndex, cellIndex, value) => {
    gridData.value[rowIndex][cellIndex] = value
  }

  const resetGrid = (width) => {
    gridData.value = createEmptyGrid(width ?? gridData.value[0].length)
  }

  return {
    gridData,
    updateCell,
    resetGrid,
    updateGrid
  }
}
