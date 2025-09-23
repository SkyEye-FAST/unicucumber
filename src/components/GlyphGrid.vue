<template>
  <div
    class="grid-container"
    :style="gridStyle"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <div class="header-row">
      <div class="corner-cell"></div>
      <div
        v-for="colIndex in gridData[0]?.length || 0"
        :key="`col-${colIndex}`"
        class="header-cell"
        :style="{
          color: colIndex % 2 ? 'var(--text-color)' : 'var(--danger-color)',
        }"
      >
        {{ (colIndex - 1).toString(16).toUpperCase() }}
      </div>
    </div>

    <template
      v-if="
        currentSelectionRect &&
        props.currentTool === 'select' &&
        lastInputWasTouch
      "
    >
      <button
        class="move-button move-up"
        :style="getMoveButtonStyle('up')"
        @click.stop.prevent="moveUp"
        aria-label="Move selection up"
      >
        ▲
      </button>
      <button
        class="move-button move-down"
        :style="getMoveButtonStyle('down')"
        @click.stop.prevent="moveDown"
        aria-label="Move selection down"
      >
        ▼
      </button>
      <button
        class="move-button move-left"
        :style="getMoveButtonStyle('left')"
        @click.stop.prevent="moveLeft"
        aria-label="Move selection left"
      >
        ◀
      </button>
      <button
        class="move-button move-right"
        :style="getMoveButtonStyle('right')"
        @click.stop.prevent="moveRight"
        aria-label="Move selection right"
      >
        ▶
      </button>
    </template>

    <div
      v-for="(row, rowIndex) in gridData"
      :key="`row-${rowIndex}`"
      class="grid-row"
    >
      <div
        class="header-cell"
        :style="{
          color: rowIndex % 2 ? 'var(--danger-color)' : 'var(--text-color)',
        }"
      >
        {{ rowIndex.toString(16).toUpperCase() }}
      </div>

      <div
        v-for="(cell, cellIndex) in row"
        :key="`cell-${rowIndex}-${cellIndex}`"
        :class="getCellClasses(rowIndex, cellIndex, cell)"
        :data-row="rowIndex"
        :data-col="cellIndex"
        :style="getCellStyle(rowIndex, cellIndex)"
        @mousedown="handleMouseDown(rowIndex, cellIndex, $event)"
        @mousemove="handleMouseMove(rowIndex, cellIndex)"
        @pointerdown.prevent="handlePointerDown(rowIndex, cellIndex, $event)"
        @pointermove="handlePointerMove(rowIndex, cellIndex, $event)"
        @pointerup="handlePointerUp($event)"
        @touchstart.stop.prevent="
          handleTouchStartCell(rowIndex, cellIndex, $event)
        "
        @touchmove.stop.prevent="
          handleTouchMoveCell(rowIndex, cellIndex, $event)
        "
        @touchend.stop.prevent="handleTouchEndCell($event)"
        @mouseleave="handleMouseLeave"
        @contextmenu="drawing.handleContextMenu"
        @click="handleCellClick(rowIndex, cellIndex)"
      ></div>
    </div>

    <div
      v-if="currentSelectionRect"
      class="selection-overlay"
      :class="selectionStateClass"
      :style="getSelectionOverlayStyle(currentSelectionRect)"
    ></div>

    <div
      v-if="tempSelectionRect"
      class="selection-overlay temp-selection"
      :class="tempSelectionStateClass"
      :style="getSelectionOverlayStyle(tempSelectionRect)"
    ></div>

    <div
      v-if="
        clipboard.isPasteMode.value &&
        clipboard.clipboardData.value &&
        (drawing.hoverCell.value.row >= 0 || tempSelectionRect)
      "
      class="paste-cursor"
      :style="pasteCursorStyle"
    >
      <template
        v-for="(rowData, rIdx) in clipboard.clipboardData.value.data"
        :key="`paste-row-${rIdx}`"
      >
        <div
          v-for="(cell, cIdx) in rowData"
          :key="`paste-cell-${rIdx}-${cIdx}`"
          class="paste-cell"
          :class="{ filled: cell === 1 }"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'

import { useClipboard } from '@/composables/useClipboard'
import { type DrawAction, useDrawing } from '@/composables/useDrawing'
import {
  type Rectangle,
  type ToolType,
  useSelection,
} from '@/composables/useSelection'
import { useSettings } from '@/composables/useSettings'

