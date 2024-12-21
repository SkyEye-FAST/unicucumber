<template>
  <div class="grid-container">
    <!-- Header row with column numbers -->
    <div class="header-row">
      <div class="corner-cell"></div>
      <div v-for="colIndex in 16" :key="`col-${colIndex}`" class="header-cell"
        :style="{ color: colIndex % 2 ? '#000' : '#f4005f' }">
        {{ (colIndex - 1).toString(16).toUpperCase() }}
      </div>
    </div>

    <!-- Grid rows -->
    <div v-for="(row, rowIndex) in gridData" :key="`row-${rowIndex}`" class="grid-row">
      <div class="header-cell" :style="{ color: rowIndex % 2 ? '#f4005f' : '#000' }">
        {{ rowIndex.toString(16).toUpperCase() }}
      </div>
      <div v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`"
        :class="['cell', { filled: cell === 1 }]" :style="getCellStyle(rowIndex, cellIndex)"
        @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)" @mouseover="handleHover(rowIndex, cellIndex)"
        @mouseleave="clearHover" @mouseup="stopDrawing" @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useDrawing } from '@/composables/useDrawing';

const props = defineProps({
  gridData: {
    type: Array,
    required: true
  },
  drawMode: {
    type: String,
    required: true
  },
  drawValue: {
    type: Number,
    required: true
  },
  cursorEffect: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:cell']);

const {
  isDrawing,
  hoverCell,
  startDrawing,
  stopDrawing,
  handleHover,
  clearHover,
  handleTouchStart,
  handleTouchMove
} = useDrawing(props, emit);

const getCellStyle = (rowIndex, cellIndex) => {
  return props.cursorEffect &&
    hoverCell.value.row === rowIndex &&
    hoverCell.value.col === cellIndex
    ? { backgroundColor: props.drawValue === 1 ? 'black' : 'white' }
    : {};
};
</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: var(--cell-size) repeat(16, var(--cell-size));
  gap: 0;
  padding-right: calc(var(--cell-size) * 0.5);
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
  font-family: "Fira Code", monospace;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background-color: #fff;
  border: 0.5px solid var(--primary-darker);
  cursor: pointer;
}

.cell.filled {
  background-color: black;
}
</style>
