<template>
  <div class="container">
    <EditorHeader
      @openSettings="showSettings = true"
      @toggleSidebar="toggleSidebar"
    />

    <GlyphInfo
      v-model="currentCodePoint"
      :hexValue="hexCode"
      :width="settings.glyphWidth"
      :browserPreviewFont="settings.browserPreviewFont"
    />

    <SettingsModal
      v-model="showSettings"
      :settings="settings"
      @update:settings="updateSettings"
    />

    <GlyphGrid
      ref="glyphGridRef"
      :gridData="gridData"
      :drawMode="settings.drawMode"
      :drawValue="drawValue"
      :cursorEffect="settings.cursorEffect"
      :showBorder="settings.showBorder"
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
    <DownloadButtons :gridData="gridData" :codepoint="currentCodePoint" />

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

    <DialogBox
      v-model:show="showDialog"
      :title="dialogConfig.title"
      :message="dialogConfig.message"
      :confirm-text="dialogConfig.confirmText"
      :cancel-text="dialogConfig.cancelText"
      @confirm="dialogConfig.onConfirm"
      @cancel="dialogConfig.onCancel"
    />
    <div class="copyright-text">Copyright © 2024-2025 SkyEye_FAST</div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
  nextTick,
  provide,
} from 'vue'
import { useI18n } from 'vue-i18n'
import EditorHeader from './EditorHeader.vue'
import GlyphInfo from './GlyphInfo.vue'
import SettingsModal from './SettingsModal.vue'
import GlyphGrid from './GlyphGrid.vue'
import ToolButtons from './ToolButtons.vue'
import HexCodeInput from './HexCodeInput.vue'
import DownloadButtons from './DownloadButtons.vue'
import GlyphManager from './GlyphManager.vue'
import DialogBox from './DialogBox.vue'
import { useSettings } from '@/composables/useSettings'
import { useGridData } from '@/composables/useGridData'
import { useHexCode } from '@/composables/useHexCode'
import { useHistory } from '@/composables/useHistory'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { hexToGrid } from '@/utils/hexUtils'
const { t: $t } = useI18n()

const { settings, showSettings } = useSettings()
const width = computed(() => settings.value.glyphWidth)
const { gridData, resetGrid, updateGrid } = useGridData(width)
const { hexCode, updateHexCode, updateGridFromHex } = useHexCode(
  gridData,
  resetGrid,
)
const { isSidebarActive, sidebarWidth, toggleSidebar, startResize } =
  useSidebar()

const drawValue = ref(1)
const glyphs = ref([])
const prefillData = ref(null)
const currentGlyph = ref({
  codePoint: '0000',
  hexValue: '',
})
const hasUnsavedChanges = ref(false)
const showDialog = ref(false)
const dialogConfig = ref({})

const glyphGridRef = ref(null)
const gridFontRef = ref(null)

const { isDark } = useTheme()
provide('isDark', isDark)

const currentCodePoint = ref('0000')

onMounted(() => {
  updateGridFontPreview()
  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('keydown', handleKeydown)
  nextTick(updateGridFontPreview)
})

const setGlyphs = (newGlyphs) => {
  glyphs.value = newGlyphs
}

const preventDefault = (e) => e.preventDefault()

const addToGlyphset = () => {
  prefillData.value = {
    hexValue: hexCode.value,
    codePoint: currentCodePoint.value,
  }
  isSidebarActive.value = true
}

const showConfirmDialog = ({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) => {
  dialogConfig.value = {
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel: onCancel || (() => (showDialog.value = false)),
  }
  showDialog.value = true
}

const handleGlyphEdit = (hexValue, glyph) => {
  try {
    if (hasUnsavedChanges.value && currentGlyph.value) {
      showConfirmDialog({
        title: $t('dialog.unsaved_changes.title'),
        message: $t('dialog.unsaved_changes.message'),
        confirmText: $t('dialog.unsaved_changes.confirm'),
        onConfirm: () => {
          loadGlyph(hexValue, glyph)
          showDialog.value = false
        },
      })
    } else {
      loadGlyph(hexValue, glyph)
    }
  } catch (error) {
    console.error('Error loading glyph:', error)
  }
}

const loadGlyph = async (hexValue, glyph) => {
  if (!glyph || !glyph.codePoint) {
    console.error('Invalid glyph data:', glyph)
    return
  }

  const newGrid = hexToGrid(hexValue)
  const newWidth = newGrid[0].length

  settings.value.glyphWidth = newWidth === 8 ? 8 : 16
  await nextTick()
  updateGrid(newWidth)
  await nextTick()
  gridData.value = newGrid
  hexCode.value = hexValue
  currentGlyph.value = {
    codePoint: glyph.codePoint,
    hexValue: hexValue,
  }
  currentCodePoint.value = glyph.codePoint
  hasUnsavedChanges.value = false
  await nextTick()
  updateGridFontPreview()
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

const { pushState, undo, redo, canUndo, canRedo, clearAndInitHistory } =
  useHistory(gridData.value)

const handleGridUpdate = (newGrid) => {
  gridData.value = newGrid
  pushState(newGrid)
  updateHexCode()
  hasUnsavedChanges.value = currentGlyph.value !== null
}

const handleClear = () => {
  const doClear = () => {
    resetGrid(gridData.value[0].length)
    updateHexCode()
    hasUnsavedChanges.value = false
    currentCodePoint.value = '0000'
    currentGlyph.value = {
      codePoint: '0000',
      hexValue: '',
    }
    showDialog.value = false
  }

  if (settings.value.confirmClear) {
    showConfirmDialog({
      title: $t('dialog.clear_confirm.title'),
      message: $t('dialog.clear_confirm.message'),
      confirmText: $t('dialog.clear_confirm.confirm'),
      onConfirm: doClear,
    })
  } else {
    doClear()
  }
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

const updateSettings = (newSettings) => {
  Object.assign(settings.value, newSettings)
}

const updateGridFontPreview = () => {
  if (gridFontRef.value && glyphGridRef.value) {
    gridFontRef.value.textContent = glyphGridRef.value.gridFontString
  }
}

watch(() => gridData.value, updateGridFontPreview, { deep: true })

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => currentGlyph.value,
  (newGlyph) => {
    if (newGlyph) {
      clearAndInitHistory(gridData.value)
    }
  },
  { deep: true },
)
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
  margin: 1.5rem 1rem 1rem;
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
  font-family: var(--normal-font);
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
  background: var(--primary-dark);
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
  background: var(--background-light);
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

.copyright-text {
  font-family: 'Noto Sans', sans-serif;
  text-align: center;
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 1em;
  margin-top: auto;
}

@media (orientation: portrait) and (max-width: 768px) {
  .btn-close-sidebar {
    padding: 12px;
  }

  .btn-close-sidebar .material-symbols-outlined {
    font-size: 24px !important;
  }

  .sidebar {
    width: 100%;
  }

  .sidebar-resizer {
    display: none;
  }

  .btn-close-sidebar {
    top: 12px;
    right: 12px;
    padding: 12px;
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

  .copyright-text {
    font-size: 0.8em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .btn-close-sidebar {
    padding: 12px;
  }

  .btn-close-sidebar .material-symbols-outlined {
    font-size: 36px !important;
  }

  .btn-close-sidebar {
    top: 12px;
    right: 12px;
    padding: 12px;
  }

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

  .copyright-text {
    padding: 1rem;
    font-size: 1.2em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .editor-actions {
    margin: 1.8rem 1.5rem 1rem;
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

  .copyright-text {
    padding: 1rem;
    font-size: 1.8em;
  }
}
</style>
