<template>
  <div class="container" @mousedown="handleContainerClick">
    <EditorHeader
      @openSettings="showSettings = true"
      @toggleSidebar="toggleSidebar"
    />

    <div class="current-glyph-info">
      <a
        v-if="showZiToolsLink"
        :href="ziToolsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="zi-tools-link"
        :title="$t('editor.actions.open_in_zitools')"
      >
        <img src="/zi-tools.svg" alt="zi.tools" class="zi-tools-icon" />
      </a>
      <div class="code-point-input">
        <span>U+</span>
        <input
          v-model="currentCodePoint"
          @input="handleCodePointInput"
          maxlength="6"
          pattern="[0-9A-Fa-f]{4,6}"
        />
      </div>
      <div class="glyph-preview">
        <PixelPreview
          :hexValue="hexCode"
          :width="settings.glyphWidth"
          display-mode="editor"
        />
        <span class="unicode-char" :style="unicodePreviewStyle">
          {{ String.fromCodePoint(parseInt(currentCodePoint || '0000', 16)) }}
        </span>
      </div>
    </div>

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
      :moveMode="moveMode"
      :clipboardData="clipboardData"
      @update:cell="updateCell"
      @selection-complete="handleSelectionComplete"
      @paste-complete="handlePasteComplete"
      @preview-move="handlePreviewMove"
      @move-to="handleMoveTo"
    />

    <div class="editor-actions">
      <div class="action-group">
        <button
          v-if="selectedRegion"
          class="action-button"
          @click="handleCut"
          :title="$t('glyph_editor.cut_title')"
        >
          <span class="material-symbols-outlined">content_cut</span>
        </button>
        <button
          v-if="selectedRegion"
          class="action-button"
          @click="handleCopy"
          :title="$t('glyph_editor.copy_title')"
        >
          <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button
          v-if="clipboardData"
          class="action-button"
          @click.stop="handlePasteButtonClick"
          :class="{ 'paste-mode': pasteMode }"
          :title="
            pasteMode
              ? $t('glyph_editor.paste_hint')
              : $t('glyph_editor.paste_title')
          "
        >
          <span class="material-symbols-outlined">content_paste</span>
        </button>
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
    <ToolButtons
      v-model:modelValue="drawValue"
      :copyMode="copyMode"
      :moveMode="moveMode"
      :selectedRegion="selectedRegion"
      @copy-selection="handleCopySelection"
    />
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
import SettingsModal from './SettingsModal.vue'
import GlyphGrid from './GlyphGrid.vue'
import ToolButtons from './ToolButtons.vue'
import HexCodeInput from './HexCodeInput.vue'
import DownloadButtons from './DownloadButtons.vue'
import GlyphManager from './GlyphManager.vue'
import DialogBox from './DialogBox.vue'
import PixelPreview from './GlyphManager/PixelPreview.vue'
import { useSettings } from '@/composables/useSettings'
import { useGridData } from '@/composables/useGridData'
import { useHexCode } from '@/composables/useHexCode'
import { useHistory } from '@/composables/useHistory'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { hexToGrid } from '@/utils/hexUtils'
import { isCJKChar } from '@/utils/charUtils'
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

const mousePosition = ref({ x: 0, y: 0 })

onMounted(() => {
  updateGridFontPreview()
  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousemove', updateMousePosition)
  nextTick(updateGridFontPreview)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', updateMousePosition)
})

const updateMousePosition = (e) => {
  mousePosition.value = { x: e.clientX, y: e.clientY }
}

const selectedRegion = ref(null)
const clipboardData = ref(null)

const copyMode = ref(false)
const moveMode = ref(false)

watch(
  [drawValue, selectedRegion],
  ([newDrawValue, newSelectedRegion]) => {
    moveMode.value = newDrawValue === 2 && newSelectedRegion !== null
  },
  { immediate: true },
)

const pasteMode = ref(false)

const handleSelectionComplete = (start, end) => {
  selectedRegion.value = { start, end }
}

const handleCopySelection = () => {
  if (!selectedRegion.value) return
  moveMode.value = false
  copyMode.value = true

  const selection = glyphGridRef.value.handleCopySelection()
  if (selection) {
    clipboardData.value = selection

    try {
      const jsonString = JSON.stringify(selection)
      navigator.clipboard.writeText(jsonString)
    } catch (error) {
      console.error('Failed to write to clipboard:', error)
    }
  }
}

