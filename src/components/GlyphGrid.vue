<template>
  <div class="grid-container" :style="gridStyle">
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
          { border: showBorder ? '0.1px solid var(--primary-darker)' : 'none' },
        ]"
        @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)"
        @mouseover="handleHover(rowIndex, cellIndex)"
        @mouseleave="clearHover"
        @mouseup="stopDrawing"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useDrawing } from '@/composables/useDrawing'
import { useHistory } from '@/composables/useHistory'

const props = defineProps({
  gridData: {
    type: Array,
    required: true,
  },
  drawMode: {
    type: String,
    required: true,
  },
  drawValue: {
    type: Number,
    required: true,
  },
  cursorEffect: {
    type: Boolean,
    required: true,
  },
  showBorder: {
    type: Boolean,
    required: true,
  },
  moveMode: {
    type: Boolean,
    default: false,
  },
  clipboardData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'update:cell',
  'copy-selection',
  'selection-complete',
  'paste-complete',
  'preview-move',
  'move-to',
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
} = useDrawing(props, emit)

const { initHistory } = useHistory(props.gridData)

watch(
  () => props.gridData,
  (newData) => {
    initHistory(newData)
  },
  { immediate: true },
)

const getCellStyle = (rowIndex, cellIndex) => {
  return props.cursorEffect &&
    hoverCell.value.row === rowIndex &&
    hoverCell.value.col === cellIndex
    ? { backgroundColor: props.drawValue === 1 ? 'black' : 'white' }
    : {}
}

const isInSelection = (rowIndex, cellIndex) => {
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

const getCellIndex = (target) => {
  const cellIndex = Array.from(target.parentNode.children).indexOf(target) - 1
  const rowIndex =
    Array.from(target.parentNode.parentNode.children).indexOf(
      target.parentNode,
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
}

.cell.filled {
  background-color: black;
}

.cell.selected {
  background-color: rgba(0, 123, 255, 0.2) !important;
  border: 0.1px solid rgba(0, 123, 255, 0.8) !important;
  z-index: 1;
}

.cell.selected-filled {
  background-color: rgba(0, 0, 0, 0.8) !important;
  border: 0.1px solid rgba(0, 123, 255, 0.8) !important;
  z-index: 1;
}

.cell.dragging {
  opacity: 0.4;
  position: relative;
  cursor: move;
  z-index: 2;
  background-color: var(--primary-color) !important;
  border: 0.1px solid var(--primary-color) !important;
}

.cell.preview {
  border: 2px solid var(--primary-color) !important;
  background-color: rgba(0, 123, 255, 0.2) !important;
  z-index: 3;
}

.cell.preview.filled {
  background-color: rgba(0, 123, 255, 0.5) !important;
}

.cell.is-dragging {
  cursor: move;
  opacity: 0.7;
}

@media (orientation: portrait) and (max-width: 768px) {
  .cell {
    border-width: 0.2px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .header-cell {
    font-size: 1.5em;
  }

  .cell {
    border-width: 0.3px;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .header-cell {
    font-size: 2em;
  }
}
</style>
