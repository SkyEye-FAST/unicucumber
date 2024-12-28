<template>
  <div class="container">
    <EditorHeader @openSettings="showSettings = true" @toggleSidebar="toggleSidebar" />
    <SettingsModal v-model:show="showSettings" v-model:drawMode="drawMode" v-model:cursorEffect="cursorEffect"
      v-model:glyphWidth="glyphWidth" @save="saveSettings" />

    <GlyphGrid :gridData="gridData" :drawMode="drawMode" :drawValue="drawValue" :cursorEffect="cursorEffect"
      @update:cell="updateCell" />

    <div class="editor-actions">
      <div class="action-group">
        <button class="action-button secondary" @click="handleClear" title="清空编辑器">
          <span class="material-symbols-outlined">mop</span>
          清空
        </button>
        <button class="action-button primary" @click="addToGlyphset" title="将当前字形添加到字形集">
          <span class="material-symbols-outlined">add_box</span>
          添加到字形集
        </button>
      </div>
      <div class="history-controls">
        <button class="icon-button" @click="handleUndo" :disabled="!canUndo" title="撤销(Ctrl+Z)">
          <span class="material-symbols-outlined">undo</span>
        </button>
        <button class="icon-button" @click="handleRedo" :disabled="!canRedo" title="重做(Ctrl+Y)">
          <span class="material-symbols-outlined">redo</span>
        </button>
      </div>
    </div>
    <ToolButtons v-model:modelValue="drawValue" />
    <HexCodeInput v-model:hexCode="hexCode" @update:grid="updateGridFromHex" />
    <DownloadButtons :gridData="gridData" />

    <div :class="['sidebar', { active: isSidebarActive }]">
      <div class="sidebar-resizer" @mousedown="startResize"></div>
      <GlyphManager v-if="isSidebarActive" :glyphs="glyphs" :onGlyphChange="setGlyphs" :prefillData="prefillData"
        @edit-in-grid="handleGlyphEdit" @clear-prefill="clearPrefillData" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import EditorHeader from './EditorHeader.vue';
import SettingsModal from './SettingsModal.vue';
import GlyphGrid from './GlyphGrid.vue';
import ToolButtons from './ToolButtons.vue';
import HexCodeInput from './HexCodeInput.vue';
import DownloadButtons from './DownloadButtons.vue';
import GlyphManager from './GlyphManager.vue';
import { useSettings } from '@/composables/useSettings';
import { useGridData } from '@/composables/useGridData';
import { useHexCode } from '@/composables/useHexCode';
import { useHistory } from '@/composables/useHistory';

const { drawMode, cursorEffect, showSettings, saveSettings, glyphWidth } = useSettings();
const { gridData, resetGrid, updateGrid } = useGridData(glyphWidth.value);
const { hexCode, updateHexCode, updateGridFromHex } = useHexCode(gridData, resetGrid);
const drawValue = ref(1);
const isSidebarActive = ref(false);
const glyphs = ref([]);
const prefillData = ref(null);

const toggleSidebar = () => {
  isSidebarActive.value = !isSidebarActive.value;
};

const setGlyphs = (newGlyphs) => {
  glyphs.value = newGlyphs;
};

const preventDefault = (e) => e.preventDefault();

const sidebarWidth = ref(400);
const minWidth = 300;
const maxWidth = 800;

const startResize = (e) => {
  const startX = e.clientX;
  const startWidth = sidebarWidth.value;

  const doResize = (e) => {
    const newWidth = startWidth + (e.clientX - startX);
    sidebarWidth.value = Math.min(Math.max(newWidth, minWidth), maxWidth);
  };

  const stopResize = () => {
    window.removeEventListener('mousemove', doResize);
    window.removeEventListener('mouseup', stopResize);
  };

  window.addEventListener('mousemove', doResize);
  window.addEventListener('mouseup', stopResize);
};

const addToGlyphset = () => {
  prefillData.value = {
    hexValue: hexCode.value
  };
  isSidebarActive.value = true;
};


const hexToGrid = (hexStr) => {

  const width = hexStr.length <= 32 ? 8 : 16;
  const height = 16;


  glyphWidth.value = width;


  const binary = hexStr.split('')
    .map(char => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('');


  const grid = [];
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      const index = i * width + j;
      row.push(index < binary.length ? (binary[index] === '1' ? 1 : 0) : 0);
    }
    grid.push(row);
  }

  console.log('Loading glyph:', {
    hexStr,
    width,
    binaryLength: binary.length,
    grid
  });

  return grid;
};


const handleGlyphEdit = (hexValue) => {
  try {
    const newGrid = hexToGrid(hexValue);

    updateGrid(newGrid[0].length);

    gridData.value = newGrid;

    hexCode.value = hexValue;
  } catch (error) {
    console.error('Error loading glyph:', error);
  }
};

const clearPrefillData = () => {
  prefillData.value = null;
};


watch(glyphWidth, (newWidth) => {
  updateGrid(newWidth);
  updateHexCode();
});


const { pushState, undo, redo, canUndo, canRedo } = useHistory(gridData.value);


const handleGridUpdate = (newGrid) => {
  gridData.value = newGrid;
  pushState(newGrid);
  updateHexCode();
};


const handleClear = () => {
  const newGrid = Array.from({ length: 16 }, () => Array(gridData.value[0].length).fill(0));
  handleGridUpdate(newGrid);
};


const handleUndo = () => {
  const prevState = undo();
  if (prevState) {
    gridData.value = prevState;
    updateHexCode();
  }
};

const handleRedo = () => {
  const nextState = redo();
  if (nextState) {
    gridData.value = nextState;
    updateHexCode();
  }
};


const updateCell = (rowIndex, cellIndex, value) => {
  const newGrid = gridData.value.map(row => [...row]);
  newGrid[rowIndex][cellIndex] = value;
  handleGridUpdate(newGrid);
};


const handleKeydown = (e) => {
  if (e.ctrlKey) {
    if (e.key === 'z') {
      e.preventDefault();
      handleUndo();
    } else if (e.key === 'y') {
      e.preventDefault();
      handleRedo();
    }
  }
};

onMounted(() => {
  updateHexCode();
  document.addEventListener("contextmenu", preventDefault);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("contextmenu", preventDefault);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: v-bind(sidebarWidth + 'px');
  height: 100%;
  background-color: var(--background-light);
  box-shadow: 2px 0 5px var(--modal-overlay);
  transition: transform 0.3s ease;
  transform: translateX(-100%);
  z-index: 1000;
  overflow: hidden;
  will-change: transform;
}

.sidebar.active {
  transform: translateX(0);
}

.sidebar-resizer {
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background-color: var(--border-color);
  cursor: col-resize;
  transition: background-color 0.3s;
}

.sidebar-resizer:hover {
  background-color: var(--info-color);
}

.editor-actions {
  margin: 1rem;
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.action-group {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s;
}

.action-button.primary {
  background: var(--success-color);
  color: white;
}

.action-button.primary:hover {
  background: var(--success-hover);
}

.action-button.secondary {
  background: var(--danger-color);
  color: white;
}

.action-button.secondary:hover {
  background: var(--danger-hover);
}

.action-button .material-symbols-outlined {
  font-size: 20px;
}

.history-controls {
  display: flex;
  gap: 4px;
}

.icon-button {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-button:hover:not(:disabled) {
  background: var(--background-hover);
  border-color: var(--border-hover);
  color: var(--text-color);
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button .material-symbols-outlined {
  font-size: 20px;
}
</style>