defineEmits(['update:modelValue', 'selection-complete', 'paste-complete'])

const handleKeydown = (e) => {
  if (e.ctrlKey) {
    if (e.key === 'z') {
      e.preventDefault()
      handleUndo()
    } else if (e.key === 'y') {
      e.preventDefault()
      handleRedo()
    } else if (e.key === 'x' && selectedRegion.value) {
      e.preventDefault()
      handleCut()
    } else if (e.key === 'c' && selectedRegion.value) {
      e.preventDefault()
      handleCopy()
    } else if (e.key === 'v' && clipboardData.value) {
      e.preventDefault()
      handlePaste(e)
    }
  }
}

const handleCut = () => {
  if (!selectedRegion.value) return
  const selection = glyphGridRef.value?.handleCopySelection()
  if (selection) {
    clipboardData.value = selection
    copyMode.value = true
    moveMode.value = false
    try {
      const jsonString = JSON.stringify(selection)
      navigator.clipboard.writeText(jsonString)
    } catch (error) {
      console.error('Failed to write to clipboard:', error)
    }

    const { start, end } = selectedRegion.value
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)

    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        updateCell(i, j, 0)
      }
    }

    pushState(gridData.value)
  }
}

const handleCopy = () => {
  if (!selectedRegion.value) return
  const selection = glyphGridRef.value?.handleCopySelection()
  if (selection) {
    clipboardData.value = selection
    copyMode.value = true
    moveMode.value = false
    try {
      const jsonString = JSON.stringify(selection)
      navigator.clipboard.writeText(jsonString)
    } catch (error) {
      console.error('Failed to write to clipboard:', error)
    }
  }
}

const handlePasteButtonClick = () => {
  pasteMode.value = true
  document.addEventListener('click', handlePasteClick, {
    capture: true,
    once: true,
  })
}

const handlePasteClick = (e) => {
  e.stopPropagation()

  if (e.target.classList.contains('cell')) {
    const { rowIndex, cellIndex } = glyphGridRef.value.getCellIndex(e.target)
    pasteAtPosition(rowIndex, cellIndex)
  }

  pasteMode.value = false
}

const pasteAtPosition = (targetRow, targetCol) => {
  console.log('Attempting to paste at:', targetRow, targetCol)
  if (targetRow < 0 || targetCol < 0) return

  if (clipboardData.value) {
    console.log('Using clipboard data:', clipboardData.value)
    glyphGridRef.value.pasteSelection(targetRow, targetCol, clipboardData.value)
    pushState(gridData.value)
  }
}

const handlePaste = () => {
  if (!clipboardData.value) return

  const target = document.elementFromPoint(
    mousePosition.value.x,
    mousePosition.value.y,
  )

  if (target?.classList.contains('cell')) {
    const { rowIndex, cellIndex } = glyphGridRef.value.getCellIndex(target)
    pasteAtPosition(rowIndex, cellIndex)
  }
}

const handlePasteComplete = () => {
  moveMode.value = false
  clipboardData.value = null
  pushState(gridData.value)
}

const handleMoveTo = (row, col) => {
  if (!clipboardData.value) return

  pasteAtPosition(row, col)
  moveMode.value = false
  clipboardData.value = null

  selectedRegion.value = {
    start: { row, col },
    end: {
      row: row + (clipboardData.value?.data.length || 0) - 1,
      col: col + (clipboardData.value?.data[0].length || 0) - 1,
    },
  }
  pushState(gridData.value)
}

const clearSelection = () => {
  glyphGridRef.value?.clearSelection()
  selectedRegion.value = null
  clipboardData.value = null
  copyMode.value = false
  moveMode.value = false
}

watch(drawValue, (newValue, oldValue) => {
  if (oldValue === 2 && newValue !== 2) {
    clearSelection()
  }
})

watch(
  () => selectedRegion.value,
  () => {
    if (selectedRegion.value) {
      pushState(gridData.value)
    }
  },
)

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
  document.removeEventListener('click', handlePasteClick, true)
  if (pasteMode.value) {
    pasteMode.value = false
  }
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

