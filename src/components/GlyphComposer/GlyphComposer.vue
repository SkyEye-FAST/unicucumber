<template>
  <Teleport to="body">
    <div v-if="modelValue" class="composition-overlay" @mousedown.self="close">
      <section
        class="composition-workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composition-title"
      >
        <header class="composition-header">
          <div>
            <h2 id="composition-title">{{ $t('composition.title') }}</h2>
            <span class="composition-code-point">U+{{ codePoint }}</span>
          </div>
          <button
            ref="closeButtonRef"
            type="button"
            class="ui-icon-button"
            :aria-label="$t('composition.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <p
          v-if="storageWarning"
          class="composition-storage-warning"
          data-testid="composition-storage-warning"
          role="status"
        >
          {{ storageWarning }}
        </p>

        <nav
          class="composition-mobile-tabs"
          :aria-label="$t('composition.title')"
        >
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            :class="{ active: activeTab === tab }"
            :aria-pressed="activeTab === tab"
            @click="activeTab = tab"
          >
            {{ $t(`composition.${tab}`) }}
          </button>
        </nav>

        <div class="composition-body">
          <ComponentBrowser
            :key="codePoint"
            class="composition-components"
            :class="{ 'mobile-hidden': activeTab !== 'components' }"
            :code-point="codePoint"
            @add-component="addComponentLayer"
          />

          <div
            class="composition-canvas-panel"
            :class="{ 'mobile-hidden': activeTab !== 'canvas' }"
          >
            <CompositionCanvas
              :layers="composer.document.value.layers"
              :selected-layer-id="composer.selectedLayerId.value"
              @move="moveSelectedLayer"
            />
          </div>

          <CompositionLayerPanel
            class="composition-layers"
            :class="{ 'mobile-hidden': activeTab !== 'layers' }"
            :layers="composer.document.value.layers"
            :selected-layer-id="composer.selectedLayerId.value"
            @select="selectLayer"
            @set-operation="setOperation"
            @set-visibility="setVisibility"
            @set-locked="setLocked"
          />
        </div>

        <CompositionToolbar
          :can-undo="composer.canUndo.value"
          :can-redo="composer.canRedo.value"
          @add-blank="addBlankLayer"
          @discard="discardDraft"
          @undo="composer.undo"
          @redo="composer.redo"
          @apply="apply"
        />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useGlyphComposer } from '@/composables/useGlyphComposer'
import { createCompositionDocument } from '@/domain/composition'
import { registerDraftFlusher } from '@/platform/draftFlush'
import {
  getCompositionDraftRepository,
  type StoredCompositionDraft,
} from '@/storage/compositionDraftRepository'
import type {
  CompositionComponentRecord,
  CompositionOperation,
} from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { createGrid, deepCloneGrid, hexToGrid } from '@/utils/hexUtils'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'

import ComponentBrowser from './ComponentBrowser.vue'
import CompositionCanvas from './CompositionCanvas.vue'
import CompositionLayerPanel from './CompositionLayerPanel.vue'
import CompositionToolbar from './CompositionToolbar.vue'

const props = defineProps<{
  modelValue: boolean
  codePoint: string
  grid: GridData
  returnFocusTarget?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [grid: GridData]
}>()

const { t: $t } = useI18n()
const draftRepository = getCompositionDraftRepository()
const AUTOSAVE_DELAY_MS = 500

const buildInitialDocument = () => {
  const document = createCompositionDocument(props.codePoint, props.grid)
  const currentGlyph = document.layers.find(({ id }) => id === 'current-glyph')
  if (currentGlyph) currentGlyph.name = $t('composition.current_glyph')
  return document
}

const composer = useGlyphComposer(buildInitialDocument())
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const activeTab = ref<'components' | 'canvas' | 'layers'>('canvas')
const tabs = ['components', 'canvas', 'layers'] as const
const nextLayerNumber = ref(1)
const nextComponentNumber = ref(1)
const storageWarning = ref<string | null>(null)
let overlayLocked = false
let previouslyFocused: HTMLElement | null = null
let hasOpened = false
let autosaveReady = false
let draftPending = false
let draftTimer: ReturnType<typeof setTimeout> | null = null
let draftSavePromise: Promise<void> | null = null
let restoreGeneration = 0
let unregisterDraftFlusher: (() => void) | null = null

const documentFingerprint = (): string =>
  JSON.stringify(composer.document.value)

