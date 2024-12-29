import { ref, watch } from 'vue'

const EDITOR_STORAGE_KEY = 'unicucumber_editor_data'

export function useGridData(initialWidth = 16) {
  const gridData = ref(
    Array.from({ length: 16 }, () => Array(initialWidth).fill(0)),
  )

  const loadStoredData = () => {
    try {
      const stored = localStorage.getItem(EDITOR_STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored)
        gridData.value = parsedData
      }
    } catch (error) {
      console.error('Error loading editor data:', error)
    }
  }

  const saveGridData = (data) => {
    try {
      localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving editor data:', error)
    }
  }

  const resetGrid = (width = initialWidth) => {
    gridData.value = Array.from({ length: 16 }, () => Array(width).fill(0))
    saveGridData(gridData.value)
  }

  const updateGrid = (width) => {
    if (width === gridData.value[0].length) return

    const newGrid = gridData.value.map((row) => {
      if (width > row.length) {
        return [...row, ...Array(width - row.length).fill(0)]
      }
      return row.slice(0, width)
    })

    gridData.value = newGrid
    saveGridData(newGrid)
  }

  watch(
    gridData,
    (newData) => {
      saveGridData(newData)
    },
    { deep: true },
  )

  loadStoredData()

  return {
    gridData,
    resetGrid,
    updateGrid,
  }
}
