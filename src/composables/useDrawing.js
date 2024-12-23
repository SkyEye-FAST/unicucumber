import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useDrawing(props, emit) {
  const isDrawing = ref(false)
  const hoverCell = ref({ row: -1, col: -1 })

  onMounted(() => {
    document.addEventListener('mouseup', stopDrawing)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mouseup', stopDrawing)
  })

  const startDrawing = (rowIndex, cellIndex, event) => {
    isDrawing.value = true
    const value =
      props.drawMode === 'doubleButtonDraw'
        ? event.button === 2
          ? 0
          : 1
        : props.drawValue
    updateCell(rowIndex, cellIndex, value)
  }

  const stopDrawing = () => {
    isDrawing.value = false
  }

  const handleHover = (rowIndex, cellIndex) => {
    if (isDrawing.value) {
      updateCell(rowIndex, cellIndex, props.drawValue)
    } else {
      hoverCell.value = { row: rowIndex, col: cellIndex }
    }
  }

  const clearHover = () => {
    hoverCell.value = { row: -1, col: -1 }
  }

  const updateCell = (rowIndex, cellIndex, value) => {
    emit('update:cell', rowIndex, cellIndex, value)
  }

  const getCellIndex = (target) => {
    const cellIndex = Array.from(target.parentNode.children).indexOf(target) - 1
    const rowIndex =
      Array.from(target.parentNode.parentNode.children).indexOf(
        target.parentNode,
      ) - 1
    return { rowIndex, cellIndex }
  }

  const handleTouchStart = (event) => {
    const touch = event.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    if (target?.classList.contains('cell')) {
      const { rowIndex, cellIndex } = getCellIndex(target)
      startDrawing(rowIndex, cellIndex, event)
    }
  }

  const handleTouchMove = (event) => {
    const touch = event.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    if (target?.classList.contains('cell')) {
      const { rowIndex, cellIndex } = getCellIndex(target)
      if (rowIndex >= 0 && cellIndex >= 0) {
        updateCell(rowIndex, cellIndex, props.drawValue)
      }
    }
  }

  return {
    isDrawing,
    hoverCell,
    startDrawing,
    stopDrawing,
    handleHover,
    clearHover,
    handleTouchStart,
    handleTouchMove,
  }
}
