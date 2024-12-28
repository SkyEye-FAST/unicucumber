<template>
  <div class="container">
    <EditorHeader @openSettings="showSettings = true" @toggleSidebar="toggleSidebar" />
    <SettingsModal
      v-model:show="showSettings"
      v-model:drawMode="drawMode"
      v-model:cursorEffect="cursorEffect"
      v-model:glyphWidth="glyphWidth"
      @save="saveSettings"
    />

    <GlyphGrid :gridData="gridData" :drawMode="drawMode" :drawValue="drawValue" :cursorEffect="cursorEffect"
      @update:cell="updateCell" />

    <ToolButtons v-model:modelValue="drawValue" />
    <HexCodeInput v-model:hexCode="hexCode" @update:grid="updateGridFromHex" />
    <DownloadButtons :gridData="gridData" />

    <div class="editor-actions">
      <button class="action-button" @click="addToGlyphset">
        添加到字形集
      </button>
    </div>

    <div :class="['sidebar', { active: isSidebarActive }]">
      <div class="sidebar-resizer" @mousedown="startResize"></div>
      <GlyphManager
        v-if="isSidebarActive"
        :glyphs="glyphs"
        :onGlyphChange="setGlyphs"
        :prefillData="prefillData"
        @edit-in-grid="handleGlyphEdit"
        @clear-prefill="clearPrefillData"
      />
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

const { drawMode, cursorEffect, showSettings, saveSettings, glyphWidth } = useSettings();
const { gridData, updateCell, resetGrid, updateGrid } = useGridData(glyphWidth.value);
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

onMounted(() => {
  updateHexCode();
  document.addEventListener("contextmenu", preventDefault);
});

onBeforeUnmount(() => {
  document.removeEventListener("contextmenu", preventDefault);
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
  justify-content: center;
}

.action-button {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-button:hover {
  background: #45a049;
}
</style>
