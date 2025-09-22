<template>
  <div class="container">
    <EditorHeader
      @open-settings="showSettings = true"
      @toggle-sidebar="toggleSidebar"
    />

    <GlyphInfo
      v-model="currentCodePoint"
      :hex-value="hexCode"
      :width="settings.glyphWidth"
      :browser-preview-font="settings.browserPreviewFont"
    />

    <SettingsModal
      v-model="showSettings"
      :settings="settings"
      :hex-value="hexCode"
      :width="settings.glyphWidth"
      @update:settings="updateSettings"
    />

    <GlyphGrid
      ref="gridRef"
      :grid-data="gridData"
      :draw-mode="settings.drawMode"
      :draw-value="drawValue"
      :cursor-effect="settings.cursorEffect"
      :show-border="settings.showBorder"
      :current-tool="currentTool"
      :enable-selection="settings.enableSelection"
      @update:cell="updateCell"
      @update:draw-value="updateDrawValue"
      @selection-change="handleSelectionChange"
      @tool-change="handleToolChange"
      @tool-state-change="handleToolStateChange"
      @draw-complete="handleDrawComplete"
      @clipboard-change="handleClipboardChange"
    />

    <div class="editor-actions">
      <div class="action-group">
        <button
          v-if="hasSelection"
          class="action-button"
          :title="$t('glyph_editor.cut_title')"
          @click="handleCut"
        >
          <i-material-symbols-content-cut class="icon" />
        </button>
        <button
          v-if="hasSelection"
          class="action-button"
          :title="$t('glyph_editor.copy_title')"
          @click="handleCopy"
        >
          <i-material-symbols-content-copy class="icon" />
        </button>
        <button
          class="action-button secondary"
          :title="$t('editor.actions.clear.title')"
          @click="handleClear"
        >
          <i-material-symbols-mop-outline class="icon" />
          {{ $t('editor.actions.clear.button') }}
        </button>
        <button
          class="action-button primary"
          :title="$t('editor.actions.add_to_glyphset.title')"
          @click="addToGlyphset"
        >
          <i-material-symbols-add-box-outline class="icon" />
          {{ $t('editor.actions.add_to_glyphset.button') }}
        </button>
      </div>
      <div class="history-controls">
        <button
          class="icon-button"
          :disabled="!canUndo"
          :title="$t('editor.actions.undo.title')"
          @click="handleUndo"
        >
          <i-material-symbols-undo class="icon" />
        </button>
        <button
          class="icon-button"
          :disabled="!canRedo"
          :title="$t('editor.actions.redo.title')"
          @click="handleRedo"
        >
          <i-material-symbols-redo class="icon" />
        </button>
      </div>
    </div>
    <ToolButtons
      v-model:model-value="drawValue"
      v-model:current-tool="currentTool"
      :disabled="shouldDisableTools"
      :enable-selection="settings.enableSelection"
      :draw-mode="settings.drawMode"
      :current-draw-value="currentDrawValue"
      @update:model-value="updateDrawValue"
    />
    <HexCodeInput v-model:hex-code="hexCode" @update:grid="updateGridFromHex" />
    <DownloadButtons :grid-data="gridData" :codepoint="currentCodePoint" />

    <div :class="['sidebar', { active: isSidebarActive }]">
      <div class="sidebar-resizer" @mousedown="startResize"></div>
      <button class="btn-close-sidebar" @click="handleCloseSidebar">
        <i-material-symbols-close class="icon" />
      </button>
      <GlyphManager
        v-if="isSidebarActive"
        :glyphs="glyphs"
        :on-glyph-change="setGlyphs"
        :prefill-data="prefillData"
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
    <div class="copyright-text" role="contentinfo">
      <span class="copyright-left">Copyright © 2024 - 2025</span>
      <span class="copyright-links" aria-hidden="false">
        <a
          href="https://github.com/SkyEye-FAST"
          aria-label="SkyEye_FAST on GitHub"
          >SkyEye_FAST</a
        >
        <span class="sep" aria-hidden="true">•</span>
        <a
          href="https://unifoundry.com/unifont/"
          target="_blank"
          rel="noreferrer nofollow"
          aria-label="GNU Unifont website"
          >GNU Unifont</a
        >
        <span v-if="unifontVersion" class="version">{{ unifontVersion }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue'

import { useI18n } from 'vue-i18n'

import { useGridData } from '@/composables/useGridData'
import { useHexCode } from '@/composables/useHexCode'
import { useHistory } from '@/composables/useHistory'
import { useSettings } from '@/composables/useSettings'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import type { Glyph, PrefillData } from '@/types/glyph'
import { hexToGrid } from '@/utils/hexUtils'

import DialogBox from './DialogBox.vue'
import DownloadButtons from './DownloadButtons.vue'
import EditorHeader from './EditorHeader.vue'
import GlyphGrid from './GlyphGrid.vue'
import GlyphInfo from './GlyphInfo.vue'
import GlyphManager from './GlyphManager.vue'
import HexCodeInput from './HexCodeInput.vue'
import SettingsModal from './SettingsModal.vue'
import ToolButtons from './ToolButtons.vue'

interface Position {
  x: number
  y: number
}

interface CellPosition {
  row: number
  col: number
}

interface Region {
  start: CellPosition
  end: CellPosition
}

interface ClipboardData {
  data: number[][]
  width: number
  height: number
}

interface GlyphData {
  codePoint: string
  hexValue: string
}

interface CellChange {
  row: number
  col: number
  oldValue: number
  newValue: number
}

interface DrawAction {
  type: string
  changes: CellChange[]
}

interface DialogConfigExtended {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

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

const drawValue = ref<number>(1)
const currentTool = ref<'draw' | 'erase' | 'select'>('draw')
const hasSelection = ref<boolean>(false)
const hasClipboardData = ref<boolean>(false)

const shouldDisableTools = computed((): boolean => {
  return settings.value.drawMode === 'doubleButtonDraw' && drawValue.value !== 2
})

const updateDrawValue = (value: number): void => {
  if (value === drawValue.value) return
  drawValue.value = value

  if (value === 1) {
    currentTool.value = 'draw'
  } else if (value === 0) {
    currentTool.value = 'erase'
  } else if (value === 2) {
    currentTool.value = 'select'
  }

  if (value === 2 && !settings.value.enableSelection) {
    drawValue.value = 1
    currentTool.value = 'draw'
    return
  }

  if (value !== 2) {
    clearSelection()
  }
}

const handleSelectionChange = (hasSelectionValue: boolean): void => {
  hasSelection.value = hasSelectionValue
}

const handleToolChange = (tool: 'draw' | 'erase' | 'select'): void => {
  currentTool.value = tool
}

const handleToolStateChange = (tool: 'draw' | 'erase'): void => {
  currentTool.value = tool
}

const handleClipboardChange = (hasData: boolean): void => {
  hasClipboardData.value = hasData
}

watch(
  () => settings.value.enableSelection,
  (newValue: boolean): void => {
    if (!newValue) {
      clearSelection()
      if (drawValue.value === 2) {
        drawValue.value = 1
      }
    }
  },
)

defineExpose({
  updateDrawValue,
})

const glyphs = ref<Glyph[]>([])
const prefillData = ref<PrefillData | null>(null)
const currentGlyph = ref<GlyphData>({
  codePoint: '0000',
  hexValue: '',
})
const hasUnsavedChanges = ref<boolean>(false)
const showDialog = ref<boolean>(false)
const dialogConfig = ref<DialogConfigExtended>({
  title: '',
  message: '',
  onConfirm: () => {},
})

interface GlyphGridInstance {
  selection: object
  clipboard: object
  handleCopy: () => void
  handleCut: () => void
  handlePaste: () => void
  handleSelectAll: () => void
  handleDelete: () => void
  clearSelection: () => void
  gridFontString?: string
}

const glyphGridRef = ref<GlyphGridInstance | null>(null)
const gridRef = ref<InstanceType<typeof GlyphGrid> | null>(null)
const gridFontRef = ref<HTMLElement | null>(null)

const currentDrawValue = computed(() => {
  return gridRef.value?.drawing?.currentDrawValue?.value
})

const { isDark } = useTheme()
provide('isDark', isDark)

const mousePosition = ref<Position>({ x: 0, y: 0 })

const currentCodePoint = ref<string>('0000')

const unifontVersion = ref<string>(
  (import.meta.env.VITE_UNIFONT_VERSION as string) || '',
)

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

const updateMousePosition = (e: MouseEvent): void => {
  mousePosition.value = { x: e.clientX, y: e.clientY }
}

const selectedRegion = ref<Region | null>(null)
const clipboardData = ref<ClipboardData | null>(null)

const copyMode = ref<boolean>(false)
const moveMode = ref<boolean>(false)

watch(
  [drawValue, selectedRegion],
  ([newDrawValue, newSelectedRegion]: [number, Region | null]): void => {
    moveMode.value = newDrawValue === 2 && newSelectedRegion !== null
  },
  { immediate: true },
)

const pasteMode = ref<boolean>(false)

defineEmits(['update:modelValue', 'selection-complete', 'paste-complete'])

const handleKeydown = (e: KeyboardEvent): void => {
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
    }
  }
}