interface Props {
  gridData: number[][]
  drawMode: 'singleButtonDraw' | 'doubleButtonDraw'
  drawValue: number
  showBorder: boolean
  currentTool?: ToolType
  enableSelection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentTool: 'draw',
  enableSelection: false,
})

const emit = defineEmits([
  'update:cell',
  'update:drawValue',
  'update:draw-value',
  'selection-change',
  'tool-change',
  'tool-state-change',
  'draw-complete',
  'clipboard-change',
  'paste-start',
])

const selection = useSelection(() => props.gridData)
const clipboard = useClipboard()

const drawing = useDrawing(
  computed(() => ({
    drawMode: props.drawMode,
    drawValue: props.drawValue,
    gridData: () => props.gridData,
    disabled: !props.enableSelection && props.currentTool === 'select',
  })),
  {
    'cell-change': (row: number, col: number, value: number) =>
      emit('update:cell', row, col, value),
    'draw-complete': (action: DrawAction) => emit('draw-complete', action),
    'tool-change': (value: number) => emit('update:draw-value', value),
    'tool-state-change': (tool: 'draw' | 'erase') =>
      emit('tool-state-change', tool),
  },
)

const { settings } = useSettings()

const lastInputWasTouch = ref(false)

const isInteracting = ref(false)
const mousePosition = ref({ x: 0, y: 0 })
const lastValidMousePos = ref({ row: -1, col: -1 })

const gridStyle = computed(() => ({
  gridTemplateColumns: props.gridData[0]
    ? `var(--cell-size) repeat(${props.gridData[0].length}, var(--cell-size))`
    : '',
}))

const getCellClasses = (row: number, col: number, value: number) => {
  const classes = ['cell']
  if (value === 1) classes.push('filled')
  return classes.join(' ')
}

const getCellStyle = (row: number, col: number) => {
  const style: Record<string, string> = {}

  const shouldShowCursorEffect =
    settings.value?.alwaysShowMouseCursor || !lastInputWasTouch.value

  if (
    shouldShowCursorEffect &&
    drawing.hoverCell.value.row === row &&
    drawing.hoverCell.value.col === col &&
    props.currentTool !== 'select'
  ) {
    const drawValue =
      props.drawMode === 'doubleButtonDraw'
        ? drawing.currentDrawValue.value
        : drawing.effectiveDrawValue.value
    if (drawValue === 1) {
      style.backgroundColor = 'black'
    } else if (drawValue === 0) {
      style.backgroundColor = 'white'
    }
  }

  if (props.showBorder) {
    style.boxShadow = 'inset 0 0 0 0.3px var(--primary-darker)'
  }

  return style
}

const currentSelectionRect = computed(() => {
  return selection.selectionRect.value
})

const tempSelectionRect = computed(() => {
  return selection.tempRect.value
})

const selectionStateClass = computed(() => {
  const state = selection.state.value
  return {
    'selection-selecting': state === 'selecting',
    'selection-selected': state === 'selected',
    'selection-moving': state === 'moving',
    'selection-copying': state === 'copying',
  }
})

const tempSelectionStateClass = computed(() => {
  const state = selection.state.value
  return {
    'selection-temp': true,
    'selection-selecting': state === 'selecting',
    'selection-moving': state === 'moving',
    'selection-copying': state === 'copying',
  }
})

const getSelectionOverlayStyle = (rect: Rectangle | null) => {
  if (!rect) return {}

  const normalized = {
    startRow: Math.min(rect.startRow, rect.endRow),
    startCol: Math.min(rect.startCol, rect.endCol),
    endRow: Math.max(rect.startRow, rect.endRow),
    endCol: Math.max(rect.startCol, rect.endCol),
  }

  const cellSize = 'var(--cell-size)'
  const top = `calc(${normalized.startRow + 1} * ${cellSize})`
  const left = `calc(${normalized.startCol + 1} * ${cellSize})`
  const width = `calc(${normalized.endCol - normalized.startCol + 1} * ${cellSize})`
  const height = `calc(${normalized.endRow - normalized.startRow + 1} * ${cellSize})`

  return {
    position: 'absolute' as const,
    top,
    left,
    width,
    height,
    pointerEvents: 'none' as const,
    boxSizing: 'border-box' as const,
  }
}

