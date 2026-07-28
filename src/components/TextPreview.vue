<template>
  <Teleport to="body">
    <Transition name="text-preview-overlay">
      <div
        v-if="modelValue"
        class="text-preview-overlay"
        aria-hidden="true"
        @click="closePreview"
      ></div>
    </Transition>

    <Transition name="text-preview-drawer">
      <section
        v-if="modelValue"
        ref="drawerRef"
        class="text-preview-drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="headingId"
        @click.stop
      >
        <header class="drawer-header">
          <div class="drawer-header-inner">
            <div>
              <h2 :id="headingId" class="preview-title">
                {{ $t('text_preview.title') }}
              </h2>
              <p class="preview-hint">{{ $t('text_preview.hint') }}</p>
            </div>
            <button
              ref="closeButtonRef"
              class="preview-close ui-icon-button"
              type="button"
              :aria-label="$t('text_preview.close')"
              @click="closePreview"
            >
              <i-material-symbols-close class="icon" />
            </button>
          </div>
        </header>

        <div class="preview-content">
          <div class="preview-shell">
            <div class="preview-controls">
              <label class="preview-input-label" :for="inputId">
                {{ $t('text_preview.input_label') }}
              </label>
              <label class="scale-control">
                <span>{{ $t('text_preview.scale') }}</span>
                <input
                  v-model.number="scale"
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  :aria-label="$t('text_preview.scale')"
                />
                <output>{{ scale }}×</output>
              </label>
            </div>

            <input
              :id="inputId"
              ref="inputRef"
              v-model="previewText"
              class="preview-input"
              type="text"
              maxlength="80"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="$t('text_preview.placeholder')"
            />

            <div
              class="preview-stage"
              :class="{ 'is-loading': isLoading }"
              role="img"
              :aria-label="
                $t('text_preview.preview_label', {
                  text: previewText || $t('text_preview.empty'),
                })
              "
              aria-live="polite"
            >
              <div v-if="!previewText" class="preview-empty">
                {{ $t('text_preview.empty') }}
              </div>
              <div
                v-else-if="isLoading && previewGlyphs.length === 0"
                class="preview-empty"
              >
                {{ $t('text_preview.loading') }}
              </div>
              <div v-else class="glyph-line" aria-hidden="true">
                <svg
                  v-for="glyph in previewGlyphs"
                  :key="glyph.key"
                  class="preview-glyph"
                  :class="{ 'is-missing': glyph.missing }"
                  :style="{
                    width: `${glyph.width * scale}px`,
                    height: `${16 * scale}px`,
                  }"
                  :viewBox="`0 0 ${glyph.width} 16`"
                  preserveAspectRatio="none"
                  shape-rendering="crispEdges"
                >
                  <path v-if="glyph.path" :d="glyph.path" />
                  <g v-else-if="glyph.missing" class="missing-mark">
                    <rect
                      x="0.5"
                      y="0.5"
                      :width="glyph.width - 1"
                      height="15"
                      fill="none"
                      vector-effect="non-scaling-stroke"
                    />
                    <path
                      :d="`M2 2L${glyph.width - 2} 14M${glyph.width - 2} 2L2 14`"
                      vector-effect="non-scaling-stroke"
                    />
                  </g>
                </svg>
              </div>
            </div>

            <p
              class="preview-status"
              :class="{ error: loadFailed }"
              aria-live="polite"
            >
              <template v-if="loadFailed">{{
                $t('text_preview.load_failed')
              }}</template>
              <template v-else-if="missingCount">
                {{ $t('text_preview.missing', { count: missingCount }) }}
              </template>
              <template v-else>{{ $t('text_preview.live_hint') }}</template>
            </p>
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { unifontLoader } from '@/services/unifontLoader'
import type { Glyph, GlyphWidth } from '@/types/glyph'
import {
  createGlyphBitmapPath,
  formatGlyphCodePoint,
  glyphWidthFromData,
} from '@/utils/glyphLibrary'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'

interface PreviewGlyph {
  key: string
  width: GlyphWidth
  path: string
  missing: boolean
}

