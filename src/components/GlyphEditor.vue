<template>
  <div class="container">
    <EditorHeader
      @open-settings="showSettings = true"
      @toggle-sidebar="handleToggleSidebar"
    />

    <div
      v-if="pendingRestoredDraft"
      class="restored-draft-notice"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="restored-draft-icon" aria-hidden="true">
        <i-material-symbols-restore-page-outline />
      </span>
      <span class="restored-draft-message">
        {{ $t('storage.restored_draft') }}
      </span>
      <div class="restored-draft-actions">
        <button
          class="ui-button ui-button--quiet"
          type="button"
          @click="discardRestoredDraft"
        >
          {{ $t('storage.discard_draft') }}
        </button>
        <button
          class="ui-button ui-button--primary"
          type="button"
          @click="keepRestoredDraft"
        >
          {{ $t('storage.keep_draft') }}
        </button>
      </div>
    </div>

    <SettingsSidebar
      v-model="showSettings"
      :settings="settings"
      @update:settings="updateSettings"
    />

    <main class="editor-layout">
      <GlyphGrid
        ref="gridRef"
        :grid-data="gridData"
        :draw-mode="settings.drawMode"
        :draw-value="drawValue"
        :cursor-effect="settings.alwaysShowMouseCursor"
        :show-border="settings.showBorder"
        :current-tool="currentTool"
        :enable-selection="settings.enableSelection"
        @update:draw-value="updateDrawValue"
        @selection-change="handleSelectionChange"
        @tool-change="handleToolChange"
        @tool-state-change="handleToolStateChange"
        @command="handleGridCommand"
        @clipboard-change="handleClipboardChange"
        @paste-start="handlePasteStart"
      >
        <template #toolbar>
          <GlyphInfo
            v-model="currentCodePoint"
            :hex-value="hexCode"
            :width="settings.glyphWidth"
            :browser-preview-font="settings.browserPreviewFont"
            :save-status="saveStatus"
            :save-status-label="saveStatusLabel"
          />
        </template>
      </GlyphGrid>

      <div class="editor-control-stack">
        <div class="editor-actions">
          <div class="action-group">
            <button
              v-if="hasSelection"
              class="action-button icon-only ui-icon-button"
              :title="$t('glyph_editor.cut_title')"
              type="button"
              :aria-label="$t('glyph_editor.cut_title')"
              @click="handleCut"
            >
              <i-material-symbols-content-cut class="icon" />
            </button>
            <button
              v-if="hasSelection"
              class="action-button icon-only ui-icon-button"
              :title="$t('glyph_editor.copy_title')"
              type="button"
              :aria-label="$t('glyph_editor.copy_title')"
              @click="handleCopy"
            >
              <i-material-symbols-content-copy class="icon" />
            </button>
            <button
              v-if="hasClipboardData"
              class="action-button icon-only ui-icon-button"
              :title="$t('glyph_editor.paste_title')"
              type="button"
              :aria-label="$t('glyph_editor.paste_title')"
              @click="handlePaste"
            >
              <i-material-symbols-content-paste class="icon" />
            </button>
            <button
              class="action-button restore-action ui-button"
              type="button"
              :disabled="!hasUnsavedChanges || !activeGlyphId"
              :title="$t('editor.actions.restore.title')"
              @click="restoreSavedGlyph"
            >
              <i-material-symbols-restore-page-outline class="icon" />
              {{ $t('editor.actions.restore.button') }}
            </button>
            <button
              class="action-button ui-button ui-button--danger"
              :title="$t('editor.actions.clear.title')"
              type="button"
              @click="handleClear"
            >
              <i-material-symbols-mop-outline class="icon" />
              {{ $t('editor.actions.clear.button') }}
            </button>
            <button
              class="action-button ui-button ui-button--primary"
              :title="$t('editor.actions.add_to_glyphset.title')"
              type="button"
              @click="addToGlyphset"
            >
              <i-material-symbols-add-box-outline class="icon" />
              {{ $t('editor.actions.add_to_glyphset.button') }}
            </button>
          </div>
          <div class="history-controls">
            <button
              class="icon-button ui-icon-button"
              :disabled="!canUndo"
              :title="$t('editor.actions.undo.title')"
              type="button"
              :aria-label="$t('editor.actions.undo.title')"
              @click="handleUndo"
            >
              <i-material-symbols-undo class="icon" />
            </button>
            <button
              class="icon-button ui-icon-button"
              :disabled="!canRedo"
              :title="$t('editor.actions.redo.title')"
              type="button"
              :aria-label="$t('editor.actions.redo.title')"
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
          @command="handleGridCommand"
          @update:model-value="updateDrawValue"
        />
        <HexCodeInput :hex-code="hexCode" @apply="applyHexCode" />
        <DownloadButtons :grid-data="gridData" :codepoint="currentCodePoint" />
      </div>
    </main>

    <div
      :class="[
        'sidebar',
        {
          active: isSidebarActive,
          'glyph-library-expanded': isGlyphLibraryExpanded,
        },
      ]"
    >
      <div class="sidebar-resizer" @pointerdown="startResize"></div>
      <button
        class="btn-close-sidebar"
        type="button"
        :aria-label="$t('header.close_glyph_manager')"
        @click="handleCloseSidebar"
      >
        <i-material-symbols-close class="icon" />
      </button>
      <GlyphManager
        v-if="isSidebarActive"
        ref="glyphManagerRef"
        v-model:expanded="isGlyphLibraryExpanded"
        :glyphs="glyphs"
        :on-glyph-change="setGlyphs"
        :prefill-data="prefillData"
        :active-code-point="currentCodePoint"
        @edit-in-grid="handleGlyphEdit"
        @clear-prefill="clearPrefillData"
        @saved="handleGlyphSaved"
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
    <MobileCommandBar
      :current-tool="currentTool"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :has-clipboard-data="hasClipboardData"
      @tool="selectTool"
      @undo="handleUndo"
      @redo="handleRedo"
      @action="handleMobileAction"
    />
    <div class="copyright-text" role="contentinfo">
      <div class="copyright-line copyright-line-top">
        <span class="copyright-left">
          Copyright © 2024 - 2026
          <a
            href="https://github.com/SkyEye-FAST"
            aria-label="SkyEye_FAST on GitHub"
            >SkyEye_FAST</a
          >
        </span>
      </div>
      <div class="copyright-line copyright-line-bottom">
        <span class="copyright-links" aria-hidden="false">
          <a
            href="https://unifoundry.com/unifont/"
            target="_blank"
            rel="noreferrer nofollow"
            aria-label="GNU Unifont website"
            >GNU Unifont</a
          >
          <span v-if="unifontVersion" class="version">{{
            unifontVersion
          }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { useEditorDocument } from '@/composables/useEditorDocument'
import { useNotifications } from '@/composables/useNotifications'
import { useSettings } from '@/composables/useSettings'
import { useSidebar } from '@/composables/useSidebar'
import { registerDraftFlusher } from '@/platform/draftFlush'
import type { EditorCommand, MobileAction } from '@/types/editor'
import type { EditorTool, Glyph, GridCell, PrefillData } from '@/types/glyph'
import { getGlyphRepository, type StoredDraft } from '@/storage/glyphRepository'
import { getGlyphWidthFromHex, gridToHex, hexToGrid } from '@/utils/hexUtils'

import DialogBox from './DialogBox.vue'
import DownloadButtons from './DownloadButtons.vue'
import EditorHeader from './EditorHeader.vue'
import GlyphGrid from './GlyphGrid.vue'
import GlyphInfo from './GlyphInfo.vue'
import GlyphManager from './GlyphManager.vue'
import HexCodeInput from './HexCodeInput.vue'
import MobileCommandBar from './MobileCommandBar.vue'
import SettingsSidebar from './SettingsSidebar.vue'
import ToolButtons from './ToolButtons.vue'

interface DialogConfigExtended {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

const { t: $t } = useI18n()
const { notify } = useNotifications()

const { settings, showSettings } = useSettings()
const editorDocument = useEditorDocument({ width: settings.value.glyphWidth })
const glyphRepository = getGlyphRepository()
const gridData = editorDocument.grid
const width = editorDocument.width
const activeGlyphId = editorDocument.activeGlyphId
const hexCode = computed(() => gridToHex(gridData.value))
const { isSidebarActive, sidebarWidth, toggleSidebar, startResize } =
  useSidebar()

let previousBodyOverflow = ''
let bodyScrollLocked = false
const narrowSidebarQuery = window.matchMedia('(max-width: 719px)')
const isNarrowSidebar = ref(narrowSidebarQuery.matches)
const isGlyphLibraryExpanded = ref(false)
const glyphManagerRef = ref<{ handleEscape: () => boolean } | null>(null)

watch(
  [isSidebarActive, isGlyphLibraryExpanded, isNarrowSidebar],
  ([active, expanded, narrow]) => {
    const shouldLock = expanded || (active && narrow)
    if (shouldLock && !bodyScrollLocked) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      bodyScrollLocked = true
    } else if (!shouldLock && bodyScrollLocked) {
      document.body.style.overflow = previousBodyOverflow
      bodyScrollLocked = false
    }
  },
)

watch(isSidebarActive, (active) => {
  if (!active) isGlyphLibraryExpanded.value = false
})

const handleSidebarMediaChange = (event: MediaQueryListEvent): void => {
  isNarrowSidebar.value = event.matches
}

const releaseBodyScrollLock = (): void => {
  if (bodyScrollLocked) {
    document.body.style.overflow = previousBodyOverflow
    bodyScrollLocked = false
  }
}

watch(
  () => settings.value.glyphWidth,
  (newWidth) => {
    if (newWidth === width.value) return
    editorDocument.execute({
      type: 'replaceGrid',
      grid: Array.from({ length: 16 }, () => Array<GridCell>(newWidth).fill(0)),
      reason: 'width-change',
    })
  },
)

watch(width, (newWidth) => {
  if (settings.value.glyphWidth !== newWidth) {
    settings.value.glyphWidth = newWidth
  }
})

const drawValue = ref<number>(1)
const currentTool = ref<EditorTool>('draw')
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

const handleToolChange = (tool: EditorTool): void => {
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
const hasUnsavedChanges = editorDocument.dirty
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
const saveStatus = ref<SaveStatus>('saved')
const saveStatusLabel = computed(() => $t(`storage.status_${saveStatus.value}`))
const pendingRestoredDraft = ref<StoredDraft | null>(null)
let draftTimer: number | null = null
let storageReady = false
let draftFlushPromise: Promise<void> | null = null
let draftRevision = 0
let unregisterDraftFlusher: (() => void) | null = null
const showDialog = ref<boolean>(false)
const dialogConfig = ref<DialogConfigExtended>({
  title: '',
  message: '',
  onConfirm: () => {},
})

interface GlyphGridInstance {
  handleCopy: () => void
  handleCut: () => void
  handlePaste: () => void
  handleSelectAll: () => void
  handleDelete: () => void
  cancelPaste: () => void
  nudgeSelection: (row: number, col: number) => void
  clearSelection: () => void
  drawing?: {
    currentDrawValue?: {
      value?: number
    }
  }
}

const gridRef = ref<GlyphGridInstance | null>(null)

const currentDrawValue = computed(() => {
  return gridRef.value?.drawing?.currentDrawValue?.value
})

const currentCodePoint = computed({
  get: () => editorDocument.codePoint.value,
  set: (codePoint: string) => {
    editorDocument.execute({ type: 'setCodePoint', codePoint })
  },
})

const unifontVersion = ref<string>(
  (import.meta.env.VITE_UNIFONT_VERSION as string) || '',
)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  narrowSidebarQuery.addEventListener('change', handleSidebarMediaChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleDraftVisibilityChange)
  unregisterDraftFlusher = registerDraftFlusher(flushDraft)
  void initializeDraftStorage()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  narrowSidebarQuery.removeEventListener('change', handleSidebarMediaChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleDraftVisibilityChange)
  unregisterDraftFlusher?.()
  releaseBodyScrollLock()
  if (saveStatus.value !== 'saved') void flushDraft().catch(() => undefined)
})