const pasteCursorStyle = computed(() => {
  if (!clipboard.isPasteMode.value || !clipboard.clipboardData.value) {
    return { display: 'none' }
  }
  const cb = clipboard.clipboardData.value
  const hoverCell = drawing.hoverCell.value

  if (tempSelectionRect.value) {
    const rect = tempSelectionRect.value
    const normalized = {
      startRow: Math.min(rect.startRow, rect.endRow),
      startCol: Math.min(rect.startCol, rect.endCol),
      endRow: Math.max(rect.startRow, rect.endRow),
      endCol: Math.max(rect.startCol, rect.endCol),
    }
    const w = normalized.endCol - normalized.startCol + 1
    const h = normalized.endRow - normalized.startRow + 1

    return {
      position: 'absolute' as const,
      gridRowStart: normalized.startRow + 2,
      gridRowEnd: normalized.endRow + 3,
      gridColumnStart: normalized.startCol + 2,
      gridColumnEnd: normalized.endCol + 3,
      display: 'grid',
      gridTemplateColumns: `repeat(${w}, var(--cell-size))`,
      gridTemplateRows: `repeat(${h}, var(--cell-size))`,
      border: '2px dashed var(--primary-color)',
      backgroundColor: 'rgba(var(--primary-color-rgb), 0.05)',
      pointerEvents: 'none' as const,
      zIndex: 1000,
    }
  }

  if (hoverCell.row >= 0 && hoverCell.col >= 0 && cb) {
    const { width, height } = cb
    return {
      position: 'absolute' as const,
      gridRowStart: hoverCell.row + 2,
      gridRowEnd: hoverCell.row + height + 2,
      gridColumnStart: hoverCell.col + 2,
      gridColumnEnd: hoverCell.col + width + 2,
      display: 'grid',
      gridTemplateColumns: `repeat(${width}, var(--cell-size))`,
      gridTemplateRows: `repeat(${height}, var(--cell-size))`,
      border: '2px dashed var(--primary-color)',
      backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000,
    }
  }

  if (cb) {
    const { width, height } = cb
    return {
      position: 'fixed' as const,
      left: `${mousePosition.value.x}px`,
      top: `${mousePosition.value.y}px`,
      width: `calc(${width} * var(--cell-size))`,
      height: `calc(${height} * var(--cell-size))`,
      display: 'grid',
      gridTemplateColumns: `repeat(${width}, var(--cell-size))`,
      gridTemplateRows: `repeat(${height}, var(--cell-size))`,
      border: '2px dashed var(--primary-color)',
      backgroundColor: 'rgba(var(--primary-color-rgb), 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000,
    }
  }

  return { display: 'none' }
})