const clearDraftTimer = (): void => {
  if (draftTimer === null) return
  clearTimeout(draftTimer)
  draftTimer = null
}

const updateStorageModeWarning = (): void => {
  if (!draftRepository.persistent && storageWarning.value === null) {
    storageWarning.value = $t('composition.draft_fallback_warning')
  }
}

const flushDraft = async (): Promise<void> => {
  clearDraftTimer()
  if (!autosaveReady || !draftPending) return
  if (draftSavePromise) {
    await draftSavePromise
    if (draftPending) await flushDraft()
    return
  }

  const fingerprint = documentFingerprint()
  const document = composer.document.value
  const draft: StoredCompositionDraft = {
    id: document.codePoint,
    schemaVersion: 1,
    updatedAt: Date.now(),
    document,
  }
  draftPending = false
  const request = draftRepository
    .saveDraft(draft)
    .then(() => {
      updateStorageModeWarning()
      if (documentFingerprint() === fingerprint) composer.markSaved()
    })
    .catch((error: unknown) => {
      draftPending = true
      storageWarning.value = $t('composition.draft_storage_warning')
      throw error
    })
    .finally(() => {
      if (draftSavePromise === request) draftSavePromise = null
    })
  draftSavePromise = request
  await request
}

const queueDraftSave = (): void => {
  if (!autosaveReady) return
  draftPending = true
  clearDraftTimer()
  draftTimer = setTimeout(() => {
    draftTimer = null
    void flushDraft().catch(() => undefined)
  }, AUTOSAVE_DELAY_MS)
}

const restoreDraft = async (): Promise<void> => {
  const generation = ++restoreGeneration
  const baseline = documentFingerprint()
  let restored = false
  autosaveReady = false
  clearDraftTimer()
  draftPending = false
  try {
    const draft = await draftRepository.loadDraft(
      composer.document.value.codePoint,
    )
    if (generation !== restoreGeneration) return
    if (draft !== null && documentFingerprint() === baseline) {
      composer.reset(draft.document)
      restored = true
    }
    updateStorageModeWarning()
  } catch {
    if (generation === restoreGeneration) {
      storageWarning.value = $t('composition.draft_storage_warning')
    }
  } finally {
    if (generation !== restoreGeneration) return
    autosaveReady = true
    if (!restored && documentFingerprint() !== baseline) queueDraftSave()
  }
}

const discardDraft = async (): Promise<void> => {
  const codePoint = composer.document.value.codePoint
  const fingerprint = documentFingerprint()
  const wasPending = draftPending
  autosaveReady = false
  clearDraftTimer()
  try {
    if (draftSavePromise) await draftSavePromise.catch(() => undefined)
    await draftRepository.deleteDraft(codePoint)
    updateStorageModeWarning()
    if (
      composer.document.value.codePoint === codePoint &&
      documentFingerprint() === fingerprint
    ) {
      draftPending = false
      composer.reset(buildInitialDocument())
      activeTab.value = 'canvas'
      nextLayerNumber.value = 1
      nextComponentNumber.value = 1
    } else {
      draftPending = true
    }
  } catch {
    draftPending = wasPending || composer.dirty.value
    storageWarning.value = $t('composition.draft_storage_warning')
  } finally {
    autosaveReady = true
    if (draftPending) queueDraftSave()
  }
}

const selectLayer = (layerId: string): void => {
  composer.selectedLayerId.value = layerId
}

const addBlankLayer = (): void => {
  const number = nextLayerNumber.value
  const id = `blank-${number}`
  if (
    composer.execute({
      type: 'addLayer',
      layer: {
        id,
        name: $t('composition.new_layer', { number }),
        bitmap: createGrid(16),
        offsetX: 0,
        offsetY: 0,
        mask: null,
        operation: 'add',
        visible: true,
        locked: false,
      },
    })
  ) {
    nextLayerNumber.value += 1
    selectLayer(id)
  }
}

const addComponentLayer = (record: CompositionComponentRecord): void => {
  const bitmap = hexToGrid(record.hex)
  if (bitmap === null || bitmap[0]?.length !== 16) return

  const number = nextComponentNumber.value
  const id = `component-${record.id}-${number}`
  if (
    composer.execute({
      type: 'addLayer',
      layer: {
        id,
        name: record.characters.join(' / '),
        bitmap,
        offsetX: 0,
        offsetY: 0,
        mask: null,
        operation: 'add',
        visible: true,
        locked: false,
        componentId: record.id,
      },
    })
  ) {
    nextComponentNumber.value += 1
    selectLayer(id)
  }
}

