import { ref, computed, watch } from 'vue'
import { useSelection, type Position, type ToolType } from './useSelection'
import { useClipboard } from './useClipboard'
import { useDrawing } from './useDrawing'
import { useSelectionRenderer } from './useSelectionRenderer'

interface GridInteractionProps {
  gridData: number[][]
  drawMode: 'singleButtonDraw' | 'doubleButtonDraw'
  drawValue: number
  currentTool: ToolType
  enableSelection: boolean
}

type GridInteractionEmits = {
  'cell-change': [row: number, col: number, value: number]
  'draw-complete': [action: any]
  'selection-change': [hasSelection: boolean]
  'tool-change': [tool: ToolType]
  'clipboard-change': [hasData: boolean]
}

/**
 * 网格交互管理器
 *
 * 统一管理网格的所有交互功能：
 * - 工具切换和状态管理
 * - 鼠标和触摸事件分发
 * - 绘制和选区功能协调
 * - 剪贴板操作
 */
export function useGridInteraction(
  props: GridInteractionProps,
  emit: <K extends keyof GridInteractionEmits>(
    event: K,
    ...args: GridInteractionEmits[K]
  ) => void,
) {
  const selection = useSelection(() => props.gridData)
  const clipboard = useClipboard()
  const renderer = useSelectionRenderer()

  const drawing = useDrawing(
    computed(() => ({
      drawMode: props.drawMode,
      drawValue: props.drawValue,
      gridData: () => props.gridData,
      disabled: !props.enableSelection && props.currentTool === 'select',
    })),
    {
      'cell-change': (row, col, value) => emit('cell-change', row, col, value),
      'draw-complete': (action) => emit('draw-complete', action),
      'tool-change': (value) => {},
    },
  )

  const isInteracting = ref(false)
  const interactionStartPos = ref<Position | null>(null)

  watch(
    () => props.currentTool,
    (newTool) => {
      selection.setTool(newTool)

      drawing.stopDrawing()
      selection.cancelOperation()
      clipboard.exitPasteMode()

      emit('tool-change', newTool)
    },
    { immediate: true },
  )

  watch([selection.hasSelection, selection.state], ([hasSelection, state]) => {
    emit('selection-change', hasSelection)

    renderer.updateRenderData({
      rect: selection.selectionRect.value,
      tempRect: selection.tempRect.value,
      showMarchingAnts: state === 'selected',
      state: state,
    })
  })

  watch(clipboard.clipboardData, () => {
    emit('clipboard-change', clipboard.hasClipboardData())
  })

  const handleMouseDown = (row: number, col: number, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    isInteracting.value = true
    interactionStartPos.value = { row, col }

    const tool = props.currentTool

    if (tool === 'select') {
      if (selection.isPositionInSelection({ row, col })) {
        if (selection.startMove()) {
          return
        }
      }

      selection.clearSelection()
      selection.startSelection({ row, col })
    } else {
      selection.clearSelection()
      drawing.handleMouseDown(row, col, event)
    }
  }

  const handleMouseMove = (row: number, col: number) => {
    if (!isInteracting.value) {
      drawing.handleMouseMove(row, col)
      return
    }

    const tool = props.currentTool

    if (tool === 'select') {
      if (selection.isMoving) {
        const startPos = interactionStartPos.value
        if (startPos && selection.selectionData.value) {
          const deltaRow = row - startPos.row
          const deltaCol = col - startPos.col

          const originalRect = selection.selectionData.value.originalRect
          const newPos = {
            row: originalRect.startRow + deltaRow,
            col: originalRect.startCol + deltaCol,
          }

          renderer.updateRenderData({
            tempRect: {
              startRow: newPos.row,
              startCol: newPos.col,
              endRow: newPos.row + selection.selectionData.value.height - 1,
              endCol: newPos.col + selection.selectionData.value.width - 1,
            },
            state: 'moving',
          })
        }
      } else if (selection.isSelecting) {
        selection.updateSelection({ row, col })
      }
    } else {
      drawing.handleMouseMove(row, col)
    }
  }

  const handleMouseUp = () => {
    if (!isInteracting.value) return

    const tool = props.currentTool

    if (tool === 'select') {
      if (selection.isMoving && interactionStartPos.value) {
        const startPos = interactionStartPos.value
        const currentPos = drawing.hoverCell.value

        if (
          currentPos.row >= 0 &&
          currentPos.col >= 0 &&
          selection.selectionData.value
        ) {
          const selectionDataValue = selection.selectionData.value
          const deltaRow = currentPos.row - startPos.row
          const deltaCol = currentPos.col - startPos.col

          const originalRect = selectionDataValue.originalRect
          const newPos = {
            row: originalRect.startRow + deltaRow,
            col: originalRect.startCol + deltaCol,
          }

          if (selection.moveSelectionTo(newPos)) {
            moveSelectionData(selectionDataValue, originalRect, newPos)
          }
        }
      } else if (selection.isSelecting) {
        selection.finishSelection()
      }
    }

    isInteracting.value = false
    interactionStartPos.value = null
  }

  const moveSelectionData = (
    selectionData: any,
    fromRect: any,
    toPos: Position,
  ) => {
    for (let row = fromRect.startRow; row <= fromRect.endRow; row++) {
      for (let col = fromRect.startCol; col <= fromRect.endCol; col++) {
        emit('cell-change', row, col, 0)
      }
    }

    selectionData.data.forEach((rowData: number[], rowIndex: number) => {
      rowData.forEach((value: number, colIndex: number) => {
        emit('cell-change', toPos.row + rowIndex, toPos.col + colIndex, value)
      })
    })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'c':
          handleCopy()
          event.preventDefault()
          break
        case 'x':
          handleCut()
          event.preventDefault()
          break
        case 'v':
          handlePaste()
          event.preventDefault()
          break
        case 'a':
          handleSelectAll()
          event.preventDefault()
          break
      }
    } else {
      switch (event.key) {
        case 'Delete':
          handleDelete()
          event.preventDefault()
          break
        case 'Escape':
          handleEscape()
          event.preventDefault()
          break
      }
    }
  }

  const handleCopy = () => {
    if (selection.hasSelection.value && selection.selectionData.value) {
      const data = selection.selectionData.value
      const copyData = {
        data: data.data.map((row) => [...row]),
        width: data.width,
        height: data.height,
        originalRect: { ...data.originalRect },
      }
      clipboard.copy(copyData)
    }
  }

  const handleCut = () => {
    if (selection.hasSelection.value && selection.selectionData.value) {
      const data = selection.selectionData.value
      const cutData = {
        data: data.data.map((row) => [...row]),
        width: data.width,
        height: data.height,
        originalRect: { ...data.originalRect },
      }
      clipboard.cut(cutData)

      const rect = selection.selectionRect.value
      if (rect) {
        for (let row = rect.startRow; row <= rect.endRow; row++) {
          for (let col = rect.startCol; col <= rect.endCol; col++) {
            emit('cell-change', row, col, 0)
          }
        }
      }
    }
  }

  const handlePaste = () => {
    if (!clipboard.hasClipboardData()) return

    if (clipboard.enterPasteMode()) {
    }
  }

  const handleSelectAll = () => {
    if (props.currentTool === 'select' && props.enableSelection) {
      selection.setTool('select')

      const maxRow = props.gridData.length - 1
      const maxCol = (props.gridData[0]?.length ?? 0) - 1

      if (maxRow >= 0 && maxCol >= 0) {
        selection.clearSelection()
        selection.startSelection({ row: 0, col: 0 })
        selection.updateSelection({ row: maxRow, col: maxCol })
        selection.finishSelection()
      }
    }
  }

  const handleDelete = () => {
    if (selection.hasSelection.value) {
      const rect = selection.selectionRect.value
      if (rect) {
        for (let row = rect.startRow; row <= rect.endRow; row++) {
          for (let col = rect.startCol; col <= rect.endCol; col++) {
            emit('cell-change', row, col, 0)
          }
        }
      }
    }
  }

  const handleEscape = () => {
    if (clipboard.isPasteMode.value) {
      clipboard.exitPasteMode()
    } else if (selection.hasSelection.value) {
      selection.clearSelection()
    }
  }

  const pasteAt = (row: number, col: number) => {
    if (!clipboard.isPasteMode.value) return false

    const pasteData = clipboard.getPasteData({ row, col })
    if (!pasteData) return false

    if (
      !clipboard.canPasteAt(
        { row, col },
        props.gridData[0]?.length ?? 0,
        props.gridData.length,
      )
    ) {
      return false
    }

    pasteData.data.forEach((rowData, rowIndex) => {
      rowData.forEach((value, colIndex) => {
        emit('cell-change', row + rowIndex, col + colIndex, value)
      })
    })

    selection.clearSelection()
    selection.startSelection({ row, col })
    selection.updateSelection({
      row: row + pasteData.height - 1,
      col: col + pasteData.width - 1,
    })
    selection.finishSelection()

    clipboard.exitPasteMode()
    return true
  }

  return {
    selection,
    clipboard,
    drawing,
    renderer,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,

    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleDelete,
    handleEscape,
    pasteAt,

    isInteracting: readonly(isInteracting),
  }
}

function readonly<T>(ref: import('vue').Ref<T>) {
  return ref as Readonly<import('vue').Ref<T>>
}
