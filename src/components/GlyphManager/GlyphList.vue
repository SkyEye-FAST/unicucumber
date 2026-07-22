<template>
  <div class="glyph-list">
    <div class="select-all-row">
      <div class="selection-controls">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="isAllSelected"
            @change="$emit('select-all-filtered')"
          />
          {{ $t('glyph_manager.select_all') }}
        </label>
        <button
          v-if="selectedCodePoints.length > 0"
          class="btn-danger batch-delete"
          :title="$t('glyph_manager.batch_delete')"
          @click="$emit('batch-delete', selectedCodePoints)"
        >
          <i-material-symbols-delete-outline class="icon" />
          {{
            $t('glyph_manager.delete_selected', {
              count: selectedCodePoints.length,
            })
          }}
        </button>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="glyph-list-scroll"
      role="list"
      :aria-label="$t('glyph_manager.library.grid_label')"
      :data-total-count="glyphs.length"
      @scroll="handleScroll"
    >
      <div
        v-if="glyphs.length"
        class="glyph-list-virtual"
        :style="{ height: `${virtualHeight}px` }"
      >
        <div
          v-for="item in visibleGlyphs"
          :key="item.glyph.codePoint"
          class="glyph-card"
          role="listitem"
          :aria-posinset="item.index + 1"
          :aria-setsize="glyphs.length"
          :data-index="item.index"
          :data-code-point="item.glyph.codePoint"
          :style="{ transform: `translateY(${item.index * ROW_HEIGHT}px)` }"
        >
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="selectedSet.has(item.glyph.codePoint)"
              @change="$emit('toggle-selection', item.glyph.codePoint)"
            />
          </label>
          <div class="glyph-preview-stack">
            <span class="glyph-character-label" :style="browserPreviewStyle">
              {{ item.glyph.character }}
            </span>
            <div
              class="glyph-preview"
              :class="{
                'dual-preview': showPixelPreview && showBrowserPreview,
              }"
              :title="
                $t('glyph_manager.glyph.edit_in_grid', {
                  codePoint: item.glyph.codePoint,
                })
              "
              @click="$emit('edit-in-grid', item.source)"
            >
              <svg
                v-if="showPixelPreview"
                class="pixel-preview bitmap-svg"
                :viewBox="`0 0 ${item.glyph.width} 16`"
                shape-rendering="crispEdges"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <path :d="item.glyph.path" />
              </svg>
              <div
                v-if="showBrowserPreview"
                class="browser-preview"
                :style="browserPreviewStyle"
                aria-hidden="true"
              >
                {{ item.glyph.character }}
              </div>
            </div>
          </div>
          <div class="glyph-info">
            <div class="info-row">
              <span class="info-label">{{
                $t('glyph_manager.glyph.code_point')
              }}</span>
              <span class="info-value">U+{{ item.glyph.codePoint }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{
                $t('glyph_manager.glyph.hex')
              }}</span>
              <span class="info-value">{{ item.glyph.hexValue }}</span>
            </div>
          </div>
          <div class="glyph-actions">
            <button
              class="btn-icon"
              :title="$t('glyph_manager.glyph.edit')"
              @click="$emit('edit', item.source)"
            >
              <i-material-symbols-edit-outline class="icon" />
            </button>
            <button
              class="btn-icon danger"
              :title="$t('glyph_manager.glyph.delete')"
              @click="$emit('remove', item.glyph.codePoint)"
            >
              <i-material-symbols-delete-outline class="icon" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="glyph-list-empty" role="status">
        {{ $t('glyph_manager.library.no_matches') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { EditorSettings, Glyph } from '@/types/glyph'
import { prepareGlyphPreview } from '@/utils/glyphLibrary'

const ROW_HEIGHT = 88
const OVERSCAN_ROWS = 5

const { t: $t } = useI18n()

const props = defineProps<{
  glyphs: Glyph[]
  selectedCodePoints: string[]
  settings: Pick<EditorSettings, 'glyphPreviewMode' | 'browserPreviewFont'>
}>()

defineEmits<{
  (event: 'edit', glyph: Glyph): void
  (event: 'remove', codePoint: string): void
  (event: 'edit-in-grid', glyph: Glyph): void
  (event: 'toggle-selection', codePoint: string): void
  (event: 'select-all-filtered'): void
  (event: 'batch-delete', codePoints: string[]): void
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(640)
let scrollFrame = 0
let resizeObserver: ResizeObserver | null = null

const showPixelPreview = computed(() =>
  ['pixelOnly', 'both'].includes(props.settings.glyphPreviewMode),
)
const showBrowserPreview = computed(() =>
  ['browserOnly', 'both'].includes(props.settings.glyphPreviewMode),
)
const selectedSet = computed(() => new Set(props.selectedCodePoints))
const isAllSelected = computed(
  () =>
    props.glyphs.length > 0 &&
    props.glyphs.every((glyph) => selectedSet.value.has(glyph.codePoint)),
)
const browserPreviewStyle = computed(() => ({
  fontFamily: props.settings.browserPreviewFont,
}))
const virtualHeight = computed(() => props.glyphs.length * ROW_HEIGHT)
const visibleRange = computed(() => {
  const start = Math.max(
    0,
    Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN_ROWS,
  )
  const end = Math.min(
    props.glyphs.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) +
      OVERSCAN_ROWS,
  )
  return { start, end }
})
const visibleGlyphs = computed(() =>
  props.glyphs
    .slice(visibleRange.value.start, visibleRange.value.end)
    .map((source, offset) => ({
      source,
      glyph: prepareGlyphPreview(source),
      index: visibleRange.value.start + offset,
    })),
)

const measureViewport = (): void => {
  viewportHeight.value = scrollContainer.value?.clientHeight || 640
}

const handleScroll = (): void => {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    scrollTop.value = scrollContainer.value?.scrollTop ?? 0
    measureViewport()
  })
}

