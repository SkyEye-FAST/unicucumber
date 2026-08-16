<template>
  <div
    :class="[
      'container',
      {
        'glyph-sidebar-push':
          isSidebarActive &&
          settings.glyphManagerPushEditor &&
          !isGlyphLibraryExpanded,
        'glyph-sidebar-resizing': isSidebarResizing,
      },
    ]"
  >
    <EditorHeader
      @open-settings="openSettings"
      @open-text-preview="openTextPreview"
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
      :return-focus-target="settingsFocusTarget"
      :settings="settings"
      @update:settings="updateSettings"
    />
    <TextPreview
      v-model="showTextPreview"
      :glyphs="glyphs"
      :current-glyph="previewCurrentGlyph"
      :return-focus-target="textPreviewFocusTarget"
    />

    <main class="editor-layout">
      <section class="editor-canvas-column">
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
              :save-status="documentSaveStatus"
              :save-status-label="saveStatusLabel"
            />
          </template>
        </GlyphGrid>
        <div class="editor-output-stack">
          <HexCodeInput :hex-code="hexCode" @apply="applyHexCode" />
          <DownloadButtons
            v-model:export-scale="settings.exportScale"
            v-model:export-transparent="settings.exportTransparent"
            :grid-data="gridData"
            :codepoint="currentCodePoint"
          />
        </div>
      </section>

      <aside class="editor-control-stack">
        <div class="editor-actions">
          <div class="action-group">
            <button
              v-if="hasSelection"
              class="action-button icon-only ui-icon-button"
              type="button"
              :aria-label="$t('glyph_editor.cut_title')"
              @click="handleCut"
            >
              <i-material-symbols-content-cut class="icon" />
            </button>
            <button
              v-if="hasSelection"
              class="action-button icon-only ui-icon-button"
              type="button"
              :aria-label="$t('glyph_editor.copy_title')"
              @click="handleCopy"
            >
              <i-material-symbols-content-copy class="icon" />
            </button>
            <button
              v-if="hasClipboardData"
              class="action-button icon-only ui-icon-button"
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
              :aria-label="$t('editor.actions.restore.title')"
              @click="restoreSavedGlyph"
            >
              <i-material-symbols-restore-page-outline class="icon" />
              {{ $t('editor.actions.restore.button') }}
            </button>
            <button
              class="action-button clear-action ui-button ui-button--danger"
              :aria-label="$t('editor.actions.clear.title')"
              type="button"
              @click="handleClear"
            >
              <i-material-symbols-mop-outline class="icon" />
              {{ $t('editor.actions.clear.button') }}
            </button>
            <button
              class="action-button save-action ui-button ui-button--primary"
              :disabled="!hasUnsavedChanges || isSavingGlyph"
              :aria-label="
                $t(
                  currentGlyphIsManaged
                    ? 'editor.actions.save.title'
                    : 'editor.actions.add_to_glyphset.title',
                )
              "
              type="button"
              @click="saveCurrentGlyph"
            >
              <i-material-symbols-save-outline class="icon" />
              {{
                $t(
                  currentGlyphIsManaged
                    ? 'editor.actions.save.button'
                    : 'editor.actions.add_to_glyphset.button',
                )
              }}
            </button>
          </div>
          <div class="history-controls">
            <button
              class="icon-button ui-icon-button"
              :disabled="!canUndo"
              type="button"
              :aria-label="$t('editor.actions.undo.title')"
              @click="handleUndo"
            >
              <i-material-symbols-undo class="icon" />
            </button>
            <button
              class="icon-button ui-icon-button"
              :disabled="!canRedo"
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
      </aside>
    </main>

    <Transition name="glyph-sidebar">
      <div
        v-if="isSidebarActive"
        :class="[
          'sidebar',
          'active',
          {
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
        <KeepAlive>
          <GlyphManager
            ref="glyphManagerRef"
            v-model:expanded="isGlyphLibraryExpanded"
            v-model:search-query="glyphManagerSearchQuery"
            :glyphs="glyphs"
            :library-loading="glyphLibraryLoading"
            :library-loaded="glyphLibraryLoaded"
            :library-error="glyphLibraryError"
            :on-glyph-change="setGlyphs"
            :on-retry-load="retryGlyphLibrary"
            :prefill-data="prefillData"
            :active-code-point="currentCodePoint"
            @edit-in-grid="handleGlyphEdit"
            @clear-prefill="clearPrefillData"
            @saved="handleGlyphSaved"
          />
        </KeepAlive>
      </div>
    </Transition>

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
      :has-clipboard-data="hasClipboardData"
      @tool="selectTool"
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
import { useGlyphLibrary } from '@/composables/useGlyphLibrary'
import { useNotifications } from '@/composables/useNotifications'
import { useSettings } from '@/composables/useSettings'
import { useSidebar } from '@/composables/useSidebar'
import { registerDraftFlusher } from '@/platform/draftFlush'
import { shouldPrefetchUnifont, unifontLoader } from '@/services/unifontLoader'
import { cleanupStaleUnifontCaches } from '@/services/unifontManifest'
import { getGlyphRepository, type StoredDraft } from '@/storage/glyphRepository'
import type { EditorCommand, MobileAction } from '@/types/editor'
import type { EditorTool, Glyph, GridCell, PrefillData } from '@/types/glyph'
import { getGlyphWidthFromHex, gridToHex, hexToGrid } from '@/utils/hexUtils'
import { scheduleIdleTask } from '@/utils/idleTask'

import DialogBox from './DialogBox.vue'
import DownloadButtons from './DownloadButtons.vue'
import EditorHeader from './EditorHeader.vue'
import GlyphGrid from './GlyphGrid.vue'
import GlyphInfo from './GlyphInfo.vue'
import GlyphManager from './GlyphManager.vue'
import HexCodeInput from './HexCodeInput.vue'
import MobileCommandBar from './MobileCommandBar.vue'
import SettingsSidebar from './SettingsSidebar.vue'
import TextPreview from './TextPreview.vue'
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
const {
  glyphs,
  loading: glyphLibraryLoading,
  loaded: glyphLibraryLoaded,
  loadError: glyphLibraryError,
  load: loadGlyphLibrary,
  replaceGlyphs: replaceGlyphLibrary,
  schedulePreload: scheduleGlyphPreload,
} = useGlyphLibrary()
const gridData = editorDocument.grid
const width = editorDocument.width
const activeGlyphId = editorDocument.activeGlyphId
const hexCode = computed(() => gridToHex(gridData.value))
const previewCurrentGlyph = computed<Glyph>(() => ({
  codePoint: editorDocument.codePoint.value,
  hexValue: hexCode.value,
}))
const {
  isSidebarActive,
  isSidebarResizing,
  sidebarWidth,
  toggleSidebar,
  startResize,
} = useSidebar({
  desktopEditorReserve: () =>
    settings.value.glyphManagerPushEditor ? 320 : 32,
})

let previousBodyOverflow = ''
let bodyScrollLocked = false
let cancelGlyphPreload: (() => void) | null = null
let cancelUnifontPreload: (() => void) | null = null
const narrowSidebarQuery = window.matchMedia('(max-width: 719px)')
const isNarrowSidebar = ref(narrowSidebarQuery.matches)
const isGlyphLibraryExpanded = ref(false)
const glyphManagerSearchQuery = ref('')
const showTextPreview = ref(false)
const settingsFocusTarget = ref<HTMLElement | null>(null)
const textPreviewFocusTarget = ref<HTMLElement | null>(null)
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

const prefillData = ref<PrefillData | null>(null)
const hasUnsavedChanges = editorDocument.dirty
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
const saveStatus = ref<SaveStatus>('saved')
const getSaveStatus = (): SaveStatus => saveStatus.value
const documentSaveStatus = computed<SaveStatus>(() => {
  if (saveStatus.value === 'error') return 'error'
  if (!hasUnsavedChanges.value) return 'saved'
  return saveStatus.value === 'saving' ? 'saving' : 'unsaved'
})
const saveStatusLabel = computed(() =>
  $t(`storage.status_${documentSaveStatus.value}`),
)
const isSavingGlyph = ref(false)
const pendingRestoredDraft = ref<StoredDraft | null>(null)
let draftTimer: number | null = null
let storageReady = false
let draftFlushPromise: Promise<void> | null = null
let draftCleanupPromise: Promise<void> | null = null
let draftCleanupPending = false
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

const currentGlyphIsManaged = computed(
  () =>
    activeGlyphId.value === currentCodePoint.value ||
    glyphs.value.some((glyph) => glyph.codePoint === currentCodePoint.value),
)

const unifontVersion = ref<string>(
  (import.meta.env.VITE_UNIFONT_VERSION as string) || '',
)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  narrowSidebarQuery.addEventListener('change', handleSidebarMediaChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleDraftVisibilityChange)
  unregisterDraftFlusher = registerDraftFlusher(() => flushDraft(true))
  void initializeDraftStorage()
  cancelGlyphPreload = scheduleGlyphPreload()
  cancelUnifontPreload = scheduleIdleTask(() => {
    void unifontLoader.loadManifest().catch(() => undefined)
    void cleanupStaleUnifontCaches(unifontVersion.value).catch(() => undefined)
    const codePoint = Number.parseInt(currentCodePoint.value, 16)
    if (
      shouldPrefetchUnifont() &&
      Number.isInteger(codePoint) &&
      codePoint >= 0 &&
      codePoint <= 0x10ffff
    ) {
      void unifontLoader.prefetchCodePoint(codePoint)
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  narrowSidebarQuery.removeEventListener('change', handleSidebarMediaChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleDraftVisibilityChange)
  unregisterDraftFlusher?.()
  cancelGlyphPreload?.()
  cancelUnifontPreload?.()
  releaseBodyScrollLock()
  if (saveStatus.value !== 'saved') void flushDraft(true).catch(() => undefined)
})

const initializeDraftStorage = async (): Promise<void> => {
  const initialRevision = draftRevision
  try {
    const draft = await glyphRepository.loadDraft()
    if (draft && draftRevision === initialRevision) {
      editorDocument.load(draft.snapshot, 'restored-draft', false)
      settings.value.glyphWidth = draft.snapshot.width
      if (hasUnsavedChanges.value) {
        pendingRestoredDraft.value = draft
        saveStatus.value = 'unsaved'
      } else {
        draftCleanupPending = true
        saveStatus.value = 'saving'
      }
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
    if (draftRevision !== initialRevision) {
      if (hasUnsavedChanges.value) {
        saveStatus.value = 'unsaved'
        queueDraftSave()
      } else {
        draftCleanupPending = true
        saveStatus.value = 'saving'
      }
    }
    if (draftCleanupPending && !hasUnsavedChanges.value) {
      void flushDraftCleanup().catch(() => undefined)
    }
  }
}

const flushDraft = async (
  force = false,
  hiddenRetryRemaining = force ? 1 : 0,
): Promise<void> => {
  if (!storageReady) return
  if (draftFlushPromise) {
    await draftFlushPromise
    if (draftCleanupPending && !hasUnsavedChanges.value) {
      await flushDraftCleanup()
      return
    }
    if (force && saveStatus.value !== 'saved') {
      if (document.visibilityState === 'visible') {
        return flushDraft(true, hiddenRetryRemaining)
      }
      if (hiddenRetryRemaining > 0) {
        return flushDraft(true, hiddenRetryRemaining - 1)
      }
    }
    return
  }
  if (draftCleanupPending && !hasUnsavedChanges.value) {
    await flushDraftCleanup()
    return
  }
  if (saveStatus.value === 'saved') return
  if (!settings.value.autoSaveEnabled && !force) return
  if (draftCleanupPromise) {
    await draftCleanupPromise.catch(() => undefined)
    if (!hasUnsavedChanges.value) return
  }
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
      } else if (hasUnsavedChanges.value) {
        saveStatus.value = 'unsaved'
        queueDraftSave()
      } else {
        draftCleanupPending = true
        saveStatus.value = 'saving'
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
      if (draftCleanupPending && !hasUnsavedChanges.value) {
        void flushDraftCleanup().catch(() => undefined)
      }
    })
  const activeFlush = draftFlushPromise
  if (!force) return activeFlush
  await activeFlush
  if (draftCleanupPending && !hasUnsavedChanges.value) {
    await flushDraftCleanup()
    return
  }
  if (force && getSaveStatus() !== 'saved') {
    if (document.visibilityState === 'visible') {
      return flushDraft(true, hiddenRetryRemaining)
    }
    if (hiddenRetryRemaining > 0) {
      return flushDraft(true, hiddenRetryRemaining - 1)
    }
  }
}

const flushDraftCleanup = async (): Promise<void> => {
  if (
    !storageReady ||
    !draftCleanupPending ||
    hasUnsavedChanges.value ||
    draftFlushPromise
  ) {
    return
  }
  if (draftCleanupPromise) return draftCleanupPromise

  const revision = draftRevision
  draftCleanupPromise = glyphRepository
    .deleteDraft()
    .then(() => {
      if (draftRevision === revision && !hasUnsavedChanges.value) {
        draftCleanupPending = false
        saveStatus.value = 'saved'
      }
    })
    .catch((error: unknown) => {
      if (draftRevision === revision && !hasUnsavedChanges.value) {
        saveStatus.value = 'error'
        console.error('Unable to clear the clean editor draft.', error)
        notify({ tone: 'error', message: $t('storage.draft_save_failed') })
      }
      throw error
    })
    .finally(() => {
      draftCleanupPromise = null
    })
  return draftCleanupPromise
}

const queueDraftSave = (): void => {
  if (!storageReady || !settings.value.autoSaveEnabled) return
  if (draftTimer !== null) window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(
    () => void flushDraft().catch(() => undefined),
    settings.value.autoSaveInterval,
  )
}

const scheduleDraftSave = (): void => {
  if (!hasUnsavedChanges.value) return
  draftRevision += 1
  draftCleanupPending = false
  saveStatus.value = 'unsaved'
  if (!storageReady) return
  queueDraftSave()
}

watch(
  [gridData, editorDocument.codePoint, editorDocument.activeGlyphId],
  scheduleDraftSave,
)

watch(hasUnsavedChanges, (dirty, wasDirty) => {
  if (dirty || !wasDirty) return
  draftRevision += 1
  draftCleanupPending = true
  if (draftTimer !== null) {
    window.clearTimeout(draftTimer)
    draftTimer = null
  }
  saveStatus.value = 'saving'
  if (storageReady && !draftFlushPromise) {
    void flushDraftCleanup().catch(() => undefined)
  }
})

watch(
  () => [settings.value.autoSaveEnabled, settings.value.autoSaveInterval],
  ([enabled]) => {
    if (!enabled && draftTimer !== null) {
      window.clearTimeout(draftTimer)
      draftTimer = null
    } else if (enabled && saveStatus.value !== 'saved') {
      queueDraftSave()
    }
  },
)

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (saveStatus.value === 'saved') return
  event.preventDefault()
  event.returnValue = ''
}

