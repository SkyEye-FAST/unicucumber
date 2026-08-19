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

            <textarea
              :id="inputId"
              ref="inputRef"
              v-model="previewText"
              class="preview-input"
              rows="5"
              :maxlength="maxPreviewCharacters"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :placeholder="$t('text_preview.placeholder')"
            ></textarea>

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
                v-else-if="isLoading && previewLines.length === 0"
                class="preview-empty"
              >
                {{ $t('text_preview.loading') }}
              </div>
              <div v-else class="glyph-lines" aria-hidden="true">
                <div
                  v-for="line in previewLines"
                  :key="line.key"
                  class="glyph-line"
                  :style="{ minHeight: `${16 * scale}px` }"
                >
                  <svg
                    v-for="glyph in line.glyphs"
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

interface PreviewLine {
  key: string
  glyphs: PreviewGlyph[]
}

type PreviewGlyphTemplate = Omit<PreviewGlyph, 'key'>

const props = defineProps<{
  modelValue: boolean
  glyphs: Glyph[]
  currentGlyph: Glyph
  returnFocusTarget?: HTMLElement | null
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
const inputRef = ref<HTMLTextAreaElement | null>(null)
const previewText = ref($t('text_preview.sample'))
const scale = ref(3)
const previewLines = ref<PreviewLine[]>([])
const maxPreviewCharacters = 500
const previewLoadBatchSize = 4
const maxRemoteGlyphCacheEntries = 512
const isLoading = ref(false)
const loadFailed = ref(false)
let requestId = 0
let refreshTimer: number | null = null
let overlayLocked = false
let openSession = false
let previouslyFocused: HTMLElement | null = null
const remoteGlyphCache = new Map<number, PreviewGlyphTemplate>()

const missingCount = computed(() =>
  previewLines.value.reduce(
    (count, line) =>
      count + line.glyphs.filter((glyph) => glyph.missing).length,
    0,
  ),
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

const createGlyphTemplate = (hexValue: string | null): PreviewGlyphTemplate => {
  const width = hexValue ? glyphWidthFromData(hexValue) : 16
  return {
    width,
    path: hexValue ? createGlyphBitmapPath(hexValue, width) : '',
    missing: hexValue === null,
  }
}

const cachedRemoteGlyph = (
  codePoint: number,
): PreviewGlyphTemplate | undefined => {
  const cached = remoteGlyphCache.get(codePoint)
  if (!cached) return undefined
  remoteGlyphCache.delete(codePoint)
  remoteGlyphCache.set(codePoint, cached)
  return cached
}

const cacheRemoteGlyph = (
  codePoint: number,
  glyph: PreviewGlyphTemplate,
): void => {
  remoteGlyphCache.delete(codePoint)
  remoteGlyphCache.set(codePoint, glyph)
  while (remoteGlyphCache.size > maxRemoteGlyphCacheEntries) {
    const oldest = remoteGlyphCache.keys().next().value
    if (oldest === undefined) break
    remoteGlyphCache.delete(oldest)
  }
}

const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => window.requestAnimationFrame(() => resolve()))

const getFocusableElements = (): HTMLElement[] => {
  if (!drawerRef.value) return []
  return Array.from(
    drawerRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
  const overrides = glyphOverrides.value
  const characters = Array.from(
    previewText.value.replace(/\r\n?/g, '\n'),
  ).slice(0, maxPreviewCharacters)
  if (characters.length === 0) {
    previewLines.value = []
    isLoading.value = false
    loadFailed.value = false
    return
  }

  const characterLines = characters.reduce<string[][]>(
    (lines, character) => {
      if (character === '\n') {
        lines.push([])
      } else {
        lines[lines.length - 1]?.push(character)
      }
      return lines
    },
    [[]],
  )

  isLoading.value = true
  loadFailed.value = false
  let requestFailed = false
  const glyphTemplates = new Map<number, PreviewGlyphTemplate>()
  const codePoints = [
    ...new Set(
      characterLines.flatMap((line) =>
        line.map((character) => character.codePointAt(0) ?? 0),
      ),
    ),
  ]
  const remoteCodePoints: number[] = []

  for (const codePoint of codePoints) {
    const override = overrides.get(codePoint)
    if (override !== undefined) {
      glyphTemplates.set(codePoint, createGlyphTemplate(override))
      continue
    }
    const cached = cachedRemoteGlyph(codePoint)
    if (cached) glyphTemplates.set(codePoint, cached)
    else remoteCodePoints.push(codePoint)
  }

  for (
    let offset = 0;
    offset < remoteCodePoints.length;
    offset += previewLoadBatchSize
  ) {
    if (activeRequest !== requestId || !openSession) return
    const batch = remoteCodePoints.slice(offset, offset + previewLoadBatchSize)
    const loaded = await Promise.all(
      batch.map(async (codePoint) => {
        try {
          const glyph = createGlyphTemplate(
            await unifontLoader.getGlyph(codePoint),
          )
          cacheRemoteGlyph(codePoint, glyph)
          return [codePoint, glyph] as const
        } catch {
          requestFailed = true
          return [codePoint, createGlyphTemplate(null)] as const
        }
      }),
    )
    if (activeRequest !== requestId || !openSession) return
    for (const [codePoint, glyph] of loaded) {
      glyphTemplates.set(codePoint, glyph)
    }
    if (offset + previewLoadBatchSize < remoteCodePoints.length) {
      await yieldToBrowser()
    }
  }

  const nextLines = characterLines.map((line, lineIndex): PreviewLine => ({
    key: `line-${lineIndex}`,
    glyphs: line.map((character, characterIndex): PreviewGlyph => {
      const codePoint = character.codePointAt(0) ?? 0
      return {
        key: `${lineIndex}-${characterIndex}-${formatGlyphCodePoint(codePoint.toString(16))}`,
        ...(glyphTemplates.get(codePoint) ?? createGlyphTemplate(null)),
      }
    }),
  }))

  if (activeRequest !== requestId) return
  previewLines.value = nextLines
  loadFailed.value = requestFailed
  isLoading.value = false
}

const scheduleRefresh = (delay = 100): void => {
  requestId += 1
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    if (!props.modelValue || !openSession) return
    void refreshPreview()
  }, delay)
}

watch(previewText, () => {
  if (props.modelValue) scheduleRefresh()
})

watch(glyphOverrides, () => {
  if (props.modelValue) {
    scheduleRefresh(previewLines.value.length === 0 ? 300 : 100)
  }
})

watch(
  () => props.modelValue,
  (open) => {
    if (open && !openSession) {
      openSession = true
      previouslyFocused =
        props.returnFocusTarget ??
        (document.activeElement as HTMLElement | null)
      acquireOverlayLock()
      overlayLocked = true
      document.addEventListener('keydown', handleDocumentKeydown)
      isLoading.value = previewText.value.length > 0
      scheduleRefresh(300)
      void nextTick(() => inputRef.value?.focus())
    } else if (!open && openSession) {
      openSession = false
      requestId += 1
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer)
        refreshTimer = null
      }
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
  min-width: 0;
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
  resize: vertical;
}

.preview-input:focus {
  border-color: var(--border-hover);
  outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
  outline-offset: 1px;
}

.preview-stage {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 6rem;
  display: flex;
  align-items: center;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: var(--space-3);
  border: 1px solid var(--glyph-preview-border);
  border-radius: var(--radius-sm);
  background: var(--glyph-preview-background);
  color: var(--glyph-foreground-color);
  scrollbar-width: thin;
}

.preview-stage.is-loading {
  cursor: progress;
}

.glyph-lines {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.glyph-line {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
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
