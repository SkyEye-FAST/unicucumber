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
        :class="['cell', { filled: cell === 1 }]"
        :style="getCellStyle(rowIndex, cellIndex)"
        @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)"
        @mouseover="handleHover(rowIndex, cellIndex)"
        @mouseleave="clearHover"
        @mouseup="stopDrawing"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
      ></div>
    </div>
  </div>
  <div class="preview-container">
    <div class="preview-grid">
      <div
        v-for="(row, rowIndex) in gridData"
        :key="`preview-row-${rowIndex}`"
        class="preview-row"
      >
        <div
          v-for="(cell, cellIndex) in row"
          :key="`preview-cell-${rowIndex}-${cellIndex}`"
          :class="['preview-cell', { filled: cell === 1 }]"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDrawing } from '@/composables/useDrawing'

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
})

const emit = defineEmits(['update:cell'])

const {
  hoverCell,
  startDrawing,
  stopDrawing,
  handleHover,
  clearHover,
  handleTouchStart,
  handleTouchMove,
} = useDrawing(props, emit)

const getCellStyle = (rowIndex, cellIndex) => {
  return props.cursorEffect &&
    hoverCell.value.row === rowIndex &&
    hoverCell.value.col === cellIndex
    ? { backgroundColor: props.drawValue === 1 ? 'black' : 'white' }
    : {}
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--cell-size) repeat(${props.gridData[0].length}, var(--cell-size))`,
}))
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
  border: v-bind('showBorder ? "0.5px solid var(--primary-darker)" : "none"');
  cursor: pointer;
}

.cell.filled {
  background-color: black;
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

/* 预览样式 */
.preview-container {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.preview-grid {
  display: inline-block;
  border: 1px solid var(--border-color);
  padding: 2px;
}

.preview-row {
  display: flex;
  height: 2px;
}

.preview-cell {
  width: 2px;
  height: 2px;
  background-color: white;
}

.preview-cell.filled {
  background-color: black;
}

@media (orientation: portrait) and (max-width: 768px) {
  .preview-row {
    height: 3px;
  }

  .preview-cell {
    width: 3px;
    height: 3px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .preview-row {
    height: 4px;
  }

  .preview-cell {
    width: 4px;
    height: 4px;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .preview-row {
    height: 5px;
  }

  .preview-cell {
    width: 5px;
    height: 5px;
  }
}
</style>