const handleDraftVisibilityChange = (): void => {
  if (document.visibilityState !== 'visible' && saveStatus.value !== 'saved') {
    void flushDraft(true).catch(() => undefined)
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

const handleGlyphSaved = async (glyph: Glyph): Promise<void> => {
  if (draftTimer !== null) {
    window.clearTimeout(draftTimer)
    draftTimer = null
  }
  try {
    if (draftFlushPromise) await draftFlushPromise
    if (draftCleanupPromise) await draftCleanupPromise
    draftCleanupPending = false
    await glyphRepository.deleteDraft()
  } catch (error) {
    console.error('Unable to clear the saved editor draft.', error)
    if (saveStatus.value !== 'error') {
      notify({ tone: 'error', message: $t('storage.draft_save_failed') })
    }
    saveStatus.value = 'error'
    return
  }
  editorDocument.markSaved(glyph.codePoint)
  pendingRestoredDraft.value = null
  saveStatus.value = 'saved'
  notify({ tone: 'success', message: $t('storage.glyph_saved') })
}

const handleKeydown = (e: KeyboardEvent): void => {
  const target = e.target as HTMLElement | null
  if (e.key === 'Escape' && showTextPreview.value) {
    e.preventDefault()
    showTextPreview.value = false
    return
  }
  if (e.key === 'Escape' && isSidebarActive.value) {
    e.preventDefault()
    if (!glyphManagerRef.value?.handleEscape()) handleCloseSidebar()
    return
  }
  if (target?.matches('input, textarea, [contenteditable="true"]')) return
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
    } else if (key === 's') {
      e.preventDefault()
      void saveCurrentGlyph()
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

const setGlyphs = (newGlyphs: Glyph[]): Promise<void> =>
  replaceGlyphLibrary(newGlyphs)

const retryGlyphLibrary = (): Promise<Glyph[]> => loadGlyphLibrary(true)

const beginGlyphLibraryLoad = (): void => {
  void loadGlyphLibrary().catch(() => undefined)
}

const saveCurrentGlyph = async (): Promise<void> => {
  if (!hasUnsavedChanges.value || isSavingGlyph.value) return

  isSavingGlyph.value = true
  try {
    await loadGlyphLibrary()
    const glyph: Glyph = {
      codePoint: currentCodePoint.value,
      hexValue: hexCode.value,
    }
    const existingIndex = glyphs.value.findIndex(
      (item) => item.codePoint === glyph.codePoint,
    )
    const nextGlyphs =
      existingIndex === -1
        ? [...glyphs.value, glyph]
        : glyphs.value.map((item, index) =>
            index === existingIndex ? glyph : item,
          )

    await replaceGlyphLibrary(nextGlyphs)
    await handleGlyphSaved(glyph)
  } catch (error) {
    console.error('Unable to save the current glyph.', error)
    saveStatus.value = 'error'
    notify({ tone: 'error', message: $t('storage.glyph_save_failed') })
  } finally {
    isSavingGlyph.value = false
  }
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
  else {
    beginGlyphLibraryLoad()
    toggleSidebar()
  }
}

const openSettings = (trigger: HTMLElement): void => {
  settingsFocusTarget.value = trigger
  showSettings.value = true
}

const openTextPreview = (trigger: HTMLElement): void => {
  textPreviewFocusTarget.value = trigger
  if (isSidebarActive.value) handleCloseSidebar()
  showSettings.value = false
  showTextPreview.value = true
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
  if (action === 'restore') {
    restoreSavedGlyph()
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
  transform: translateX(-100%);
  z-index: 1000;
  overflow: hidden;
  will-change: transform;
}

.sidebar.active {
  transform: translateX(0);
  box-shadow: 4px 0 18px var(--modal-overlay);
}

.sidebar.glyph-sidebar-enter-active {
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms ease;
}

.sidebar.glyph-sidebar-leave-active {
  transition:
    transform 220ms cubic-bezier(0.4, 0, 1, 1),
    box-shadow 180ms ease;
}

.sidebar.glyph-sidebar-enter-from,
.sidebar.glyph-sidebar-leave-to {
  transform: translateX(-100%);
  box-shadow: none;
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
  width: 12px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  touch-action: none;
  z-index: 1;
}

.sidebar-resizer::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 4px;
  background-color: var(--border-color);
  content: '';
  transition: background-color 0.2s ease;
}

.sidebar-resizer:hover::after,
.sidebar-resizer:focus-visible::after {
  background-color: var(--info-color);
}

.editor-control-stack {
  box-sizing: border-box;
  width: min(100%, var(--editor-flow-max));
  display: grid;
  gap: var(--space-2);
}

.editor-canvas-column,
.editor-output-stack {
  min-width: 0;
  width: 100%;
  display: grid;
  gap: var(--space-2);
}

.editor-output-stack {
  container-type: inline-size;
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
  top: var(--space-4);
  right: var(--space-3);
  box-sizing: border-box;
  width: var(--control-height-compact);
  height: var(--control-height-compact);
  background: none;
  border: none;
  padding: 0;
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
  .editor-canvas-column {
    order: 1;
  }

  .editor-control-stack {
    order: 2;
  }

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
    top: max(0.75rem, env(safe-area-inset-top));
    right: max(0.75rem, env(safe-area-inset-right));
  }

  .editor-actions {
    align-items: center;
    gap: var(--space-2);
  }

  .action-group {
    min-width: 0;
    flex: 1;
    flex-wrap: nowrap;
  }

  .restore-action {
    display: none;
  }

  .action-button.icon-only {
    display: none;
  }

  .save-action {
    min-width: 0;
    flex: 1;
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
  .sidebar.glyph-sidebar-enter-active,
  .sidebar.glyph-sidebar-leave-active {
    transition: none;
  }
}

@media (min-width: 720px) {
  .editor-layout {
    grid-template-columns: minmax(0, 1fr) var(--control-height);
    column-gap: var(--space-3);
    row-gap: var(--space-2);
  }

  .editor-canvas-column {
    grid-column: 1;
    grid-row: 1;
  }

  .editor-output-stack {
    /* 64 hexadecimal digits for a 16px glyph, plus input actions and gaps. */
    width: min(100%, 43rem);
    justify-self: center;
  }

  .editor-control-stack {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: var(--space-4);
    width: var(--control-height);
    align-content: start;
    padding-top: 0.15rem;
  }

  .editor-control-stack .action-button {
    width: var(--control-height);
    position: relative;
    overflow: visible;
    padding: 0;
    font-size: 0;
    gap: 0;
  }

  .editor-control-stack .history-controls button {
    position: relative;
    overflow: visible;
  }

  .editor-control-stack .action-button::after,
  .editor-control-stack .history-controls button::after {
    content: attr(aria-label);
    position: absolute;
    z-index: 50;
    top: 50%;
    right: calc(100% + var(--space-2));
    display: block;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--background-light);
    box-shadow: 0 3px 10px var(--modal-overlay);
    color: var(--text-color);
    font-family: var(--normal-font);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: translate(0.35rem, -50%) scale(0.96);
    transform-origin: right center;
    transition:
      opacity 120ms ease,
      transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
      visibility 0s linear 160ms;
  }

  .editor-control-stack .action-button:hover::after,
  .editor-control-stack .action-button:focus-visible::after,
  .editor-control-stack .history-controls button:hover::after,
  .editor-control-stack .history-controls button:focus-visible::after {
    opacity: 1;
    visibility: visible;
    transform: translate(0, -50%) scale(1);
    transition-delay: 70ms;
  }

  .editor-actions,
  .action-group,
  .history-controls {
    width: var(--control-height);
    flex-direction: column;
    gap: var(--space-1);
  }

  .editor-actions {
    align-items: center;
  }

  .action-group {
    flex-wrap: nowrap;
  }
}

@media (min-width: 720px) and (max-width: 899px) {
  .editor-output-stack {
    width: 100%;
    /* The command rail occupies the second layout column. Compensate for it
       so the output stays centered under the whole editor, not just canvas. */
    transform: translateX(calc((var(--control-height) + var(--space-3)) / 2));
  }
}

@media (min-width: 1024px) {
  .container {
    transition: padding-left 220ms cubic-bezier(0.4, 0, 1, 1);
  }

  .container.glyph-sidebar-push {
    padding-left: calc(
      v-bind(sidebarWidth + 'px') + clamp(var(--space-4), 2vw, 2rem)
    );
    transition-duration: 280ms;
    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

  .container.glyph-sidebar-resizing {
    transition: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .container {
    transition: none;
  }

  .editor-control-stack .action-button::after,
  .editor-control-stack .history-controls button::after {
    transition: none;
  }
}
</style>
