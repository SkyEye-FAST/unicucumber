import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useDrawing(props, emit) {
  const isDrawing = ref(false)
  const hoverCell = ref({ row: -1, col: -1 })
  const selectionStart = ref(null)
  const selectionEnd = ref(null)
  const isSelecting = ref(false)

  onMounted(() => {
    document.addEventListener('mouseup', stopDrawing)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mouseup', stopDrawing)
  })

  const startDrawing = (rowIndex, cellIndex, event) => {
    event.preventDefault()

    if (props.moveMode) {
      if (props.clipboardData?.data) {
        emit('move-to', rowIndex, cellIndex)
        return
      }
      return
    }

    if (props.drawValue === 2) {
      isSelecting.value = true
      selectionStart.value = { row: rowIndex, col: cellIndex }
      selectionEnd.value = { row: rowIndex, col: cellIndex }
      return
    }

    isSelecting.value = false
    selectionStart.value = null
    selectionEnd.value = null

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
    if (isSelecting.value) {
      isSelecting.value = false
      emit('selection-complete', selectionStart.value, selectionEnd.value)
    }
  }

  const handleHover = (rowIndex, cellIndex) => {
    if (isSelecting.value) {
      selectionEnd.value = { row: rowIndex, col: cellIndex }
      return
    }

    hoverCell.value = { row: rowIndex, col: cellIndex }
    if (isDrawing.value) {
      updateCell(rowIndex, cellIndex, props.drawValue)
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
    const target = document.elementFromPoint(touch.clientX, clientY)
    if (target?.classList.contains('cell')) {
      const { rowIndex, cellIndex } = getCellIndex(target)
      if (rowIndex >= 0 && cellIndex >= 0) {
        updateCell(rowIndex, cellIndex, props.drawValue)
      }
    }
  }

  const copySelection = () => {
    console.log('copySelection called with selection:', {
      start: selectionStart.value,
      end: selectionEnd.value,
    })

    if (!selectionStart.value || !selectionEnd.value) return null

    const minRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
    const maxRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
    const minCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
    const maxCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

    const selection = []
    for (let i = minRow; i <= maxRow; i++) {
      const row = []
      for (let j = minCol; j <= maxCol; j++) {
        row.push(props.gridData[i][j])
      }
      selection.push(row)
    }

    const result = {
      data: selection,
      position: { minRow, maxRow, minCol, maxCol },
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
    }
    console.log('copySelection result:', result)
    return result
  }

  const pasteSelection = (targetRow, targetCol, selection) => {
    console.log('pasteSelection called:', { targetRow, targetCol, selection })
    if (!selection?.data) return

    const { data } = selection

    if (
      targetRow + data.length > props.gridData.length ||
      targetCol + data[0].length > props.gridData[0].length
    ) {
      console.warn('Paste area exceeds grid boundaries')
      return
    }

    data.forEach((row, i) => {
      row.forEach((value, j) => {
        const newRow = targetRow + i
        const newCol = targetCol + j
        updateCell(newRow, newCol, value)
      })
    })

    selectionStart.value = { row: targetRow, col: targetCol }
    selectionEnd.value = {
      row: targetRow + data.length - 1,
      col: targetCol + data[0].length - 1,
    }

    emit('selection-complete', selectionStart.value, selectionEnd.value)
  }

  const moveSelection = () => {
    const copied = copySelection()
    if (!copied) return null

    const { minRow, maxRow, minCol, maxCol } = copied.position

    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        updateCell(i, j, 0)
      }
    }

    selectionStart.value = null
    selectionEnd.value = null
    isSelecting.value = false

    return copied
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
    selectionStart,
    selectionEnd,
    isSelecting,
    copySelection,
    pasteSelection,
    moveSelection,
  }
}