const handleMouseDown = (row: number, col: number, event: MouseEvent) => {
  isInteracting.value = true
  interactionStartPos.value = { row, col }

  if (clipboard.isPasteMode.value) {
    event.preventDefault()
    event.stopPropagation()

    return
  }

  if (props.currentTool === 'select') {
    event.preventDefault()
    event.stopPropagation()

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
  lastValidMousePos.value = { row, col }

  drawing.handleMouseMove(row, col)

  if (props.currentTool === 'select' && isInteracting.value) {
    if (selection.isMoving.value) {
      const startPos = getInteractionStartPos()
      if (startPos && selection.selectionData.value) {
        const deltaRow = row - startPos.row
        const deltaCol = col - startPos.col

        const originalRect = selection.selectionData.value.originalRect
        const rawNewPos = {
          row: originalRect.startRow + deltaRow,
          col: originalRect.startCol + deltaCol,
        }

        const gridHeight = props.gridData.length
        const gridWidth = props.gridData[0]?.length ?? 0
        const selectionHeight = selection.selectionData.value.height
        const selectionWidth = selection.selectionData.value.width

        const clampedNewPos = {
          row: Math.max(
            0,
            Math.min(gridHeight - selectionHeight, rawNewPos.row),
          ),
          col: Math.max(0, Math.min(gridWidth - selectionWidth, rawNewPos.col)),
        }

        const tempRect = {
          startRow: clampedNewPos.row,
          startCol: clampedNewPos.col,
          endRow: clampedNewPos.row + selectionHeight - 1,
          endCol: clampedNewPos.col + selectionWidth - 1,
        }

        selection.setTempRect(tempRect)
      }
    } else if (selection.isSelecting.value) {
      selection.updateSelection({ row, col })
    }
  }
}
const interactionStartPos = ref<{ row: number; col: number } | null>(null)
const getInteractionStartPos = () => interactionStartPos.value

const handleMouseLeave = () => {
  drawing.handleMouseLeave()
}

const handleMouseUp = () => {
  if (!isInteracting.value) return

  if (props.currentTool === 'select') {
    if (selection.isMoving.value && interactionStartPos.value) {
      const startPos = interactionStartPos.value

      const currentPos = lastValidMousePos.value

      if (selection.selectionData.value) {
        const deltaRow = currentPos.row - startPos.row
        const deltaCol = currentPos.col - startPos.col

        const originalRect = selection.selectionData.value.originalRect
        const rawNewPos = {
          row: originalRect.startRow + deltaRow,
          col: originalRect.startCol + deltaCol,
        }

        const gridHeight = props.gridData.length
        const gridWidth = props.gridData[0]?.length ?? 0
        const selectionHeight = selection.selectionData.value.height
        const selectionWidth = selection.selectionData.value.width

        const clampedNewPos = {
          row: Math.max(
            0,
            Math.min(gridHeight - selectionHeight, rawNewPos.row),
          ),
          col: Math.max(0, Math.min(gridWidth - selectionWidth, rawNewPos.col)),
        }

        if (selection.moveSelectionTo(clampedNewPos)) {
          const selectionDataValue = selection.selectionData.value
          if (selectionDataValue) {
            moveSelectionData(selectionDataValue, originalRect, clampedNewPos)

            const newRect = {
              startRow: clampedNewPos.row,
              startCol: clampedNewPos.col,
              endRow: clampedNewPos.row + selectionDataValue.height - 1,
              endCol: clampedNewPos.col + selectionDataValue.width - 1,
            }
            selection.updateOriginalRect(newRect)
          }
        } else {
        }
      }

      selection.setTempRect(null)
    } else if (selection.isSelecting.value) {
      selection.finishSelection()
    }
  }

  isInteracting.value = false
  interactionStartPos.value = null
}

const moveSelectionData = (
  selectionData: {
    readonly data: readonly (readonly number[])[]
    readonly width: number
    readonly height: number
    readonly originalRect: Rectangle
  },
  fromRect: Rectangle,
  toPos: { row: number; col: number },
) => {
  for (let row = fromRect.startRow; row <= fromRect.endRow; row++) {
    for (let col = fromRect.startCol; col <= fromRect.endCol; col++) {
      emit('update:cell', row, col, 0)
    }
  }

  selectionData.data.forEach((rowData, rowIndex) => {
    rowData.forEach((value, colIndex) => {
      emit('update:cell', toPos.row + rowIndex, toPos.col + colIndex, value)
    })
  })
}

const handleCellClick = async (row: number, col: number) => {
  if (clipboard.isPasteMode.value) {
    await pasteAt(row, col)
    return
  }
}

const handlePointerDown = (row: number, col: number, event: PointerEvent) => {
  try {
    if (event.preventDefault) event.preventDefault()
  } catch {}

  lastInputWasTouch.value = event.pointerType === 'touch'

  if (clipboard.isPasteMode.value) {
    drawing.handleMouseMove(row, col)
    return
  }

  handleMouseDown(row, col, event as unknown as MouseEvent)
}

const handlePointerMove = (row: number, col: number, event: PointerEvent) => {
  lastInputWasTouch.value = event.pointerType === 'touch'
  handleMouseMove(row, col)
}

const handlePointerUp = (event: PointerEvent) => {
  void event
  lastInputWasTouch.value = event.pointerType === 'touch'

  drawing.stopDrawing()
  handleMouseUp()
}

const handleTouchStartCell = (row: number, col: number, event: TouchEvent) => {
  lastInputWasTouch.value = true

  if (props.currentTool === 'select') {
    isInteracting.value = true
    interactionStartPos.value = { row, col }

    if (selection.isPositionInSelection({ row, col })) {
      if (selection.startMove()) {
        return
      }
    }

    selection.clearSelection()
    selection.startSelection({ row, col })
  } else {
    drawing.handleTouchStart(event)
  }
}

const handleTouchMoveCell = (_row: number, _col: number, event: TouchEvent) => {
  lastInputWasTouch.value = true
  const touch = event.touches[0]
  if (!touch) return
  const target = document.elementFromPoint(
    touch.clientX,
    touch.clientY,
  ) as HTMLElement
  if (!target || !target.classList.contains('cell')) {
    return
  }
  const row = parseInt(target.dataset.row ?? '-1')
  const col = parseInt(target.dataset.col ?? '-1')
  if (row < 0 || col < 0) return

  lastValidMousePos.value = { row, col }

  if (props.currentTool === 'select' && isInteracting.value) {
    if (selection.isMoving.value) {
      const startPos = getInteractionStartPos()
      if (startPos && selection.selectionData.value) {
        const deltaRow = row - startPos.row
        const deltaCol = col - startPos.col

        const originalRect = selection.selectionData.value.originalRect
        const newPos = {
          row: originalRect.startRow + deltaRow,
          col: originalRect.startCol + deltaCol,
        }

        const gridHeight = props.gridData.length
        const gridWidth = props.gridData[0]?.length ?? 0
        const selectionHeight = selection.selectionData.value.height
        const selectionWidth = selection.selectionData.value.width

        const clampedNewPos = {
          row: Math.max(0, Math.min(gridHeight - selectionHeight, newPos.row)),
          col: Math.max(0, Math.min(gridWidth - selectionWidth, newPos.col)),
        }

        const tempRect = {
          startRow: clampedNewPos.row,
          startCol: clampedNewPos.col,
          endRow: clampedNewPos.row + selectionHeight - 1,
          endCol: clampedNewPos.col + selectionWidth - 1,
        }

        selection.setTempRect(tempRect)
      }
    } else if (selection.isSelecting.value) {
      selection.updateSelection({ row, col })
    }
  } else {
    drawing.handleTouchMove(event)
  }
}

const handleTouchEndCell = (_event?: TouchEvent) => {
  void _event
  lastInputWasTouch.value = true

  drawing.stopDrawing()

  if (isInteracting.value && props.currentTool === 'select') {
    if (selection.isMoving.value && interactionStartPos.value) {
      const startPos = interactionStartPos.value
      const currentPos = lastValidMousePos.value

      if (selection.selectionData.value) {
        const deltaRow = currentPos.row - startPos.row
        const deltaCol = currentPos.col - startPos.col

        const originalRect = selection.selectionData.value.originalRect
        const rawNewPos = {
          row: originalRect.startRow + deltaRow,
          col: originalRect.startCol + deltaCol,
        }

        const gridHeight = props.gridData.length
        const gridWidth = props.gridData[0]?.length ?? 0
        const selectionHeight = selection.selectionData.value.height
        const selectionWidth = selection.selectionData.value.width

        const clampedNewPos = {
          row: Math.max(
            0,
            Math.min(gridHeight - selectionHeight, rawNewPos.row),
          ),
          col: Math.max(0, Math.min(gridWidth - selectionWidth, rawNewPos.col)),
        }

        if (selection.moveSelectionTo(clampedNewPos)) {
          const selectionDataValue = selection.selectionData.value
          if (selectionDataValue) {
            moveSelectionData(selectionDataValue, originalRect, clampedNewPos)

            const newRect = {
              startRow: clampedNewPos.row,
              startCol: clampedNewPos.col,
              endRow: clampedNewPos.row + selectionDataValue.height - 1,
              endCol: clampedNewPos.col + selectionDataValue.width - 1,
            }
            selection.updateOriginalRect(newRect)
          }
        }
      }

      selection.setTempRect(null)
    } else if (selection.isSelecting.value) {
      selection.finishSelection()
    }
  }

  isInteracting.value = false
  interactionStartPos.value = null
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
    clipboard.copy({
      data: data.data.map((row) => [...row]),
      width: data.width,
      height: data.height,
      originalRect: { ...data.originalRect },
    })
    emit('clipboard-change', true)
  }
}

