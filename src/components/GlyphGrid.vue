<template>
  <div
    class="grid-container"
    :style="gridStyle"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Header row with column numbers -->
    <div class="header-row">
      <div class="corner-cell"></div>
      <div
        v-for="colIndex in gridData[0].length"
        :key="`col-${colIndex}`"
        class="header-cell"
        :style="{
          color: colIndex % 2 ? 'var(--text-color)' : 'var(--danger-color)',
        }"
      >
        {{ (colIndex - 1).toString(16).toUpperCase() }}
      </div>
    </div>

    <!-- Selection Overlay -->
    <div
      class="selection-overlay"
      v-if="selectionStart || isDragging"
      :style="{
        gridColumnStart: 2,
        gridTemplateColumns: `repeat(${gridData[0].length}, var(--cell-size))`,
      }"
    >
      <div class="overlay-content">
        <div
          v-for="(row, rowIndex) in gridData"
          :key="`overlay-row-${rowIndex}`"
          class="overlay-row"
        >
          <div
            v-for="(cell, cellIndex) in row"
            :key="`overlay-cell-${rowIndex}-${cellIndex}`"
            :class="[
              'overlay-cell',
              {
                'overlay-selected': isInSelection(rowIndex, cellIndex),
                'overlay-dragging':
                  isDragging && isInSelection(rowIndex, cellIndex),
              },
            ]"
          ></div>
        </div>
      </div>
    </div>

    <!-- Grid rows -->
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
        :class="[
          'cell',
          {
            filled: cell === 1,
            selected: isInSelection(rowIndex, cellIndex),
            'selected-filled': isInSelection(rowIndex, cellIndex) && cell === 1,
            dragging: isDragging && isInSelection(rowIndex, cellIndex),
          },
        ]"
        :data-row="rowIndex"
        :data-col="cellIndex"
        :style="[
          getCellStyle(rowIndex, cellIndex),
          isDragging && moveMode ? { cursor: 'move' } : null,
          {
            boxShadow: showBorder
              ? 'inset 0 0 0 0.2px var(--primary-darker)'
              : 'none',
          },
        ]"
        @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)"
        @contextmenu.prevent
        @mouseover="handleHover(rowIndex, cellIndex)"
        @mouseleave="clearHover"
        @mouseup="stopDrawing"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDrawing } from '@/composables/useDrawing'
import { useHistory } from '@/composables/useHistory'

interface Props {
  gridData: number[][]
  drawMode: string
  drawValue: number
  cursorEffect: boolean
  showBorder: boolean
  moveMode: boolean
  clipboardData: Record<
    string,
    {
      area: {
        start: { row: number; col: number }
        end: { row: number; col: number }
      }
      data: number[][]
    }
  > | null
}

const props = withDefaults(defineProps<Props>(), {
  moveMode: false,
  clipboardData: null,
})

const emit = defineEmits([
  'update:cell',
  'update:drawValue',
  'copy-selection',
  'selection-complete',
  'paste-complete',
  'preview-move',
  'move-to',
  'draw-complete',
  'drag-complete',
])

const {
  hoverCell,
  startDrawing,
  stopDrawing,
  handleHover,
  clearHover,
  selectionStart,
  selectionEnd,
  isSelecting,
  copySelection,
  pasteSelection,
  isDragging,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = useDrawing(props, emit)

const { initHistory } = useHistory(props.gridData)

watch(
  () => props.gridData,
  (newData) => {
    initHistory(newData)
  },
  { immediate: true },
)

const getCellStyle = (
  rowIndex: number,
  cellIndex: number,
): Record<string, string> => {
  return props.cursorEffect &&
    hoverCell.value.row === rowIndex &&
    hoverCell.value.col === cellIndex
    ? {
        backgroundColor:
          props.drawValue === 2
            ? 'var(--grid-selection-bg)'
            : props.drawValue === 1
              ? 'black'
              : 'white',
      }
    : {}
}

const isInSelection = (rowIndex: number, cellIndex: number): boolean => {
  if (!selectionStart.value || !selectionEnd.value) return false

  const minRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
  const maxRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
  const minCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
  const maxCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

  return (
    rowIndex >= minRow &&
    rowIndex <= maxRow &&
    cellIndex >= minCol &&
    cellIndex <= maxCol
  )
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--cell-size) repeat(${props.gridData[0].length}, var(--cell-size))`,
}))
const handleCopySelection = () => {
  const selection = copySelection()
  if (selection) {
    emit('copy-selection', selection)
  }
  return selection
}

const getCellIndex = (target: HTMLElement) => {
  const cellIndex =
    Array.from(target.parentNode?.children || []).indexOf(target) - 1
  const rowIndex =
    Array.from(target.parentNode?.parentNode?.children || []).indexOf(
      target.parentNode as Element,
    ) - 1
  return { rowIndex, cellIndex }
}

defineExpose({
  handleCopySelection,
  getCellIndex,
  pasteSelection,
  clearSelection: () => {
    selectionStart.value = null
    selectionEnd.value = null
    isSelecting.value = false
  },
  getSelectionArea: () => ({
    start: selectionStart.value,
    end: selectionEnd.value,
  }),
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

.cell.selected::before,
.cell.selected::after,
.cell.selected-filled::before,
.cell.dragging::before {
  display: none;
}

.cell.selected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  mix-blend-mode: lighten;
  z-index: 2;
}

.cell.selected::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--grid-selection-bg);
  mix-blend-mode: multiply;
  z-index: 2;
  box-shadow: inset 0 0 0 0.5px var(--grid-selection-border);
}

.cell.selected-filled::before {
  background-color: var(--grid-selection-filled);
}

.cell.dragging {
  position: relative;
  cursor: move;
  z-index: 3;
  background-color: white !important;
}

.cell.dragging.filled {
  background-color: black !important;
}

.cell.dragging::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--grid-dragging-bg);
  box-shadow: inset 0 0 0 0.2px var(--primary-color-50);
  opacity: 0.3;
  z-index: 1;
  pointer-events: none;
}

.cell.preview {
  box-shadow: inset 0 0 0 1px var(--primary-color) !important;
  background-color: var(--grid-selection-bg) !important;
  z-index: 3;
}

.cell.is-dragging {
  cursor: move;
  opacity: 0.7;
}

.selection-overlay {
  position: absolute;
  top: var(--cell-size);
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2;
  display: grid;
}

.overlay-content {
  display: contents;
}

.overlay-row {
  display: contents;
}

.overlay-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  position: relative;
  box-sizing: border-box;
}

.overlay-selected {
  background-color: var(--grid-selection-bg);
  box-shadow: inset 0 0 0 1px var(--grid-selection-border);
  opacity: 0.3;
}

.overlay-dragging {
  background-color: var(--grid-dragging-bg);
  opacity: 0.4;
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .header-cell {
    font-size: 1.5em;
  }

  .cell {
    box-shadow: inset 0 0 0 1px var(--primary-color-30) !important;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .header-cell {
    font-size: 2em;
  }

  .cell {
    box-shadow: inset 0 0 0 1px var(--primary-color-30) !important;
  }
}
</style>
