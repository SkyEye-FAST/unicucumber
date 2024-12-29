<template>
  <div class="container">
    <EditorHeader
      @openSettings="showSettings = true"
      @toggleSidebar="toggleSidebar"
    />
    <SettingsModal v-model="showSettings" v-model:settings="settings" />

    <GlyphGrid
      :gridData="gridData"
      :drawMode="settings.drawMode"
      :drawValue="drawValue"
      :cursorEffect="settings.cursorEffect"
      @update:cell="updateCell"
    />

    <div class="editor-actions">
      <div class="action-group">
        <button
          class="action-button secondary"
          @click="handleClear"
          :title="$t('editor.actions.clear.title')"
        >
          <span class="material-symbols-outlined">mop</span>
          {{ $t('editor.actions.clear.button') }}
        </button>
        <button
          class="action-button primary"
          @click="addToGlyphset"
          :title="$t('editor.actions.add_to_glyphset.title')"
        >
          <span class="material-symbols-outlined">add_box</span>
          {{ $t('editor.actions.add_to_glyphset.button') }}
        </button>
      </div>
      <div class="history-controls">
        <button
          class="icon-button"
          @click="handleUndo"
          :disabled="!canUndo"
          :title="$t('editor.actions.undo.title')"
        >
          <span class="material-symbols-outlined">undo</span>
        </button>
        <button
          class="icon-button"
          @click="handleRedo"
          :disabled="!canRedo"
          :title="$t('editor.actions.redo.title')"
        >
          <span class="material-symbols-outlined">redo</span>
        </button>
      </div>
    </div>
    <ToolButtons v-model:modelValue="drawValue" />
    <HexCodeInput v-model:hexCode="hexCode" @update:grid="updateGridFromHex" />
    <DownloadButtons :gridData="gridData" />

    <div :class="['sidebar', { active: isSidebarActive }]">
      <div class="sidebar-resizer" @mousedown="startResize"></div>
      <button class="btn-close-sidebar" @click="handleCloseSidebar">
        <span class="material-symbols-outlined">close</span>
      </button>
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
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import EditorHeader from './EditorHeader.vue'
import SettingsModal from './SettingsModal.vue'
import GlyphGrid from './GlyphGrid.vue'
import ToolButtons from './ToolButtons.vue'
import HexCodeInput from './HexCodeInput.vue'
import DownloadButtons from './DownloadButtons.vue'
import GlyphManager from './GlyphManager.vue'
import { useSettings } from '@/composables/useSettings'
import { useGridData } from '@/composables/useGridData'
import { useHexCode } from '@/composables/useHexCode'
import { useHistory } from '@/composables/useHistory'
import { useSidebar } from '@/composables/useSidebar'
import { hexToGrid } from '@/utils/hexUtils'

const { settings, showSettings } = useSettings()

const { gridData, resetGrid, updateGrid } = useGridData(
  computed(() => settings.value.glyphWidth),
)
const { hexCode, updateHexCode, updateGridFromHex } = useHexCode(
  gridData,
  resetGrid,
)
const { isSidebarActive, sidebarWidth, toggleSidebar, startResize } =
  useSidebar()

const drawValue = ref(1)
const glyphs = ref([])
const prefillData = ref(null)

const setGlyphs = (newGlyphs) => {
  glyphs.value = newGlyphs
}

const preventDefault = (e) => e.preventDefault()

const addToGlyphset = () => {
  prefillData.value = {
    hexValue: hexCode.value,
  }
  isSidebarActive.value = true
}

const handleGlyphEdit = (hexValue) => {
  try {
    const newGrid = hexToGrid(hexValue)

    updateGrid(newGrid[0].length)

    gridData.value = newGrid

    hexCode.value = hexValue
  } catch (error) {
    console.error('Error loading glyph:', error)
  }
}

const clearPrefillData = () => {
  prefillData.value = null
}

watch(
  () => settings.value.glyphWidth,
  (newWidth) => {
    updateGrid(newWidth)
    updateHexCode()
  },
)

const { pushState, undo, redo, canUndo, canRedo } = useHistory(gridData.value)

const handleGridUpdate = (newGrid) => {
  gridData.value = newGrid
  pushState(newGrid)
  updateHexCode()
}

const handleClear = () => {
  resetGrid(gridData.value[0].length)
  updateHexCode()
}

const handleUndo = () => {
  const prevState = undo()
  if (prevState) {
    gridData.value = prevState
    updateHexCode()
  }
}

const handleRedo = () => {
  const nextState = redo()
  if (nextState) {
    gridData.value = nextState
    updateHexCode()
  }
}

const updateCell = (rowIndex, cellIndex, value) => {
  const newGrid = gridData.value.map((row) => [...row])
  newGrid[rowIndex][cellIndex] = value
  handleGridUpdate(newGrid)
}

const handleKeydown = (e) => {
  if (e.ctrlKey) {
    if (e.key === 'z') {
      e.preventDefault()
      handleUndo()
    } else if (e.key === 'y') {
      e.preventDefault()
      handleRedo()
    }
  }
}

const handleCloseSidebar = () => {
  isSidebarActive.value = false
}

onMounted(() => {
  updateHexCode()
  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('keydown', handleKeydown)
})
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
  font-weight: 600;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s;
}

.action-button.primary {
  background: var(--primary-color);
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

.btn-close-sidebar {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  z-index: 1001;
}

.btn-close-sidebar:hover {
  background-color: var(--background-active);
  color: var(--text-color);
}

@media (orientation: portrait) and (max-width: 768px) {
  .btn-close-sidebar {
    padding: 12px;
  }

  .btn-close-sidebar .material-symbols-outlined {
    font-size: 24px;
  }

  .editor-actions {
    margin: 1rem 0.2rem 0.8rem;
    gap: 12px;
  }

  .action-button {
    font-size: clamp(0.8em, 2vw, 1.2em);
    padding: 10px;
  }

  .icon-button {
    width: 42px;
    height: 42px;
  }

  .history-controls {
    gap: 8px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .editor-actions {
    margin: 1.5rem 1.5rem 1rem;
  }

  .action-button {
    font-size: clamp(1.5em, 2vw, 1.8em);
    padding: 12px 24px;
  }

  .icon-button {
    width: 60px;
    height: 60px;
  }

  .icon-button .material-symbols-outlined {
    font-size: 28px !important;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .editor-actions {
    margin: 1.5rem 1.5rem 1rem;
  }

  .action-button {
    font-size: clamp(2em, 2vw, 2.5em);
    padding: 16px 28px;
  }

  .action-button .material-symbols-outlined {
    font-size: 44px !important;
    transform: translateY(3px);
  }

  .action-group {
    gap: 16px;
  }

  .history-controls {
    gap: 12px;
  }

  .icon-button {
    width: 80px;
    height: 80px;
  }

  .icon-button .material-symbols-outlined {
    font-size: 48px !important;
  }
}
</style>