watch(
  () => props.glyphs.length,
  () => {
    nextTick(() => {
      const maximum = Math.max(0, virtualHeight.value - viewportHeight.value)
      if (scrollTop.value > maximum && scrollContainer.value) {
        scrollContainer.value.scrollTop = maximum
        scrollTop.value = maximum
      }
    })
  },
)

onMounted(() => {
  measureViewport()
  if (typeof ResizeObserver !== 'undefined' && scrollContainer.value) {
    resizeObserver = new ResizeObserver(measureViewport)
    resizeObserver.observe(scrollContainer.value)
  }
})

onActivated(() => nextTick(measureViewport))

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<style scoped>
.glyph-list {
  min-height: 12rem;
  flex: 1 1 24rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  background-color: var(--background-color);
}

.glyph-list-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  contain: strict;
}

.glyph-list-virtual {
  position: relative;
  width: 100%;
}

.glyph-card {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  box-sizing: border-box;
  height: 82px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  overflow: hidden;
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--modal-shadow);
  contain: layout paint style;
}

.glyph-preview-stack {
  width: max-content;
  flex: none;
  display: grid;
  justify-items: center;
  gap: 2px;
}

.glyph-character-label {
  max-width: 76px;
  overflow: hidden;
  color: var(--text-color);
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.glyph-preview {
  width: 40px;
  height: 42px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 3px;
  overflow: hidden;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.glyph-preview.dual-preview {
  width: 76px;
  flex-basis: 76px;
}

.bitmap-svg {
  width: auto;
  height: 38px;
  max-width: 36px;
  flex: none;
  overflow: visible;
  fill: #111;
  image-rendering: pixelated;
  background: white;
}

.browser-preview {
  max-width: 36px;
  overflow: hidden;
  color: var(--text-color);
  font-size: 30px;
  line-height: 1;
}

.glyph-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.info-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex: none;
  color: var(--text-secondary);
  font-weight: 600;
}

.info-value {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text-color);
  font-family: var(--monospace-font);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.glyph-actions {
  flex: none;
  display: flex;
  gap: 6px;
}

.btn-icon {
  min-width: 2rem;
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-icon:hover {
  color: var(--primary-color);
}

.btn-icon.danger:hover {
  color: var(--danger-color);
}

.select-all-row {
  flex: none;
  padding: 8px 12px;
  background: var(--background-light);
  border: 1px solid var(--border-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  flex: none;
  cursor: pointer;
}

.selection-controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background-color: var(--danger-color);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-danger:hover {
  background-color: var(--danger-hover);
}

.glyph-list-empty {
  min-height: 8rem;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 420px) {
  .info-label {
    display: none;
  }

  .glyph-card {
    gap: 7px;
    padding-inline: 8px;
  }
}
</style>
