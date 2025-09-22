import { computed, ref } from 'vue'

import type { Rectangle } from './useSelection'

export interface SelectionRenderData {
  rect: Rectangle | null

  tempRect: Rectangle | null

  showMarchingAnts: boolean

  state: 'none' | 'selecting' | 'selected' | 'moving' | 'copying'
}

export function useSelectionRenderer() {
  const renderData = ref<SelectionRenderData>({
    rect: null,
    tempRect: null,
    showMarchingAnts: false,
    state: 'none',
  })

  const updateRenderData = (data: Partial<SelectionRenderData>) => {
    Object.assign(renderData.value, data)
  }

  const getSelectionStyle = computed(() => {
    const activeRect = renderData.value.tempRect || renderData.value.rect
    if (!activeRect) return null

    const normalized = {
      startRow: Math.min(activeRect.startRow, activeRect.endRow),
      startCol: Math.min(activeRect.startCol, activeRect.endCol),
      endRow: Math.max(activeRect.startRow, activeRect.endRow),
      endCol: Math.max(activeRect.startCol, activeRect.endCol),
    }

    return {
      gridRowStart: normalized.startRow + 2,
      gridRowEnd: normalized.endRow + 3,
      gridColumnStart: normalized.startCol + 2,
      gridColumnEnd: normalized.endCol + 3,
    }
  })

  const getCellSelectionClass = (row: number, col: number) => {
    const activeRect = renderData.value.tempRect || renderData.value.rect
    if (!activeRect) return ''

    const normalized = {
      startRow: Math.min(activeRect.startRow, activeRect.endRow),
      startCol: Math.min(activeRect.startCol, activeRect.endCol),
      endRow: Math.max(activeRect.startRow, activeRect.endRow),
      endCol: Math.max(activeRect.startCol, activeRect.endCol),
    }

    const isInSelection =
      row >= normalized.startRow &&
      row <= normalized.endRow &&
      col >= normalized.startCol &&
      col <= normalized.endCol

    if (!isInSelection) return ''

    const classes = ['cell-selected']

    if (renderData.value.state === 'selecting') {
      classes.push('cell-selecting')
    } else if (renderData.value.state === 'moving') {
      classes.push('cell-moving')
    } else if (renderData.value.state === 'copying') {
      classes.push('cell-copying')
    }

    if (row === normalized.startRow) classes.push('cell-selected-top')
    if (row === normalized.endRow) classes.push('cell-selected-bottom')
    if (col === normalized.startCol) classes.push('cell-selected-left')
    if (col === normalized.endCol) classes.push('cell-selected-right')

    return classes.join(' ')
  }

  const isPositionSelected = (row: number, col: number): boolean => {
    const activeRect = renderData.value.tempRect || renderData.value.rect
    if (!activeRect) return false

    const normalized = {
      startRow: Math.min(activeRect.startRow, activeRect.endRow),
      startCol: Math.min(activeRect.startCol, activeRect.endCol),
      endRow: Math.max(activeRect.startRow, activeRect.endRow),
      endCol: Math.max(activeRect.startCol, activeRect.endCol),
    }

    return (
      row >= normalized.startRow &&
      row <= normalized.endRow &&
      col >= normalized.startCol &&
      col <= normalized.endCol
    )
  }

  const getSelectionBounds = () => {
    const activeRect = renderData.value.tempRect || renderData.value.rect
    if (!activeRect) return null

    const normalized = {
      startRow: Math.min(activeRect.startRow, activeRect.endRow),
      startCol: Math.min(activeRect.startCol, activeRect.endCol),
      endRow: Math.max(activeRect.startRow, activeRect.endRow),
      endCol: Math.max(activeRect.startCol, activeRect.endCol),
    }

    return {
      ...normalized,
      width: normalized.endCol - normalized.startCol + 1,
      height: normalized.endRow - normalized.startRow + 1,
    }
  }

  const clear = () => {
    renderData.value = {
      rect: null,
      tempRect: null,
      showMarchingAnts: false,
      state: 'none',
    }
  }

  return {
    renderData: readonly(renderData),

    getSelectionStyle,

    updateRenderData,
    getCellSelectionClass,
    isPositionSelected,
    getSelectionBounds,
    clear,
  }
}

function readonly<T>(ref: import('vue').Ref<T>) {
  return ref as Readonly<import('vue').Ref<T>>
}