const initializeDraftStorage = async (): Promise<void> => {
  try {
    const draft = await glyphRepository.loadDraft()
    if (draft) {
      editorDocument.load(draft.snapshot, 'restored-draft', false)
      settings.value.glyphWidth = draft.snapshot.width
      pendingRestoredDraft.value = draft
      saveStatus.value = 'unsaved'
    }
    if (!glyphRepository.persistent) {
      notify({ tone: 'warning', message: $t('storage.fallback_warning') })
    }
  } catch (error) {
    console.error('Unable to restore the editor draft.', error)
    saveStatus.value = 'error'
    notify({ tone: 'error', message: $t('storage.draft_restore_failed') })
  } finally {
    storageReady = true
  }
}

const flushDraft = async (): Promise<void> => {
  if (!storageReady) return
  if (saveStatus.value === 'saved') return
  if (draftFlushPromise) return draftFlushPromise
  if (draftTimer !== null) {
    window.clearTimeout(draftTimer)
    draftTimer = null
  }
  saveStatus.value = 'saving'
  const revision = draftRevision
  draftFlushPromise = glyphRepository
    .saveDraft({
      id: 'current',
      schemaVersion: 1,
      updatedAt: Date.now(),
      snapshot: editorDocument.snapshot(),
    })
    .then(() => {
      if (draftRevision === revision) {
        saveStatus.value = 'saved'
      } else {
        saveStatus.value = 'unsaved'
        draftTimer = window.setTimeout(
          () => void flushDraft().catch(() => undefined),
          0,
        )
      }
    })
    .catch((error: unknown) => {
      const isExpectedUnloadAbort =
        document.visibilityState === 'hidden' &&
        error instanceof Error &&
        ['AbortError', 'InvalidStateError', 'UnknownError'].includes(error.name)
      if (isExpectedUnloadAbort) {
        saveStatus.value = 'unsaved'
        return
      }
      console.error('Unable to autosave the editor draft.', error)
      saveStatus.value = 'error'
      notify({ tone: 'error', message: $t('storage.draft_save_failed') })
      throw error
    })
    .finally(() => {
      draftFlushPromise = null
    })
  return draftFlushPromise
}