const handleCut = () => {
  if (selection.hasSelection.value && selection.selectionData.value) {
    const data = selection.selectionData.value
    clipboard.cut({
      data: data.data.map((row) => [...row]),
      width: data.width,
      height: data.height,
      originalRect: { ...data.originalRect },
    })

    const rect = selection.selectionRect.value!
    for (let row = rect.startRow; row <= rect.endRow; row++) {
      for (let col = rect.startCol; col <= rect.endCol; col++) {
        emit('update:cell', row, col, 0)
      }
    }

    selection.clearSelection()
    clipboard.exitPasteMode()

    emit('clipboard-change', true)
  }
}

const handlePaste = () => {
  if (clipboard.hasClipboardData()) {
    if (clipboard.enterPasteMode()) {
      emit('paste-start')
    }
  }
}

const handleSelectAll = () => {
  if (props.currentTool === 'select' && props.enableSelection) {
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
  if (selection.hasSelection.value && selection.selectionRect.value) {
    const rect = selection.selectionRect.value
    for (let row = rect.startRow; row <= rect.endRow; row++) {
      for (let col = rect.startCol; col <= rect.endCol; col++) {
        emit('update:cell', row, col, 0)
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

const pasteAt = async (row: number, col: number) => {
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
      emit('update:cell', row + rowIndex, col + colIndex, value)
    })
  })

  await nextTick()

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

const updateMousePosition = (event: MouseEvent) => {
  mousePosition.value = { x: event.clientX, y: event.clientY }
}

const moveSelectionBy = (dRow: number, dCol: number) => {
  if (!selection.hasSelection.value || !selection.selectionData.value) return

  const rect = selection.selectionRect.value
  if (!rect) return

  const newPos = { row: rect.startRow + dRow, col: rect.startCol + dCol }

  const gridHeight = props.gridData.length
  const gridWidth = props.gridData[0]?.length ?? 0
  const selHeight = selection.selectionData.value.height
  const selWidth = selection.selectionData.value.width

  const clamped = {
    row: Math.max(0, Math.min(gridHeight - selHeight, newPos.row)),
    col: Math.max(0, Math.min(gridWidth - selWidth, newPos.col)),
  }

  const originalRect = selection.selectionRect.value!
  if (selection.moveSelectionTo(clamped)) {
    moveSelectionData(selection.selectionData.value!, originalRect, clamped)
    selection.updateOriginalRect({
      startRow: clamped.row,
      startCol: clamped.col,
      endRow: clamped.row + selHeight - 1,
      endCol: clamped.col + selWidth - 1,
    })
  }
}

const moveUp = () => moveSelectionBy(-1, 0)
const moveDown = () => moveSelectionBy(1, 0)
const moveLeft = () => moveSelectionBy(0, -1)
const moveRight = () => moveSelectionBy(0, 1)

const getMoveButtonStyle = (dir: 'up' | 'down' | 'left' | 'right') => {
  const rect = selection.selectionRect.value
  if (!rect) return { display: 'none' }

  const normalized = {
    startRow: Math.min(rect.startRow, rect.endRow),
    startCol: Math.min(rect.startCol, rect.endCol),
    endRow: Math.max(rect.startRow, rect.endRow),
    endCol: Math.max(rect.startCol, rect.endCol),
  }

  const width = normalized.endCol - normalized.startCol + 1
  const height = normalized.endRow - normalized.startRow + 1
  const cell = 'var(--cell-size)'

  switch (dir) {
    case 'up': {
      const left = `calc(( ${normalized.startCol} + ${Math.floor(width / 2)} + 1) * ${cell})`
      const top = `calc(( ${normalized.startRow} + 1) * ${cell} - 0.6 * ${cell})`
      return `${`position:absolute;left:${left};top:${top};z-index:2000;`}`
    }
    case 'down': {
      const left = `calc(( ${normalized.startCol} + ${Math.floor(width / 2)} + 1) * ${cell})`
      const top = `calc(( ${normalized.endRow} + 2) * ${cell} + 0.2 * ${cell})`
      return `${`position:absolute;left:${left};top:${top};z-index:2000;`}`
    }
    case 'left': {
      const left = `calc(( ${normalized.startCol} + 1) * ${cell} - 0.6 * ${cell})`
      const top = `calc(( ${normalized.startRow} + ${Math.floor(height / 2)} + 1) * ${cell})`
      return `${`position:absolute;left:${left};top:${top};z-index:2000;`}`
    }
    case 'right': {
      const left = `calc(( ${normalized.endCol} + 2) * ${cell} + 0.2 * ${cell})`
      const top = `calc(( ${normalized.startRow} + ${Math.floor(height / 2)} + 1) * ${cell})`
      return `${`position:absolute;left:${left};top:${top};z-index:2000;`}`
    }
  }
}

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  if (!target) return

  if (
    target.closest('.editor-actions') ||
    target.closest('.action-button') ||
    target.closest('.tool-buttons') ||
    target.closest('[data-preserve-selection]')
  ) {
    return
  }

  if (!target.closest('.grid-container')) {
    if (clipboard.isPasteMode.value) clipboard.exitPasteMode()
    if (selection.hasSelection.value) selection.clearSelection()
  }
}

onMounted(() => {
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mousemove', updateMousePosition)
  document.addEventListener('touchend', handleTouchEndCell)
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', updateMousePosition)
  document.removeEventListener('touchend', handleTouchEndCell)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleDocumentClick)
})

