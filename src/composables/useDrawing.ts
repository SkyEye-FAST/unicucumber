import {
  computed,
  type ComputedRef,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import type { Position } from './useSelection'

export interface DrawAction {
  type: 'draw' | 'erase'
  changes: Array<{
    row: number
    col: number
    oldValue: number
    newValue: number
  }>
}

interface DrawingProps {
  drawMode: 'singleButtonDraw' | 'doubleButtonDraw'
  drawValue: number
  gridData: () => number[][]
  disabled?: boolean
}

export function useDrawing(
  propsRef: ComputedRef<DrawingProps>,
  emit: {
    'cell-change': (row: number, col: number, value: number) => void
    'draw-complete': (action: DrawAction) => void
    'tool-change'?: (value: number) => void
    'tool-state-change'?: (tool: 'draw' | 'erase') => void
  },
) {
  const isDrawing = ref(false)
  const currentDrawValue = ref(1)
  const hoverCell = ref<Position>({ row: -1, col: -1 })
  const drawBuffer = ref<DrawAction['changes']>([])
  const lastDrawnCell = ref<Position>({ row: -1, col: -1 })
  const isStartingDraw = ref(false)

  const effectiveDrawValue = computed(() => {
    const props = propsRef.value

    return props.drawValue
  })

  const handleMouseDown = (row: number, col: number, event: MouseEvent) => {
    const props = propsRef.value

    if (props.disabled) return

    let drawValue: number
    if (props.drawMode === 'doubleButtonDraw') {
      drawValue = event.button === 2 ? 0 : 1

      event.preventDefault()
      event.stopPropagation()
    } else {
      if (event.button !== 0) {
        return
      }

      drawValue = props.drawValue
      event.stopPropagation()
    }

    startDrawing(row, col, drawValue)
  }

  const handleMouseMove = (row: number, col: number) => {
    hoverCell.value = { row, col }
    if (isDrawing.value) {
      continueDrawing(row, col)
    }
  }

  const handleMouseLeave = () => {
    hoverCell.value = { row: -1, col: -1 }
  }

  const handleMouseUp = (event?: MouseEvent) => {
    const props = propsRef.value
    if (isDrawing.value) {
      if (props.drawMode === 'doubleButtonDraw') {
        const isCorrectButton =
          (currentDrawValue.value === 1 && event?.button === 0) ||
          (currentDrawValue.value === 0 && event?.button === 2)

        if (!event || isCorrectButton) {
          finishDrawing()
        }
      } else {
        if (!event || event.button === 0) {
          finishDrawing()
        }
      }
    }
  }

  const handleContextMenu = (event: MouseEvent) => {
    const props = propsRef.value

    if (props.drawMode === 'doubleButtonDraw') {
      event.preventDefault()
    }
  }

  const startDrawing = (row: number, col: number, value: number) => {
    const props = propsRef.value
    const gridData = props.gridData()

    if (isDrawing.value || isStartingDraw.value) {
      return
    }

    if (
      row < 0 ||
      col < 0 ||
      row >= gridData.length ||
      col >= (gridData[row]?.length ?? 0)
    ) {
      return
    }

    isStartingDraw.value = true
    isDrawing.value = true
    currentDrawValue.value = value
    drawBuffer.value = []
    lastDrawnCell.value = { row, col }
    drawPixel(row, col, value)
    isStartingDraw.value = false
  }

  const continueDrawing = (row: number, col: number) => {
    const props = propsRef.value
    const gridData = props.gridData()

    if (
      !isDrawing.value ||
      row < 0 ||
      col < 0 ||
      row >= gridData.length ||
      col >= (gridData[row]?.length ?? 0)
    ) {
      return
    }

    if (lastDrawnCell.value.row === row && lastDrawnCell.value.col === col) {
      return
    }

    lastDrawnCell.value = { row, col }
    drawPixel(row, col, currentDrawValue.value)
  }

  const finishDrawing = () => {
    if (!isDrawing.value) return
    if (drawBuffer.value.length > 0) {
      const action: DrawAction = {
        type: currentDrawValue.value === 0 ? 'erase' : 'draw',
        changes: [...drawBuffer.value],
      }
      emit['draw-complete'](action)
    }
    isDrawing.value = false
    currentDrawValue.value = 1
    drawBuffer.value = []
    lastDrawnCell.value = { row: -1, col: -1 }
  }

  const drawPixel = (row: number, col: number, value: number) => {
    const props = propsRef.value
    const gridData = props.gridData()
    const oldValue = gridData[row]?.[col] ?? 0

    if (oldValue !== value) {
      if (gridData[row]) {
        gridData[row][col] = value
      }

      const existingIndex = drawBuffer.value.findIndex(
        (change) => change.row === row && change.col === col,
      )

      if (existingIndex >= 0) {
        const existingChange = drawBuffer.value[existingIndex]
        if (existingChange) {
          existingChange.newValue = value
        }
      } else {
        drawBuffer.value.push({
          row,
          col,
          oldValue,
          newValue: value,
        })
      }

      emit['cell-change'](row, col, value)
    }
  }

  const getCellPosition = (element: HTMLElement): Position | null => {
    const cellElement = element.closest('.cell') as HTMLElement
    if (!cellElement) return null
    const row = parseInt(cellElement.dataset.row ?? '-1')
    const col = parseInt(cellElement.dataset.col ?? '-1')
    if (row < 0 || col < 0) return null
    return { row, col }
  }

  const handleTouchStart = (event: TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault()
    }
    const touch = event.touches[0]
    if (!touch) return
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement
    if (target?.classList.contains('cell')) {
      const position = getCellPosition(target)
      if (position) {
        const props = propsRef.value

        let drawValue = props.drawValue
        if (props.drawMode === 'doubleButtonDraw') {
          drawValue = 1
        }
        startDrawing(position.row, position.col, drawValue)
      }
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault()
    }
    const touch = event.touches[0]
    if (!touch) return
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    ) as HTMLElement
    if (target?.classList.contains('cell')) {
      const position = getCellPosition(target)
      if (position) {
        hoverCell.value = position
        if (isDrawing.value) {
          continueDrawing(position.row, position.col)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    if (isDrawing.value) {
      finishDrawing()
    }
  }

  onMounted(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('pointerup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('pointerup', handleMouseUp)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  const stopDrawing = () => {
    if (isDrawing.value) {
      finishDrawing()
    }
  }

  return {
    isDrawing: readonly(isDrawing),
    hoverCell: readonly(hoverCell),
    effectiveDrawValue: readonly(effectiveDrawValue),
    currentDrawValue: readonly(currentDrawValue),
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    stopDrawing,
  }
}

function readonly<T>(ref: import('vue').Ref<T>) {
  return ref as Readonly<import('vue').Ref<T>>
}