const scheduleDraftSave = (): void => {
  if (!storageReady) return
  draftRevision += 1
  saveStatus.value = 'unsaved'
  if (draftTimer !== null) window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(
    () => void flushDraft().catch(() => undefined),
    350,
  )
}

watch(
  [gridData, editorDocument.codePoint, editorDocument.activeGlyphId],
  scheduleDraftSave,
)

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (saveStatus.value === 'saved') return
  event.preventDefault()
  event.returnValue = ''
}

const handleDraftVisibilityChange = (): void => {
  if (document.visibilityState !== 'visible' && saveStatus.value !== 'saved') {
    void flushDraft().catch(() => undefined)
  }
}

const keepRestoredDraft = (): void => {
  pendingRestoredDraft.value = null
  scheduleDraftSave()
}

const discardRestoredDraft = async (): Promise<void> => {
  pendingRestoredDraft.value = null
  await glyphRepository.deleteDraft()
  editorDocument.load(
    {
      codePoint: '0000',
      width: settings.value.glyphWidth,
      activeGlyphId: null,
    },
    'discard-restored-draft',
  )
  saveStatus.value = 'saved'
}

const handleGlyphSaved = (glyph: Glyph): void => {
  editorDocument.markSaved(glyph.codePoint)
  pendingRestoredDraft.value = null
  void glyphRepository.deleteDraft()
  saveStatus.value = 'saved'
  notify({ tone: 'success', message: $t('storage.glyph_saved') })
}