watch(
  () => props.currentTool,
  (newTool) => {
    selection.setTool(newTool)
    drawing.stopDrawing()
    selection.cancelOperation()
    clipboard.exitPasteMode()
    emit('tool-change', newTool)
  },
)

watch(selection.hasSelection, (hasSelection) => {
  emit('selection-change', hasSelection)
})

watch(clipboard.clipboardData, () => {
  emit('clipboard-change', clipboard.hasClipboardData())
})

defineExpose({
  selection,
  clipboard,
  drawing,
  handleCopy,
  handleCut,
  handlePaste,
  handleSelectAll,
  handleDelete,
  clearSelection: () => selection.clearSelection(),
})
</script>

<style scoped>
.grid-container {
  display: grid;
  gap: 0;
  padding-right: calc(var(--cell-size) * 0.5);
  width: fit-content;
  position: relative;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  outline: none;
}

.header-row,
.grid-row {
  display: contents;
}

.corner-cell {
  width: var(--cell-size);
  height: var(--cell-size);
}

.header-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  font-family: var(--monospace-font);
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background-color: white;
  cursor: pointer;
  transition: none !important;
  box-sizing: border-box;
  position: relative;
}

.cell.filled {
  background-color: black;
}

.selection-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  display: grid;
  gap: 0;
}

