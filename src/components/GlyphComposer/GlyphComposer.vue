<template>
  <Teleport to="body">
    <Transition name="composition-modal" appear>
      <div
        v-if="modelValue"
        class="composition-overlay"
        :class="{ 'is-expanded': workspaceExpanded }"
        @mousedown.self="close"
      >
        <section
          class="composition-workspace"
          :class="{ 'is-expanded': workspaceExpanded }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composition-title"
        >
          <header class="composition-header">
            <div class="composition-heading-block">
              <div class="composition-heading">
                <h2 id="composition-title">{{ $t('composition.title') }}</h2>
                <div class="composition-code-point-cluster">
                  <div class="composition-code-point-row">
                    <label class="composition-code-point-field">
                      <span>{{ $t('composition.code_point') }}</span>
                      <span class="composition-code-point-input">
                        <span
                          class="composition-code-point-prefix"
                          aria-hidden="true"
                        >
                          U+
                        </span>
                        <input
                          v-model="compositionCodePointInput"
                          data-testid="composition-code-point"
                          type="text"
                          inputmode="text"
                          maxlength="6"
                          autocomplete="off"
                          spellcheck="false"
                          :disabled="props.saving"
                          :aria-invalid="compositionCodePointError !== null"
                          :aria-describedby="
                            compositionCodePointError
                              ? 'composition-code-point-error'
                              : undefined
                          "
                          @input="handleCompositionCodePointInput"
                          @blur="commitCompositionCodePoint"
                          @keydown.enter.prevent="commitCompositionCodePoint"
                          @keydown.escape.stop.prevent="
                            revertCompositionCodePoint
                          "
                        />
                      </span>
                    </label>
                    <button
                      type="button"
                      class="ui-button ui-button--primary composition-code-point-confirm"
                      data-testid="composition-code-point-confirm"
                      :disabled="props.saving"
                      @click="commitCompositionCodePoint"
                    >
                      <i-material-symbols-check aria-hidden="true" />
                      <span>{{ $t('composition.apply_code_point') }}</span>
                    </button>
                  </div>
                  <CompositionIdsGuide
                    :code-point="compositionCodePoint"
                    @select-character="searchComponentCharacter"
                  />
                </div>
              </div>
              <p
                v-if="compositionCodePointError"
                id="composition-code-point-error"
                class="composition-code-point-error"
                role="alert"
              >
                {{ compositionCodePointError }}
              </p>
            </div>
            <div class="composition-header-actions">
              <button
                type="button"
                class="ui-icon-button composition-expand"
                data-testid="composition-expand"
                :aria-label="
                  $t(
                    workspaceExpanded
                      ? 'composition.exit_fullscreen'
                      : 'composition.expand',
                  )
                "
                :title="
                  $t(
                    workspaceExpanded
                      ? 'composition.exit_fullscreen'
                      : 'composition.expand',
                  )
                "
                :aria-pressed="workspaceExpanded"
                @click="workspaceExpanded = !workspaceExpanded"
              >
                <i-material-symbols-fullscreen-exit
                  v-if="workspaceExpanded"
                  aria-hidden="true"
                />
                <i-material-symbols-fullscreen v-else aria-hidden="true" />
              </button>
              <button
                ref="closeButtonRef"
                type="button"
                class="ui-icon-button"
                :aria-label="$t('composition.close')"
                @click="close"
              >
                <i-material-symbols-close aria-hidden="true" />
              </button>
            </div>
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
              ref="componentBrowserRef"
              :key="compositionCodePoint"
              class="composition-components"
              :class="{ 'mobile-hidden': activeTab !== 'components' }"
              :code-point="compositionCodePoint"
              @add-component="addComponentLayer"
            />

            <div
              class="composition-canvas-panel"
              :class="{ 'mobile-hidden': activeTab !== 'canvas' }"
            >
              <div class="canvas-panel-heading" aria-hidden="true">
                <span>{{ $t('composition.canvas') }}</span>
                <span class="canvas-dimensions">
                  {{ $t('composition.canvas_dimensions') }}
                </span>
              </div>
              <div class="canvas-stage">
                <CompositionCanvas
                  :layers="composer.document.value.layers"
                  :selected-layer-id="composer.selectedLayerId.value"
                  @move="moveSelectedLayer"
                />
              </div>
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
              @remove="removeLayer"
              @add-blank="addBlankLayer"
            />
          </div>

          <CompositionToolbar
            :can-undo="composer.canUndo.value"
            :can-redo="composer.canRedo.value"
            :saving="props.saving"
            @add-blank="addBlankLayer"
            @discard="discardDraft"
            @undo="composer.undo"
            @redo="composer.redo"
            @save="save"
          />
        </section>
      </div>
    </Transition>
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
  CompositionDocument,
  CompositionOperation,
} from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { isCJKCodePoint, normalizeCodePointHex } from '@/utils/charUtils'
import { createGrid, deepCloneGrid, hexToGrid } from '@/utils/hexUtils'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'