const handleKeydown = (e: KeyboardEvent): void => {
  const target = e.target as HTMLElement | null
  if (e.key === 'Escape' && isSidebarActive.value) {
    e.preventDefault()
    if (!glyphManagerRef.value?.handleEscape()) handleCloseSidebar()
    return
  }
  if (target?.matches('input, textarea, select, [contenteditable="true"]'))
    return
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase()
    if (key === 'z' && e.shiftKey) {
      e.preventDefault()
      handleRedo()
    } else if (key === 'z') {
      e.preventDefault()
      handleUndo()
    } else if (key === 'y') {
      e.preventDefault()
      handleRedo()
    } else if (key === 'x' && hasSelection.value) {
      e.preventDefault()
      handleCut()
    } else if (key === 'c' && hasSelection.value) {
      e.preventDefault()
      handleCopy()
    } else if (key === 'v') {
      e.preventDefault()
      if (hasClipboardData.value) {
        handlePaste()
      }
    } else if (key === 'a') {
      e.preventDefault()
      selectTool('select')
      nextTick(() => gridRef.value?.handleSelectAll())
    }
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (hasSelection.value) {
      e.preventDefault()
      gridRef.value?.handleDelete()
    }
    return
  }
  if (e.key === 'Escape') {
    gridRef.value?.cancelPaste()
    clearSelection()
    return
  }
  if (hasSelection.value && e.key.startsWith('Arrow')) {
    const offsets: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const offset = offsets[e.key]
    if (offset) {
      e.preventDefault()
      gridRef.value?.nudgeSelection(...offset)
    }
    return
  }

  const key = e.key.toLowerCase()
  const shortcutTool: EditorTool | undefined =
    key === 'p'
      ? 'draw'
      : key === 'e'
        ? 'erase'
        : key === 's'
          ? 'select'
          : key === 'f'
            ? 'fill'
            : key === 'l'
              ? 'line'
              : key === 'r'
                ? e.shiftKey
                  ? 'filledRectangle'
                  : 'rectangle'
                : key === 'h'
                  ? 'pan'
                  : undefined
  if (shortcutTool) {
    e.preventDefault()
    selectTool(shortcutTool)
  }
}