const props = defineProps<{
  modelValue: boolean
  glyphs: Glyph[]
  currentGlyph: Glyph
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t: $t } = useI18n()
const instanceId = useId()
const headingId = `text-preview-heading-${instanceId}`
const inputId = `text-preview-input-${instanceId}`

const drawerRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const previewText = ref($t('text_preview.sample'))
const scale = ref(3)
const previewGlyphs = ref<PreviewGlyph[]>([])
const isLoading = ref(false)
const loadFailed = ref(false)
let requestId = 0
let refreshTimer: number | null = null
let overlayLocked = false
let openSession = false
let previouslyFocused: HTMLElement | null = null

const missingCount = computed(
  () => previewGlyphs.value.filter((glyph) => glyph.missing).length,
)

const glyphOverrides = computed(() => {
  const overrides = new Map<number, string>()
  for (const glyph of props.glyphs) {
    const codePoint = Number.parseInt(glyph.codePoint, 16)
    if (Number.isInteger(codePoint)) overrides.set(codePoint, glyph.hexValue)
  }
  const currentCodePoint = Number.parseInt(props.currentGlyph.codePoint, 16)
  if (Number.isInteger(currentCodePoint)) {
    overrides.set(currentCodePoint, props.currentGlyph.hexValue)
  }
  return overrides
})

const closePreview = (): void => emit('update:modelValue', false)

const getFocusableElements = (): HTMLElement[] => {
  if (!drawerRef.value) return []
  return Array.from(
    drawerRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

const handleDocumentKeydown = (event: KeyboardEvent): void => {
  if (!props.modelValue) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closePreview()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (!drawerRef.value?.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const refreshPreview = async (): Promise<void> => {
  const activeRequest = ++requestId
  const characters = Array.from(previewText.value).slice(0, 80)
  if (characters.length === 0) {
    previewGlyphs.value = []
    isLoading.value = false
    loadFailed.value = false
    return
  }

  isLoading.value = true
  loadFailed.value = false
  let requestFailed = false
  const glyphRequests = new Map<number, Promise<string | null>>()

  const nextGlyphs = await Promise.all(
    characters.map(async (character, index): Promise<PreviewGlyph> => {
      const codePoint = character.codePointAt(0) ?? 0
      let hexValue = glyphOverrides.value.get(codePoint) ?? null
      if (hexValue === null) {
        let request = glyphRequests.get(codePoint)
        if (!request) {
          request = unifontLoader.getGlyph(codePoint).catch(() => {
            requestFailed = true
            return null
          })
          glyphRequests.set(codePoint, request)
        }
        hexValue = await request
      }

      const width = hexValue ? glyphWidthFromData(hexValue) : 16
      return {
        key: `${index}-${formatGlyphCodePoint(codePoint.toString(16))}`,
        width,
        path: hexValue ? createGlyphBitmapPath(hexValue, width) : '',
        missing: hexValue === null,
      }
    }),
  )

  if (activeRequest !== requestId) return
  previewGlyphs.value = nextGlyphs
  loadFailed.value = requestFailed
  isLoading.value = false
}

const scheduleRefresh = (): void => {
  requestId += 1
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    void refreshPreview()
  }, 100)
}

watch([previewText, glyphOverrides], () => {
  if (props.modelValue) scheduleRefresh()
})

watch(
  () => props.modelValue,
  (open) => {
    if (open && !openSession) {
      openSession = true
      previouslyFocused = document.activeElement as HTMLElement | null
      acquireOverlayLock()
      overlayLocked = true
      document.addEventListener('keydown', handleDocumentKeydown)
      scheduleRefresh()
      void nextTick(() => inputRef.value?.focus())
    } else if (!open && openSession) {
      openSession = false
      requestId += 1
      isLoading.value = false
      document.removeEventListener('keydown', handleDocumentKeydown)
      if (overlayLocked) {
        releaseOverlayLock()
        overlayLocked = false
      }
      const focusTarget = previouslyFocused
      previouslyFocused = null
      void nextTick(() => focusTarget?.focus())
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  requestId += 1
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (overlayLocked) releaseOverlayLock()
})
</script>

<style scoped>
.text-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1190;
  background: color-mix(in srgb, var(--modal-overlay) 62%, transparent);
}

.text-preview-drawer {
  position: fixed;
  z-index: 1191;
  right: 0;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  max-height: min(78dvh, 42rem);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border-top: 1px solid var(--border-color);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--background-light);
  color: var(--text-color);
  box-shadow: 0 -0.5rem 2rem rgba(0, 0, 0, 0.22);
}

.drawer-header {
  border-bottom: 1px solid var(--border-color);
}

.drawer-header-inner,
.preview-shell {
  box-sizing: border-box;
  width: min(100%, var(--workspace-max));
  margin-inline: auto;
}

.drawer-header-inner {
  min-height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) max(var(--space-4), env(safe-area-inset-right))
    var(--space-3) max(var(--space-4), env(safe-area-inset-left));
}

