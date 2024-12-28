<template>
  <div class="grid-container" :style="gridStyle">
    <!-- Header row with column numbers -->
    <div class="header-row">
      <div class="corner-cell"></div>
      <div v-for="colIndex in gridData[0].length" :key="`col-${colIndex}`" class="header-cell"
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
import { computed } from 'vue';
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

// 计算网格容器样式
const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--cell-size) repeat(${props.gridData[0].length}, var(--cell-size))`
}));
</script>

<style scoped>
.grid-container {
  display: grid;
  gap: 0;
  padding-right: calc(var(--cell-size) * 0.5);
  margin: 0 auto;
  /* 居中显示 */
  width: fit-content;
  /* 根据内容自适应宽度 */
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