const moveSelectedLayer = (dx: number, dy: number): void => {
  const layerId = composer.selectedLayerId.value
  if (layerId === null) return
  composer.execute({ type: 'moveLayer', layerId, dx, dy })
}

const setOperation = (
  layerId: string,
  operation: CompositionOperation,
): void => {
  composer.execute({ type: 'setOperation', layerId, operation })
}

const setVisibility = (layerId: string, visible: boolean): void => {
  composer.execute({ type: 'setVisibility', layerId, visible })
}

const setLocked = (layerId: string, locked: boolean): void => {
  composer.execute({ type: 'setLocked', layerId, locked })
}

const apply = (): void => {
  emit('apply', deepCloneGrid(composer.resultGrid.value))
}

const close = (): void => {
  emit('update:modelValue', false)
}

const handleDocumentKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  close()
}

const registerOverlay = (): void => {
  if (overlayLocked) return
  if (!hasOpened) {
    composer.reset(buildInitialDocument())
    hasOpened = true
    void restoreDraft()
  }
  overlayLocked = true
  previouslyFocused =
    props.returnFocusTarget ?? (document.activeElement as HTMLElement | null)
  acquireOverlayLock()
  document.addEventListener('keydown', handleDocumentKeydown)
  void nextTick(() => closeButtonRef.value?.focus())
}

const unregisterOverlay = (): void => {
  if (!overlayLocked) return
  overlayLocked = false
  releaseOverlayLock()
  document.removeEventListener('keydown', handleDocumentKeydown)
  previouslyFocused?.focus()
  previouslyFocused = null
}

watch(
  () => composer.document.value,
  () => queueDraftSave(),
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) registerOverlay()
    else unregisterOverlay()
  },
  { immediate: true },
)

watch(
  () => props.codePoint,
  () => {
    restoreGeneration += 1
    clearDraftTimer()
    if (autosaveReady && draftPending) {
      void flushDraft().catch(() => undefined)
    }
    autosaveReady = false
    draftPending = false
    composer.reset(buildInitialDocument())
    activeTab.value = 'canvas'
    nextLayerNumber.value = 1
    nextComponentNumber.value = 1
    hasOpened = false
    storageWarning.value = null
    if (props.modelValue) {
      hasOpened = true
      void restoreDraft()
    }
  },
)

onMounted(() => {
  unregisterDraftFlusher = registerDraftFlusher(() => flushDraft())
})

onUnmounted(() => {
  clearDraftTimer()
  unregisterDraftFlusher?.()
  unregisterDraftFlusher = null
  unregisterOverlay()
})
</script>

<style scoped>
.composition-overlay {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: var(--modal-overlay);
}

.composition-workspace {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  width: min(96vw, 78rem);
  height: min(92vh, 52rem);
  padding: var(--space-4);
  color: var(--text-color);
  background: var(--modal-background);
  border: 1px solid var(--modal-border);
  border-radius: var(--radius-md);
  box-shadow: 0 1.2rem 3rem var(--modal-shadow);
}

.composition-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
}

.composition-header h2 {
  margin: 0;
}

.composition-code-point {
  color: var(--text-secondary);
  font-family: var(--normal-font);
  font-variant-numeric: tabular-nums;
}

.composition-storage-warning {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--text-color);
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.composition-body {
  display: grid;
  grid-template-columns: minmax(12rem, 0.8fr) minmax(20rem, 1.6fr) minmax(
      14rem,
      1fr
    );
  gap: var(--space-4);
  min-height: 0;
  padding: var(--space-3) 0;
}

.composition-components,
.composition-layers,
.composition-canvas-panel {
  min-width: 0;
  min-height: 0;
}

.composition-mobile-tabs {
  display: none;
}

@media (max-width: 719px) {
  .composition-overlay {
    padding: 0;
  }

  .composition-workspace {
    width: 100vw;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .composition-mobile-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }

  .composition-mobile-tabs button {
    min-height: var(--control-height);
  }

  .composition-mobile-tabs button.active {
    color: var(--primary-color);
    border-color: var(--primary-color);
  }

  .composition-body {
    display: block;
    overflow: auto;
  }

  .mobile-hidden {
    display: none;
  }
}
</style>