.preview-title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.2rem;
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.preview-hint,
.preview-status {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.4;
}

.preview-close {
  flex: none;
  color: var(--text-secondary);
}

.preview-close .icon {
  display: block;
}

.preview-content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.preview-shell {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) max(var(--space-4), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-bottom))
    max(var(--space-4), env(safe-area-inset-left));
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.preview-input-label {
  color: var(--text-color);
  font-size: 0.8rem;
  font-weight: 650;
}

.scale-control {
  display: grid;
  grid-template-columns: auto minmax(4.5rem, 7rem) 2rem;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
}

.scale-control input {
  width: 100%;
  accent-color: var(--primary-color);
}

.scale-control output {
  color: var(--text-color);
  font-family: var(--monospace-font);
  text-align: end;
}

.preview-input {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--control-height);
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
  font-family: var(--normal-font);
  font-size: 0.9rem;
  line-height: 1.2;
}

.preview-input:focus {
  border-color: var(--border-hover);
  outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
  outline-offset: 1px;
}

.preview-stage {
  box-sizing: border-box;
  min-height: 6rem;
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: var(--space-3);
  border: 1px solid var(--glyph-preview-border);
  border-radius: var(--radius-sm);
  background: var(--glyph-preview-background);
  color: var(--text-color);
  scrollbar-width: thin;
}

.preview-stage.is-loading {
  cursor: progress;
}

.glyph-line {
  width: max-content;
  min-width: max-content;
  display: flex;
  flex: none;
  align-items: center;
}

.preview-glyph {
  display: block;
  flex: none;
  color: currentColor;
}

.preview-glyph path {
  fill: currentColor;
}

.preview-glyph.is-missing {
  color: var(--text-secondary);
  opacity: 0.58;
}

.missing-mark rect,
.missing-mark path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1px;
}

.preview-empty {
  width: 100%;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.preview-status {
  min-height: 1.05rem;
  margin-top: 0;
}

.preview-status.error {
  color: var(--danger-color);
}

.text-preview-overlay-enter-active,
.text-preview-overlay-leave-active {
  transition: opacity 180ms ease;
}

.text-preview-overlay-enter-from,
.text-preview-overlay-leave-to {
  opacity: 0;
}

.text-preview-drawer-enter-active {
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.text-preview-drawer-leave-active {
  transition: transform 180ms cubic-bezier(0.4, 0, 1, 1);
}

.text-preview-drawer-enter-from,
.text-preview-drawer-leave-to {
  transform: translateY(100%);
}

@media (max-width: 599px) {
  .text-preview-drawer {
    max-height: calc(100dvh - 0.75rem);
  }

  .drawer-header-inner {
    min-height: 3.75rem;
  }

  .preview-hint {
    max-width: 16rem;
  }

  .preview-controls {
    display: grid;
    gap: var(--space-2);
  }

  .scale-control {
    grid-template-columns: auto minmax(0, 1fr) 2rem;
  }

  .preview-stage {
    min-height: 5.5rem;
    padding-inline: var(--space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .text-preview-overlay-enter-active,
  .text-preview-overlay-leave-active,
  .text-preview-drawer-enter-active,
  .text-preview-drawer-leave-active {
    transition: none;
  }
}
</style>