const handleCopy = (): void => {
  gridRef.value?.handleCopy()
}

const handleCut = (): void => {
  gridRef.value?.handleCut()
}

const handlePaste = (): void => {
  if (!hasClipboardData.value) return
  gridRef.value?.handlePaste()
}

const clearSelection = (): void => {
  gridRef.value?.clearSelection()
}

const setGlyphs = (newGlyphs: Glyph[]): void => {
  glyphs.value = newGlyphs
}

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
    if (hasUnsavedChanges.value) {
      showConfirmDialog({
        title: $t('dialog.unsaved_changes.title'),
        message: $t('dialog.unsaved_changes.message'),
        confirmText: $t('dialog.unsaved_changes.confirm'),
        onConfirm: () => {
          if (glyph) loadGlyph(hexValue, glyph)
          if (glyph) isGlyphLibraryExpanded.value = false
          showDialog.value = false
        },
      })
    } else {
      if (glyph) {
        loadGlyph(hexValue, glyph)
        isGlyphLibraryExpanded.value = false
      }
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
  const newWidth = getGlyphWidthFromHex(hexValue)
  if (newGrid && newWidth !== null) {
    editorDocument.load(
      {
        codePoint: glyph.codePoint,
        grid: newGrid,
        activeGlyphId: glyph.codePoint,
      },
      'glyph',
    )
    settings.value.glyphWidth = newWidth
    await nextTick()
  }
}

const clearPrefillData = (): void => {
  prefillData.value = null
}

const { canUndo, canRedo } = editorDocument

const handleClear = (): void => {
  const doClear = () => {
    editorDocument.execute({ type: 'clearGrid' })
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

const handleUndo = (): void => {
  editorDocument.undo()
}

const handleRedo = (): void => {
  editorDocument.redo()
}

const restoreSavedGlyph = (): void => {
  editorDocument.restoreSaved()
}

const applyHexCode = (value: string): void => {
  const nextGrid = hexToGrid(value)
  const nextWidth = getGlyphWidthFromHex(value)
  if (nextGrid === null || nextWidth === null) return

  editorDocument.execute({ type: 'replaceGrid', grid: nextGrid, reason: 'hex' })
  settings.value.glyphWidth = nextWidth
}

const handleCloseSidebar = (): void => {
  isGlyphLibraryExpanded.value = false
  isSidebarActive.value = false
}

const handleToggleSidebar = (): void => {
  if (isSidebarActive.value) handleCloseSidebar()
  else toggleSidebar()
}

const updateSettings = (newSettings: typeof settings.value): void => {
  Object.assign(settings.value, newSettings)
}

const handleGridCommand = (command: EditorCommand): void => {
  editorDocument.execute(command)
}

const selectTool = (tool: EditorTool): void => {
  currentTool.value = tool
  if (tool === 'draw') drawValue.value = 1
  else if (tool === 'erase') drawValue.value = 0
  else if (tool === 'select') drawValue.value = 2
}

const handleMobileAction = (action: MobileAction): void => {
  if (action === 'paste') {
    handlePaste()
    return
  }
  if (action === 'clear') {
    handleClear()
    return
  }
  if (action === 'restore') {
    restoreSavedGlyph()
    return
  }
  if (action.startsWith('shift-')) {
    const direction = action.slice('shift-'.length) as
      'up' | 'down' | 'left' | 'right'
    handleGridCommand({ type: 'shiftGrid', direction })
    return
  }
  if (
    action === 'invert' ||
    action === 'flipHorizontal' ||
    action === 'flipVertical'
  ) {
    handleGridCommand({ type: action })
  }
}

const handlePasteStart = (): void => {
  if (settings.value.enableSelection) {
    drawValue.value = 2
    currentTool.value = 'select'
  }
}
</script>

<style scoped>
.restored-draft-notice {
  box-sizing: border-box;
  width: min(100%, var(--workspace-max));
  min-height: 3.25rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: 0.5rem 0.55rem 0.5rem 0.75rem;
  border: 1px solid
    color-mix(in srgb, var(--primary-color) 24%, var(--border-color));
  border-left: 3px solid var(--primary-color);
  border-radius: var(--radius-md);
  background: color-mix(
    in srgb,
    var(--primary-color) 6%,
    var(--background-light)
  );
  color: var(--text-color);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--shadow-color) 65%, transparent);
}

