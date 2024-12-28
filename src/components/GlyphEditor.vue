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

const sidebarWidth = ref(400); // 默认宽度
const minWidth = 300; // 最小宽度
const maxWidth = 800; // 最大宽度

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

// 将十六进制字符串转换为二维数组，并自动调整宽度
const hexToGrid = (hexStr) => {
  // 根据输入的hex字符串长度决定宽度
  const width = hexStr.length <= 32 ? 8 : 16;
  const height = 16;

  // 更新编辑器宽度设置
  glyphWidth.value = width;

  // 转换为二进制字符串
  const binary = hexStr.split('')
    .map(char => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('');

  // 创建网格
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

// 处理字形编辑
const handleGlyphEdit = (hexValue) => {
  try {
    const newGrid = hexToGrid(hexValue);
    // 先更新网格大小
    updateGrid(newGrid[0].length);
    // 再更新网格数据
    gridData.value = newGrid;
    // 保持原始hex值
    hexCode.value = hexValue;
  } catch (error) {
    console.error('Error loading glyph:', error);
  }
};

const clearPrefillData = () => {
  prefillData.value = null;
};

// 添加对字形宽度变化的监听
watch(glyphWidth, (newWidth) => {
  updateGrid(newWidth);
  updateHexCode();
});

// 添加历史记录管理
const { pushState, undo, redo, canUndo, canRedo } = useHistory(gridData.value);

// 处理网格更新
const handleGridUpdate = (newGrid) => {
  gridData.value = newGrid;
  pushState(newGrid);
  updateHexCode();
};

// 清空编辑器
const handleClear = () => {
  const newGrid = Array.from({ length: 16 }, () => Array(gridData.value[0].length).fill(0));
  handleGridUpdate(newGrid);
};

// 撤销重做处理
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

// 修改 updateCell 以支持历史记录
const updateCell = (rowIndex, cellIndex, value) => {
  const newGrid = gridData.value.map(row => [...row]);
  newGrid[rowIndex][cellIndex] = value;
  handleGridUpdate(newGrid);
};

// 添加键盘快捷键
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
  left: -100%;
  height: 100%;
  background-color: #f8f9fa;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);
  transition: left 0.3s ease;
  z-index: 1000;
  overflow: hidden;
}

.sidebar.active {
  left: 0;
  width: v-bind(sidebarWidth + 'px');
}

.sidebar-resizer {
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background-color: #ddd;
  cursor: col-resize;
  transition: background-color 0.3s;
}

.sidebar-resizer:hover {
  background-color: #007bff;
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
  background: #4CAF50;
  color: white;
}

.action-button.primary:hover {
  background: #45a049;
}

.action-button.secondary {
  background: #f44336;
  color: white;
}

.action-button.secondary:hover {
  background: #d32f2f;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-button:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #bbb;
  color: #333;
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button .material-symbols-outlined {
  font-size: 20px;
}
</style>