import ComponentBrowser from './ComponentBrowser.vue'
import CompositionCanvas from './CompositionCanvas.vue'
import CompositionIdsGuide from './CompositionIdsGuide.vue'
import CompositionLayerPanel from './CompositionLayerPanel.vue'
import CompositionToolbar from './CompositionToolbar.vue'

const props = defineProps<{
  modelValue: boolean
  codePoint: string
  grid: GridData
  returnFocusTarget?: HTMLElement | null
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [codePoint: string, grid: GridData]
}>()

const { t: $t } = useI18n()
const draftRepository = getCompositionDraftRepository()
const AUTOSAVE_DELAY_MS = 500
const DEFAULT_COMPOSITION_CODE_POINT = '4E00'

const compositionCodePoint = ref(DEFAULT_COMPOSITION_CODE_POINT)
const compositionCodePointInput = ref(DEFAULT_COMPOSITION_CODE_POINT)
const compositionCodePointError = ref<string | null>(null)
const initialGrids = new Map<string, GridData>()

const normalizeCompositionCodePoint = (value: string): string | null => {
  const normalized = normalizeCodePointHex(value)
  if (normalized === null) return null
  return isCJKCodePoint(Number.parseInt(normalized, 16)) ? normalized : null
}

const initialCodePointFromEditor = (): {
  codePoint: string
  grid: GridData
} => {
  const normalized = normalizeCodePointHex(props.codePoint)
  if (normalized !== null && isCJKCodePoint(Number.parseInt(normalized, 16))) {
    return { codePoint: normalized, grid: deepCloneGrid(props.grid) }
  }
  return { codePoint: DEFAULT_COMPOSITION_CODE_POINT, grid: createGrid(16) }
}

const buildInitialDocument = (
  codePoint = compositionCodePoint.value,
): CompositionDocument => {
  const document = createCompositionDocument(
    codePoint,
    initialGrids.get(codePoint) ?? createGrid(16),
  )
  const currentGlyph = document.layers.find(({ id }) => id === 'current-glyph')
  if (currentGlyph) currentGlyph.name = $t('composition.current_glyph')
  return document
}

const composer = useGlyphComposer(buildInitialDocument())
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const componentBrowserRef = ref<InstanceType<typeof ComponentBrowser> | null>(
  null,
)
const workspaceExpanded = ref(false)
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

const searchComponentCharacter = (character: string): void => {
  activeTab.value = 'components'
  void nextTick(() => componentBrowserRef.value?.searchCharacter(character))
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

const removeLayer = (layerId: string): void => {
  const layers = composer.document.value.layers
  const removedIndex = layers.findIndex((layer) => layer.id === layerId)
  if (removedIndex === -1) return

  const wasSelected = composer.selectedLayerId.value === layerId
  if (!composer.execute({ type: 'removeLayer', layerId })) return
  if (!wasSelected) return

  const remaining = composer.document.value.layers
  composer.selectedLayerId.value =
    remaining[Math.min(removedIndex, remaining.length - 1)]?.id ?? null
}

const resetForCompositionCodePoint = (codePoint: string): void => {
  restoreGeneration += 1
  clearDraftTimer()
  autosaveReady = false
  draftPending = false
  composer.reset(buildInitialDocument(codePoint))
  activeTab.value = 'canvas'
  nextLayerNumber.value = 1
  nextComponentNumber.value = 1
  storageWarning.value = null
  void restoreDraft()
}

const commitCompositionCodePoint = async (): Promise<void> => {
  const normalized = normalizeCompositionCodePoint(
    compositionCodePointInput.value,
  )
  if (normalized === null) {
    compositionCodePointError.value = $t('composition.code_point_invalid')
    return
  }
  compositionCodePointError.value = null
  if (normalized === compositionCodePoint.value) {
    compositionCodePointInput.value = normalized
    return
  }

  try {
    await flushDraft()
  } catch {
    return
  }
  compositionCodePoint.value = normalized
  compositionCodePointInput.value = normalized
  resetForCompositionCodePoint(normalized)
}

const handleCompositionCodePointInput = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const value = input.value.toUpperCase().slice(0, 6)
  compositionCodePointInput.value = value
  input.value = value
  compositionCodePointError.value =
    value === compositionCodePoint.value ||
    normalizeCompositionCodePoint(value) !== null
      ? null
      : $t('composition.code_point_invalid')
}

