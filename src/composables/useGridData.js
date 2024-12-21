import { ref } from 'vue'

export function useGridData() {
  const gridData = ref(Array.from({ length: 16 }, () => Array(16).fill(0)))

  const updateCell = (rowIndex, cellIndex, value) => {
    gridData.value[rowIndex][cellIndex] = value
  }

  const resetGrid = () => {
    gridData.value = Array.from({ length: 16 }, () => Array(16).fill(0))
  }

  return {
    gridData,
    updateCell,
    resetGrid,
  }
}
