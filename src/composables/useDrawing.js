import { ref } from 'vue'

export function useDrawing(props, emit) {
  const isDrawing = ref(false)
  const buttonValue = ref(1)
  const hoverCell = ref({ row: -1, col: -1 })
  const selectionStart = ref(null)
  const selectionEnd = ref(null)
  const isSelecting = ref(false)
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const dragOffset = ref({ row: 0, col: 0 })
  const draggedData = ref(null)
  const drawBuffer = ref([]) // 存储一次绘制中的所有变化

  onMounted(() => {
    document.addEventListener('mouseup', stopDrawing)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', stopDragging)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mouseup', stopDrawing)
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', stopDragging)
  })

  const startDrawing = (rowIndex, cellIndex, event) => {
    event.preventDefault()
    event.stopPropagation()

    isDrawing.value = true
    drawBuffer.value = [] // 清空缓冲区

    if (props.drawMode === 'doubleButtonDraw') {
      isDrawing.value = true
      const newValue = event.button === 2 ? 0 : 1
      emit('update:drawValue', newValue)
      buttonValue.value = newValue
      updateCell(rowIndex, cellIndex, newValue)
      drawBuffer.value.push({ row: rowIndex, col: cellIndex, value: newValue })
      return
    }

    if (props.moveMode && selectionStart.value && selectionEnd.value) {
      startDragging(rowIndex, cellIndex, event)
      return
    }

    if (props.drawValue === 2 && rowIndex >= 0 && cellIndex >= 0) {
      isSelecting.value = true
      selectionStart.value = { row: rowIndex, col: cellIndex }
      selectionEnd.value = { row: rowIndex, col: cellIndex }
      return
    }

    isSelecting.value = false
    selectionStart.value = null
    selectionEnd.value = null

    isDrawing.value = true
    if (props.drawMode === 'doubleButtonDraw') {
      buttonValue.value = event.button === 2 ? 0 : 1
      updateCell(rowIndex, cellIndex, buttonValue.value)
      drawBuffer.value.push({
        row: rowIndex,
        col: cellIndex,
        value: buttonValue.value,
      })
    } else {
      updateCell(rowIndex, cellIndex, props.drawValue)
      drawBuffer.value.push({
        row: rowIndex,
        col: cellIndex,
        value: props.drawValue,
      })
    }
  }

  const stopDrawing = () => {
    if (isDrawing.value && drawBuffer.value.length > 0) {
      emit('draw-complete', drawBuffer.value)
    }
    isDrawing.value = false
    drawBuffer.value = []
    if (isSelecting.value) {
      isSelecting.value = false
      emit('selection-complete', selectionStart.value, selectionEnd.value)
    }
  }

  const handleHover = (rowIndex, cellIndex) => {
    if (isDrawing.value) {
      const value =
        props.drawMode === 'doubleButtonDraw'
          ? buttonValue.value
          : props.drawValue
      updateCell(rowIndex, cellIndex, value)
      drawBuffer.value.push({ row: rowIndex, col: cellIndex, value })
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

  const isInSelection = (row, col) => {
    if (!selectionStart.value || !selectionEnd.value) return false
    const minRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
    const maxRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
    const minCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
    const maxCol = Math.max(selectionStart.value.col, selectionEnd.value.col)
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
  }

  const startDragging = (rowIndex, cellIndex, event) => {
    if (!props.moveMode || !selectionStart.value || !selectionEnd.value) return

    if (!isInSelection(rowIndex, cellIndex)) return

    const minRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
    const maxRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
    const minCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
    const maxCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

    const selectedData = []
    for (let i = minRow; i <= maxRow; i++) {
      const row = []
      for (let j = minCol; j <= maxCol; j++) {
        row.push(props.gridData[i][j])
      }
      selectedData.push(row)
    }

    isDragging.value = true
    dragStart.value = {
      x: event.clientX,
      y: event.clientY,
      originRow: minRow,
      originCol: minCol,
    }

    dragOffset.value = {
      row: rowIndex - minRow,
      col: cellIndex - minCol,
    }

    draggedData.value = {
      data: selectedData,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
      position: { minRow, maxRow, minCol, maxCol },
    }

    event.preventDefault()
  }

  const handleDragMove = (event) => {
    if (!isDragging.value || !draggedData.value) return

    const cellSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--cell-size',
      ),
    )

    const deltaX = Math.round((event.clientX - dragStart.value.x) / cellSize)
    const deltaY = Math.round((event.clientY - dragStart.value.y) / cellSize)

    const targetRow = dragStart.value.originRow + deltaY
    const targetCol = dragStart.value.originCol + deltaX

    if (
      targetRow >= 0 &&
      targetCol >= 0 &&
      targetRow + draggedData.value.height <= props.gridData.length &&
      targetCol + draggedData.value.width <= props.gridData[0].length
    ) {
      emit('preview-move', {
        row: targetRow,
        col: targetCol,
        data: draggedData.value.data,
        isDragging: true,
      })
    }
  }

  const stopDragging = (event) => {
    if (!isDragging.value || !draggedData.value) return

    const cellSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--cell-size',
      ),
    )

    const deltaX = Math.round((event.clientX - dragStart.value.x) / cellSize)
    const deltaY = Math.round((event.clientY - dragStart.value.y) / cellSize)

    const targetRow = dragStart.value.originRow + deltaY
    const targetCol = dragStart.value.originCol + deltaX

    if (
      targetRow >= 0 &&
      targetCol >= 0 &&
      targetRow + draggedData.value.height <= props.gridData.length &&
      targetCol + draggedData.value.width <= props.gridData[0].length
    ) {
      const { minRow, maxRow, minCol, maxCol } = draggedData.value.position
      for (let i = minRow; i <= maxRow; i++) {
        for (let j = minCol; j <= maxCol; j++) {
          emit('update:cell', i, j, 0)
        }
      }

      draggedData.value.data.forEach((row, i) => {
        row.forEach((value, j) => {
          emit('update:cell', targetRow + i, targetCol + j, value)
        })
      })

      selectionStart.value = { row: targetRow, col: targetCol }
      selectionEnd.value = {
        row: targetRow + draggedData.value.height - 1,
        col: targetCol + draggedData.value.width - 1,
      }

      emit('selection-complete', selectionStart.value, selectionEnd.value)
    }

    isDragging.value = false
    draggedData.value = null
    emit('drag-complete')
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