.restored-draft-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 1.15rem;
}

.restored-draft-message {
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
}

.restored-draft-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.restored-draft-actions button {
  min-height: var(--control-height-compact);
  padding: 0.45rem 0.7rem;
  font-size: 0.8125rem;
}

.restored-draft-actions .ui-button--quiet {
  border-color: transparent;
  color: var(--text-secondary);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: v-bind(sidebarWidth + 'px');
  height: 100dvh;
  background-color: var(--background-light);
  max-width: calc(100vw - 2rem);
  border-right: 1px solid var(--border-color);
  box-shadow: 4px 0 18px var(--modal-overlay);
  transition: transform 0.3s ease;
  transform: translateX(-100%);
  z-index: 1000;
  overflow: hidden;
  will-change: transform;
}

.sidebar.active {
  transform: translateX(0);
}

.sidebar.glyph-library-expanded {
  width: 100vw;
  max-width: none;
  border-right: 0;
  box-shadow: none;
}

.sidebar.glyph-library-expanded .sidebar-resizer,
.sidebar.glyph-library-expanded .btn-close-sidebar {
  display: none;
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

.editor-control-stack {
  box-sizing: border-box;
  width: min(100%, var(--editor-flow-max));
  display: grid;
  gap: var(--space-2);
}

.editor-layout {
  width: min(100%, var(--workspace-max));
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--space-3);
}

.editor-actions {
  width: 100%;
  margin: 0;
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}

.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.action-button {
  flex: none;
}

.action-button.icon-only {
  padding: 0;
  background: var(--background-light);
  color: var(--text-secondary);
}

.action-button.icon-only .icon {
  font-size: 20px;
}

.action-button.icon-only:hover,
.action-button.icon-only:focus-visible {
  background: var(--background-hover);
  color: var(--text-color);
}

.action-button.restore-action {
  color: var(--text-secondary);
}

.action-button .icon {
  font-size: 20px;
}

.history-controls {
  display: flex;
  flex: none;
  gap: var(--space-1);
}

.icon-button {
  color: var(--text-secondary);
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
  font-family: var(--normal-font);
  text-align: center;
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
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

.copyright-line {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.copyright-line-top {
  margin-bottom: 0.15rem;
}

.copyright-line-bottom {
  gap: 0.3rem;
}

.copyright-text .version {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.95em;
}

@media (max-width: 719px) {
  .restored-draft-notice {
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-2);
    padding: 0.65rem;
  }

  .restored-draft-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .restored-draft-actions button {
    flex: 1;
  }

  .btn-close-sidebar {
    padding: 12px;
  }

  .btn-close-sidebar .icon {
    font-size: 24px !important;
  }

  .sidebar {
    width: 100%;
    max-width: 100%;
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
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
    align-items: flex-start;
    gap: var(--space-2);
  }

  .restore-action {
    display: none;
  }

  .action-button {
    min-height: 2.75rem;
    padding-inline: 0.65rem;
    font-size: 0.8rem;
  }

  .history-controls {
    gap: var(--space-1);
  }

  .copyright-text {
    font-size: 0.8em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}

@media (min-width: 1024px) {
  .editor-layout {
    grid-template-columns: minmax(32rem, 1fr) minmax(22rem, 28rem);
    gap: clamp(1rem, 2.5vw, 2rem);
  }

  .editor-control-stack {
    position: sticky;
    top: var(--space-4);
    padding-top: 0.15rem;
  }

  .editor-control-stack .action-button {
    padding-inline: 0.55rem;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .editor-control-stack .restore-action {
    width: var(--control-height);
    padding: 0;
    font-size: 0;
  }

  .editor-actions,
  .action-group {
    gap: var(--space-1);
  }

  .action-group {
    flex-wrap: nowrap;
  }
}
</style>