.selection-row {
  display: contents;
}

.selection-header-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  pointer-events: none;
}

.selection-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  pointer-events: none;
  position: relative;
}

.selection-overlay {
  z-index: 15;
  box-sizing: border-box;
}

.selection-overlay.selection-selecting {
  border: 2px solid var(--primary-color);
  background-color: rgba(78, 167, 46, 0.1);
}

.selection-overlay.selection-selected {
  border: 2px dashed var(--primary-color);
  background-color: rgba(78, 167, 46, 0.1);
  animation: marching-ants 1s linear infinite;
}

.selection-overlay.selection-moving {
  border: 2px dashed #0ea5e9;
  background-color: rgba(14, 165, 233, 0.2);
}

.selection-overlay.selection-copying {
  border: 2px dashed #22c55e;
  background-color: rgba(34, 197, 94, 0.1);
}

.selection-overlay.temp-selection {
  opacity: 0.8;
}

.selection-cell-selected {
  background-color: rgba(var(--primary-color-rgb), 0.15);
}

.selection-cell-temp {
  background-color: rgba(var(--info-color-rgb), 0.2);
}

.selection-cell-top {
  border-top: 1px solid var(--primary-color);
}

.selection-cell-bottom {
  border-bottom: 1px solid var(--primary-color);
}

.selection-cell-left {
  border-left: 1px solid var(--primary-color);
}

.selection-cell-right {
  border-right: 1px solid var(--primary-color);
}

@keyframes marching-ants {
  0% {
    border-image: repeating-linear-gradient(
        90deg,
        var(--primary-color) 0,
        var(--primary-color) 4px,
        transparent 4px,
        transparent 8px
      )
      2;
  }
  100% {
    border-image: repeating-linear-gradient(
        90deg,
        var(--primary-color) 4px,
        var(--primary-color) 8px,
        transparent 8px,
        transparent 12px
      )
      2;
  }
}

.paste-cursor {
  pointer-events: none;
  opacity: 0.8;
  animation: pulse 1s ease-in-out infinite alternate;
}

.paste-cursor {
  display: grid;
  gap: 0;
  box-sizing: border-box;
}

.paste-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background-color: transparent;
}

.paste-cell.filled {
  background-color: rgba(0, 0, 0, 0.9);
}

.move-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}

.move-button:active {
  transform: scale(0.95);
}

@keyframes pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.8;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .header-cell {
    font-size: 1.5em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .header-cell {
    font-size: 2em;
  }
}
</style>
