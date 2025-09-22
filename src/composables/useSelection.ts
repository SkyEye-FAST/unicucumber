import { computed, readonly, ref } from 'vue'

export interface Position {
  row: number
  col: number
}

export interface Rectangle {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface SelectionData {
  data: number[][]
  width: number
  height: number
  originalRect: Rectangle
}

export type SelectionState =
  | 'none'
  | 'selecting'
  | 'selected'
  | 'moving'
  | 'copying'

export type ToolType = 'draw' | 'erase' | 'select'

export function useSelection(gridData: () => number[][]) {
  const _state = ref<SelectionState>('none')
  const _currentTool = ref<ToolType>('draw')
  const _selectionRect = ref<Rectangle | null>(null)
  const _tempRect = ref<Rectangle | null>(null)
  const _selectionData = ref<SelectionData | null>(null)

  const state = readonly(_state)
  const currentTool = readonly(_currentTool)
  const selectionRect = readonly(_selectionRect)
  const tempRect = readonly(_tempRect)
  const selectionData = readonly(_selectionData)

  const hasSelection = computed(() => _selectionRect.value !== null)
  const isSelecting = computed(() => _state.value === 'selecting')
  const isSelected = computed(() => _state.value === 'selected')
  const isMoving = computed(() => _state.value === 'moving')
  const isCopying = computed(() => _state.value === 'copying')

  const normalizedRect = computed(() => {
    const rect = _tempRect.value || _selectionRect.value
    if (!rect) return null

    return {
      startRow: Math.min(rect.startRow, rect.endRow),
      startCol: Math.min(rect.startCol, rect.endCol),
      endRow: Math.max(rect.startRow, rect.endRow),
      endCol: Math.max(rect.startCol, rect.endCol),
    }
  })

  const setTool = (tool: ToolType) => {
    if (_currentTool.value !== tool) {
      _currentTool.value = tool

      if (tool !== 'select') {
        clearSelection()
      }
    }
  }

  const startSelection = (startPos: Position) => {
    if (_currentTool.value !== 'select') return false

    _state.value = 'selecting'
    _tempRect.value = {
      startRow: startPos.row,
      startCol: startPos.col,
      endRow: startPos.row,
      endCol: startPos.col,
    }
    return true
  }

  const updateSelection = (endPos: Position) => {
    if (_state.value !== 'selecting' || !_tempRect.value) return

    _tempRect.value = {
      ..._tempRect.value,
      endRow: endPos.row,
      endCol: endPos.col,
    }
  }

  const finishSelection = () => {
    if (_state.value !== 'selecting' || !_tempRect.value) return

    const normalized = {
      startRow: Math.min(_tempRect.value.startRow, _tempRect.value.endRow),
      startCol: Math.min(_tempRect.value.startCol, _tempRect.value.endCol),
      endRow: Math.max(_tempRect.value.startRow, _tempRect.value.endRow),
      endCol: Math.max(_tempRect.value.startCol, _tempRect.value.endCol),
    }

    if (
      normalized.endRow >= normalized.startRow &&
      normalized.endCol >= normalized.startCol
    ) {
      _selectionRect.value = normalized
      _state.value = 'selected'

      extractSelectionData()
    }

    _tempRect.value = null
  }

  const clearSelection = () => {
    _state.value = 'none'
    _selectionRect.value = null
    _tempRect.value = null
    _selectionData.value = null
  }

  const extractSelectionData = () => {
    if (!_selectionRect.value) {
      _selectionData.value = null
      return
    }

    const rect = _selectionRect.value
    const grid = gridData()
    const data: number[][] = []

    for (let row = rect.startRow; row <= rect.endRow; row++) {
      const rowData: number[] = []
      for (let col = rect.startCol; col <= rect.endCol; col++) {
        rowData.push(grid[row]?.[col] ?? 0)
      }
      data.push(rowData)
    }

    _selectionData.value = {
      data,
      width: rect.endCol - rect.startCol + 1,
      height: rect.endRow - rect.startRow + 1,
      originalRect: rect,
    }
  }

  const isPositionInSelection = (pos: Position): boolean => {
    const rect = normalizedRect.value
    if (!rect) return false

    return (
      pos.row >= rect.startRow &&
      pos.row <= rect.endRow &&
      pos.col >= rect.startCol &&
      pos.col <= rect.endCol
    )
  }

  const startMove = () => {
    if (_state.value !== 'selected' || !_selectionData.value) return false

    _state.value = 'moving'
    return true
  }

  const moveSelectionTo = (targetPos: Position) => {
    if (!_selectionData.value) return false

    const { width, height } = _selectionData.value

    _selectionRect.value = {
      startRow: targetPos.row,
      startCol: targetPos.col,
      endRow: targetPos.row + height - 1,
      endCol: targetPos.col + width - 1,
    }

    _state.value = 'selected'
    return true
  }

  const startCopy = () => {
    if (_state.value !== 'selected') return false

    _state.value = 'copying'
    return true
  }

  const finishCopy = () => {
    if (_state.value === 'copying') {
      _state.value = 'selected'
    }
  }

  const cancelOperation = () => {
    if (_state.value === 'selecting') {
      _tempRect.value = null
      _state.value = 'none'
    } else if (_state.value === 'moving' || _state.value === 'copying') {
      _state.value = 'selected'
    }
  }

  const refreshSelectionData = () => {
    if (_selectionRect.value) {
      extractSelectionData()
    }
  }

  const setTempRect = (rect: Rectangle | null) => {
    _tempRect.value = rect
  }

  const updateOriginalRect = (rect: Rectangle) => {
    if (_selectionData.value) {
      _selectionData.value = {
        ..._selectionData.value,
        originalRect: rect,
      }
    }
  }

  return {
    state,
    currentTool,
    selectionRect,
    tempRect,
    selectionData,
    normalizedRect,

    hasSelection,
    isSelecting,
    isSelected,
    isMoving,
    isCopying,

    setTool,
    startSelection,
    updateSelection,
    finishSelection,
    clearSelection,
    isPositionInSelection,
    startMove,
    moveSelectionTo,
    startCopy,
    finishCopy,
    cancelOperation,
    refreshSelectionData,
    setTempRect,
    updateOriginalRect,
  }
}