const handleCopy = (): void => {
  if (glyphGridRef.value) {
    glyphGridRef.value.handleCopy()
  }
}

const handleCut = (): void => {
  if (glyphGridRef.value) {
    glyphGridRef.value.handleCut()
  }
}

const clearSelection = (): void => {
  if (glyphGridRef.value) {
    glyphGridRef.value.clearSelection()
  }
  selectedRegion.value = null
  clipboardData.value = null
  copyMode.value = false
  moveMode.value = false
}

watch(
  () => selectedRegion.value,
  (): void => {
    if (selectedRegion.value) {
      pushState(gridData.value, 'selection')
    }
  },
)

const setGlyphs = (newGlyphs: Glyph[]): void => {
  glyphs.value = newGlyphs
}

const preventDefault = (e: Event): void => e.preventDefault()

const addToGlyphset = (): void => {
  prefillData.value = {
    hexValue: hexCode.value,
    codePoint: currentCodePoint.value,
  }
  isSidebarActive.value = true
}

interface ShowConfirmDialogParams {
  title: string
  message: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

const showConfirmDialog = ({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ShowConfirmDialogParams): void => {
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

const handleGlyphEdit = (hexValue: string, glyph?: Glyph): void => {
  try {
    if (hasUnsavedChanges.value && currentGlyph.value) {
      showConfirmDialog({
        title: $t('dialog.unsaved_changes.title'),
        message: $t('dialog.unsaved_changes.message'),
        confirmText: $t('dialog.unsaved_changes.confirm'),
        onConfirm: () => {
          if (glyph) loadGlyph(hexValue, glyph)
          showDialog.value = false
        },
      })
    } else {
      if (glyph) loadGlyph(hexValue, glyph)
    }
  } catch (error) {
    console.error('Error loading glyph:', error)
  }
}

const loadGlyph = async (hexValue: string, glyph: Glyph): Promise<void> => {
  if (!glyph || !glyph.codePoint) {
    console.error('Invalid glyph data:', glyph)
    return
  }

  const newGrid = hexToGrid(hexValue)
  if (newGrid && newGrid[0]) {
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
}

const clearPrefillData = (): void => {
  prefillData.value = null
}

const { pushState, undo, redo, canUndo, canRedo, clearAndInitHistory } =
  useHistory(gridData.value)

const handleClear = (): void => {
  const doClear = () => {
    if (gridData.value && gridData.value[0]) {
      resetGrid(gridData.value[0].length)
      updateHexCode()
      hasUnsavedChanges.value = false
      currentCodePoint.value = '0000'
      currentGlyph.value = {
        codePoint: '0000',
        hexValue: '',
      }
      pushState(gridData.value, 'clear-grid')
      showDialog.value = false
    }
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

const handleUndo = (): void => {
  const prevState = undo()
  if (prevState) {
    gridData.value = prevState
    updateHexCode()
  }
}

const handleRedo = (): void => {
  const nextState = redo()
  if (nextState) {
    gridData.value = nextState
    updateHexCode()
  }
}

const updateCell = (
  rowIndex: number,
  cellIndex: number,
  value: number,
): void => {
  if (gridData.value) {
    const newGrid = gridData.value.map((row) => [...row])
    if (newGrid[rowIndex]) {
      newGrid[rowIndex][cellIndex] = value
      gridData.value = newGrid
    }
  }
}

const handleCloseSidebar = (): void => {
  isSidebarActive.value = false
}

const updateSettings = (newSettings: typeof settings.value): void => {
  Object.assign(settings.value, newSettings)
}

const updateGridFontPreview = (): void => {
  if (
    gridFontRef.value &&
    glyphGridRef.value &&
    glyphGridRef.value.gridFontString
  ) {
    gridFontRef.value.textContent = glyphGridRef.value.gridFontString
  }
}

watch(() => gridData.value, updateGridFontPreview, { deep: true })

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('keydown', handleKeydown)
  if (pasteMode.value) {
    pasteMode.value = false
  }
})

watch(
  () => currentGlyph.value,
  (newGlyph): void => {
    if (newGlyph) {
      clearAndInitHistory(gridData.value)
    }
  },
  { deep: true },
)

const handleDrawComplete = (changes: CellChange[]): void => {
  const action: DrawAction = {
    type: 'draw',
    changes: changes,
  }
  pushState(gridData.value, JSON.stringify(action))
}
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

.action-button .icon {
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

.icon-button .icon {
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

.copyright-text a {
  color: var(--text-secondary);
  text-decoration: none;
  margin: 0 0.2rem;
  font-weight: 600;
  opacity: 0.9;
  transition:
    color 0.15s ease,
    text-decoration 0.15s ease,
    opacity 0.15s ease;
}

.copyright-text a:hover,
.copyright-text a:focus {
  color: var(--text-color);
  text-decoration: underline;
  opacity: 1;
}

.copyright-links {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}

.copyright-left {
  display: inline-block;
  margin-right: 0.2rem;
  color: var(--text-secondary);
}

.copyright-text .sep {
  color: var(--text-secondary);
  margin: 0 0.2rem;
  font-size: 0.9em;
}

.copyright-text .version {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.95em;
}

@media (orientation: portrait) and (max-width: 768px) {
  .btn-close-sidebar {
    padding: 12px;
  }

  .btn-close-sidebar .icon {
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

  .btn-close-sidebar .icon {
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

  .icon-button .icon {
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

  .action-button .icon {
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

  .icon-button .icon {
    font-size: 48px !important;
  }

  .copyright-text {
    padding: 1rem;
    font-size: 1.8em;
  }
}
</style>