const revertCompositionCodePoint = (): void => {
  compositionCodePointInput.value = compositionCodePoint.value
  compositionCodePointError.value = null
}

const save = (): void => {
  emit(
    'save',
    compositionCodePoint.value,
    deepCloneGrid(composer.resultGrid.value),
  )
}

const close = (): void => {
  workspaceExpanded.value = false
  emit('update:modelValue', false)
}

const handleDocumentKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') return
  event.preventDefault()
  if (workspaceExpanded.value) {
    workspaceExpanded.value = false
    return
  }
  close()
}

const registerOverlay = (): void => {
  if (overlayLocked) return
  if (!hasOpened) {
    const initial = initialCodePointFromEditor()
    compositionCodePoint.value = initial.codePoint
    compositionCodePointInput.value = initial.codePoint
    initialGrids.clear()
    initialGrids.set(initial.codePoint, initial.grid)
    composer.reset(buildInitialDocument(initial.codePoint))
    hasOpened = true
    void restoreDraft()
  } else {
    compositionCodePointInput.value = compositionCodePoint.value
    compositionCodePointError.value = null
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
  workspaceExpanded.value = false
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
  width: min(96vw, 96rem);
  height: min(92vh, 52rem);
  overflow: hidden;
  color: var(--text-color);
  background: var(--modal-background);
  border: 1px solid var(--modal-border);
  border-radius: var(--radius-md);
  box-shadow: 0 1.2rem 3rem var(--modal-shadow);
}

.composition-overlay.is-expanded {
  padding: 0;
}

.composition-workspace.is-expanded {
  width: 100vw;
  height: 100dvh;
  border: 0;
  border-radius: 0;
}

.composition-modal-enter-active,
.composition-modal-leave-active {
  transition: opacity 180ms ease;
}

.composition-modal-enter-active .composition-workspace {
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.composition-modal-leave-active .composition-workspace {
  transition: transform 160ms cubic-bezier(0.4, 0, 1, 1);
}

.composition-modal-enter-from,
.composition-modal-leave-to {
  opacity: 0;
}

.composition-modal-enter-from .composition-workspace,
.composition-modal-leave-to .composition-workspace {
  transform: translateY(0.75rem) scale(0.985);
}

.composition-header {
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 4rem;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.composition-heading-block {
  flex: 1;
  min-width: 0;
}

.composition-header-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.composition-heading {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: clamp(var(--space-4), 4vw, 3rem);
  min-width: 0;
}

.composition-code-point-cluster {
  display: grid;
  grid-template-columns: max-content minmax(30rem, 1fr);
  align-items: end;
  gap: var(--space-3);
  min-width: 0;
}

.composition-code-point-row {
  display: flex;
  flex: none;
  align-items: end;
  gap: var(--space-2);
}

.composition-code-point-confirm {
  display: none;
}

.composition-header h2 {
  flex: none;
  margin: 0;
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  letter-spacing: -0.025em;
}

.composition-code-point-field {
  display: grid;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.composition-code-point-input {
  display: flex;
  align-items: center;
  min-height: var(--control-height-compact);
  overflow: hidden;
  font-family: var(--monospace-font);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--input-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.composition-code-point-input:focus-within {
  border-color: var(--border-hover);
  outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
  outline-offset: 1px;
}

.composition-code-point-prefix {
  padding-left: 0.65rem;
  font: inherit;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

.composition-code-point-field input {
  box-sizing: border-box;
  width: 5.35rem;
  min-height: var(--control-height-compact);
  padding: 0 0.65rem 0 0.25rem;
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-transform: uppercase;
  color: var(--text-color);
  background: transparent;
  border: 0;
  border-radius: 0;
  outline: 0;
  box-shadow: none;
}

.composition-code-point-error {
  margin: var(--space-1) 0 0;
  color: var(--danger-color, var(--text-color));
  font-size: 0.8rem;
}

.composition-storage-warning {
  grid-row: 2;
  margin: var(--space-2) var(--space-4) 0;
  padding: var(--space-2) var(--space-3);
  color: var(--text-color);
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.composition-body {
  grid-row: 4;
  display: grid;
  grid-template-columns: minmax(15rem, 17rem) minmax(20rem, 1fr) minmax(
      17rem,
      19rem
    );
  gap: 0;
  min-height: 0;
  border-bottom: 1px solid var(--border-color);
}

.composition-components,
.composition-layers,
.composition-canvas-panel {
  min-width: 0;
  min-height: 0;
}

.composition-components,
.composition-layers {
  background: var(--background-light);
}

.composition-components {
  border-right: 1px solid var(--border-color);
}

.composition-layers {
  border-left: 1px solid var(--border-color);
}

.composition-canvas-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--background-color);
}

.canvas-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.canvas-dimensions {
  padding: 0.3rem 0.5rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: 999px;
}

.canvas-stage {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  padding: clamp(var(--space-2), 2vw, var(--space-4));
}

.composition-mobile-tabs {
  grid-row: 3;
  display: none;
}

.composition-toolbar {
  grid-row: 5;
}

@media (max-width: 959px) {
  .composition-code-point-cluster {
    display: grid;
    gap: var(--space-2);
  }

  .composition-mobile-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    padding: 0 var(--space-3);
    background: var(--background-light);
    border-bottom: 1px solid var(--border-color);
  }

  .composition-mobile-tabs button {
    position: relative;
    min-height: 3rem;
    padding: 0 var(--space-2);
    color: var(--text-secondary);
    background: transparent;
    border: 0;
    border-radius: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .composition-mobile-tabs button.active {
    color: var(--primary-color);
    background: transparent;
  }

  .composition-mobile-tabs button.active::after {
    position: absolute;
    right: var(--space-3);
    bottom: -1px;
    left: var(--space-3);
    height: 2px;
    content: '';
    background: currentColor;
  }

  .composition-mobile-tabs button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -3px;
  }

  .composition-body {
    display: block;
    overflow: hidden;
  }

  .composition-body > * {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
  }

  .composition-body > :not(.mobile-hidden) {
    animation: composition-panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .composition-components,
  .composition-layers {
    border-inline: 0;
  }

  .mobile-hidden {
    display: none;
  }
}

@media (min-width: 960px) and (max-width: 1439px) {
  .composition-header {
    align-items: flex-start;
  }

  .composition-code-point-cluster {
    grid-template-columns: minmax(0, 1fr);
  }
}

@keyframes composition-panel-enter {
  from {
    opacity: 0;
    transform: translateY(0.35rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .composition-modal-enter-active,
  .composition-modal-leave-active,
  .composition-modal-enter-active .composition-workspace,
  .composition-modal-leave-active .composition-workspace {
    transition: none;
  }

  .composition-body > :not(.mobile-hidden) {
    animation: none;
  }
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

  .composition-header {
    align-items: flex-start;
    min-height: auto;
    padding: var(--space-3);
  }

  .composition-expand {
    display: none;
  }

  .composition-heading {
    display: grid;
    gap: var(--space-2);
  }

  .composition-code-point-cluster {
    display: grid;
    gap: var(--space-2);
  }

  .composition-code-point-row {
    width: 100%;
  }

  .composition-code-point-field {
    flex: 1;
  }

  .composition-code-point-input {
    width: 100%;
  }

  .composition-code-point-field input {
    flex: 1;
    width: 0;
  }

  .composition-code-point-confirm {
    display: inline-flex;
    min-height: var(--control-height-compact);
  }

  .composition-storage-warning {
    margin-inline: var(--space-3);
  }

  .composition-canvas-panel {
    padding: var(--space-3);
  }
}
</style>