const handlePreviewMove = ({ row, col, data }) => {
  const preview = document.querySelectorAll('.cell.preview')
  preview.forEach((cell) => cell.classList.remove('preview'))

  if (data) {
    data.forEach((rowData, i) => {
      rowData.forEach((value, j) => {
        const cell = document.querySelector(
          `.cell[data-row="${row + i}"][data-col="${col + j}"]`,
        )
        if (cell && value === 1) {
          cell.classList.add('preview')
        }
      })
    })
  }
}

const handleContainerClick = (event) => {
  if (
    event.target.classList.contains('container') ||
    event.target.classList.contains('editor-actions') ||
    event.target.classList.contains('tool-buttons')
  ) {
    event.stopPropagation()
    if (glyphGridRef.value) {
      glyphGridRef.value.clearSelection()
      selectedRegion.value = null
    }
  }
}

const currentCodePoint = ref('0000')

const handleCodePointInput = (event) => {
  let value = event.target.value.toUpperCase()

  value = value.replace(/[^0-9A-F]/g, '')

  if (value.length > 6) {
    value = value.slice(0, 6)
  }

  event.target.value = value
  currentCodePoint.value = value

  if (value.length >= 4) {
    if (currentGlyph.value) {
      currentGlyph.value.codePoint = value
    } else {
      currentGlyph.value = {
        codePoint: value,
        hexValue: hexCode.value,
      }
    }
  }
}

const unicodePreviewStyle = computed(() => {
  return {
    fontFamily: settings.value.browserPreviewFont,
  }
})

const ziToolsUrl = computed(() => {
  const codePoint = parseInt(currentCodePoint.value || '0000', 16)
  const char = String.fromCodePoint(codePoint)
  return `https://zi.tools/zi/${char}`
})

const showZiToolsLink = computed(() => {
  const codePoint = parseInt(currentCodePoint.value || '0000', 16)
  const char = String.fromCodePoint(codePoint)
  return isCJKChar(char)
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

.action-button.paste-mode {
  background-color: var(--info-color);
  color: white;
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

.current-glyph-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0.2rem auto 0.5rem;
  padding: 0.3rem 1.2rem;
  background: var(--background-light);
  border-radius: 4px;
  max-width: fit-content;
  height: 3rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.code-point {
  font-family: var(--monospace-font);
  color: var(--text-secondary);
  font-size: 1.3rem;
  font-weight: 600;
}

.glyph-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: var(--background-light);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.unicode-char {
  font-size: 1.8em;
  border-radius: 4px;
  text-align: center;
  transition: none !important;
}

.copyright-text {
  font-family: 'Noto Sans', sans-serif;
  text-align: center;
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 1em;
  margin-top: auto;
}

.code-point-input {
  display: flex;
  align-items: center;
  font-family: var(--monospace-font);
  color: var(--text-secondary);
  font-size: 1.3rem;
  font-weight: 600;
  background: var(--background-hover);
  border-radius: 4px;
  padding: 0.2rem;
}

.code-point-input span {
  padding: 0 0.2rem;
}

.code-point-input input {
  width: 3.8em;
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  outline: none;
  padding: 0.2rem 0.1rem;
}

.code-point-input input:focus {
  background: var(--background-active);
  border-radius: 2px;
}

.zi-tools-link {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.zi-tools-link:hover {
  background-color: var(--background-active);
}

.zi-tools-icon {
  width: 24px;
  height: 24px;
}

[data-theme='dark'] .zi-tools-icon {
  filter: invert(1);
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

  .unicode-char {
    font-size: 2em;
  }

  .copyright-text {
    font-size: 0.8em;
  }

  .code-point-input {
    font-size: 1.8em;
  }

  .code-point-input input {
    width: 5em;
  }

  .zi-tools-icon {
    width: 32px;
    height: 32px;
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

  .code-point {
    font-size: 1.8em;
  }

  .unicode-char {
    font-size: 2.8em;
  }

  .copyright-text {
    padding: 1rem;
    font-size: 1.2em;
  }

  .zi-tools-icon {
    width: 36px;
    height: 36px;
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

  .code-point {
    font-size: 2em;
  }

  .unicode-char {
    font-size: 2.8em;
  }

  .copyright-text {
    padding: 1rem;
    font-size: 1.8em;
  }

  .code-point-input {
    font-size: 2em;
  }
}
</style>
