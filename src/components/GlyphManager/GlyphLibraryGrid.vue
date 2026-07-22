<template>
  <div
    ref="scrollContainer"
    class="glyph-library-scroll"
    :class="`density-${density}`"
    @scroll="handleScroll"
  >
    <div
      v-if="baseGlyphs.length"
      ref="gridElement"
      class="glyph-library-grid"
      role="grid"
      :aria-label="$t('glyph_manager.library.grid_label')"
      :aria-colcount="columnCount"
      :aria-rowcount="rowCount"
      :data-total-count="baseGlyphs.length"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @focusin="handleFocusIn"
      @keydown="handleKeydown"
    >
      <div
        v-if="topSpacerHeight > 0"
        class="virtual-spacer"
        :style="{ height: `${topSpacerHeight}px` }"
        aria-hidden="true"
      />

      <button
        v-for="item in visibleGlyphs"
        :key="item.glyph.codePoint"
        class="glyph-library-cell"
        :class="{
          'is-active': isActive(item.glyph.codePoint),
          'is-selected': selectedSet.has(item.glyph.codePoint),
          'is-selection-mode': selectionMode,
          'preview-pixel-only': previewMode === 'pixelOnly',
          'preview-browser-only': previewMode === 'browserOnly',
          'preview-both': previewMode === 'both',
        }"
        type="button"
        role="gridcell"
        :data-code-point="item.glyph.codePoint"
        :data-index="item.index"
        :tabindex="item.index === rovingIndex ? 0 : -1"
        :aria-colindex="(item.index % columnCount) + 1"
        :aria-rowindex="Math.floor(item.index / columnCount) + 1"
        :aria-current="isActive(item.glyph.codePoint) ? 'true' : undefined"
        :aria-selected="selectedSet.has(item.glyph.codePoint)"
        :aria-label="cellAccessibleName(item.glyph)"
        :title="cellAccessibleName(item.glyph)"
      >
        <span v-if="selectionMode" class="selection-marker" aria-hidden="true">
          <i-material-symbols-check
            v-if="selectedSet.has(item.glyph.codePoint)"
          />
        </span>

        <span
          v-if="previewMode === 'both'"
          class="browser-reference"
          :style="{ fontFamily: browserPreviewFont }"
          aria-hidden="true"
        >
          {{ item.glyph.character }}
        </span>

        <span
          v-if="previewMode !== 'browserOnly'"
          class="bitmap-preview"
          aria-hidden="true"
        >
          <svg
            class="bitmap-svg"
            :viewBox="`0 0 ${item.glyph.width} 16`"
            role="img"
            shape-rendering="crispEdges"
            preserveAspectRatio="xMidYMid meet"
          >
            <path :d="item.glyph.path" />
          </svg>
        </span>

        <span
          v-if="previewMode === 'browserOnly'"
          class="browser-primary"
          :style="{ fontFamily: browserPreviewFont }"
          aria-hidden="true"
        >
          {{ item.glyph.character }}
        </span>

        <span class="glyph-cell-meta" aria-hidden="true">
          U+{{ item.glyph.codePoint }}
          <span class="glyph-width">{{ item.glyph.width }}px</span>
        </span>
      </button>

      <div
        v-if="bottomSpacerHeight > 0"
        class="virtual-spacer"
        :style="{ height: `${bottomSpacerHeight}px` }"
        aria-hidden="true"
      />
    </div>

    <div v-else class="glyph-library-empty" role="status">
      <i-material-symbols-search-off aria-hidden="true" />
      <strong>{{ $t('glyph_manager.library.no_matches') }}</strong>
      <span>{{ $t('glyph_manager.library.no_matches_hint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  Glyph,
  GlyphLibraryDensity,
  GlyphPreviewMode,
} from '@/types/glyph'
import {
  prepareGlyphPreview,
  type GlyphLibraryPreview,
} from '@/utils/glyphLibrary'

const { t: $t } = useI18n()

const props = withDefaults(
  defineProps<{
    activeCodePoint?: string
    browserPreviewFont: string
    density: GlyphLibraryDensity
    glyphs: Glyph[]
    initialScrollTop?: number
    previewMode: GlyphPreviewMode
    selectedCodePoints: string[]
    selectionMode: boolean
  }>(),
  {
    activeCodePoint: '',
    initialScrollTop: 0,
  },
)

const emit = defineEmits<{
  open: [glyph: Glyph]
  'scroll-position': [position: number]
  'toggle-selection': [codePoint: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const gridElement = ref<HTMLElement | null>(null)
const rovingIndex = ref(0)
const columnCount = ref(1)
const columnsMeasured = ref(false)
const scrollPosition = ref(0)
const viewportHeight = ref(800)
const measuredRowHeight = ref(128)
let resizeObserver: ResizeObserver | null = null
let scrollFrame = 0

const VIRTUALIZATION_THRESHOLD = 400
const INITIAL_MEASUREMENT_COUNT = 240
const OVERSCAN_ROWS = 4

const baseGlyphs = computed(() => props.glyphs)
const selectedSet = computed(() => new Set(props.selectedCodePoints))
const rowCount = computed(() =>
  Math.ceil(baseGlyphs.value.length / columnCount.value),
)
const usesVirtualization = computed(
  () => baseGlyphs.value.length > VIRTUALIZATION_THRESHOLD,
)
const virtualWindow = computed(() => {
  if (!usesVirtualization.value) {
    return { startIndex: 0, endIndex: baseGlyphs.value.length }
  }
  if (!columnsMeasured.value) {
    return {
      startIndex: 0,
      endIndex: Math.min(baseGlyphs.value.length, INITIAL_MEASUREMENT_COUNT),
    }
  }

  const height = Math.max(1, measuredRowHeight.value)
  const totalRows = rowCount.value
  const startRow = Math.min(
    Math.max(0, Math.floor(scrollPosition.value / height) - OVERSCAN_ROWS),
    Math.max(0, totalRows - 1),
  )
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollPosition.value + viewportHeight.value) / height) +
      OVERSCAN_ROWS,
  )
  return {
    startIndex: startRow * columnCount.value,
    endIndex: Math.min(baseGlyphs.value.length, endRow * columnCount.value),
  }
})
const visibleGlyphs = computed(() =>
  baseGlyphs.value
    .slice(virtualWindow.value.startIndex, virtualWindow.value.endIndex)
    .map((glyph, offset) => ({
      glyph: prepareGlyphPreview(glyph),
      index: virtualWindow.value.startIndex + offset,
    })),
)
const topSpacerHeight = computed(() => {
  if (!usesVirtualization.value || !columnsMeasured.value) return 0
  const startRow = Math.floor(
    virtualWindow.value.startIndex / columnCount.value,
  )
  return startRow * measuredRowHeight.value
})
const bottomSpacerHeight = computed(() => {
  if (!usesVirtualization.value || !columnsMeasured.value) return 0
  const renderedEndRow = Math.ceil(
    virtualWindow.value.endIndex / columnCount.value,
  )
  return Math.max(0, rowCount.value - renderedEndRow) * measuredRowHeight.value
})

const normalizeCodePoint = (value: string): string =>
  value.trim() ? value.trim().toUpperCase().padStart(4, '0') : ''
const isActive = (codePoint: string): boolean =>
  normalizeCodePoint(props.activeCodePoint) === codePoint

const cellAccessibleName = (glyph: GlyphLibraryPreview): string => {
  const states: string[] = []
  if (selectedSet.value.has(glyph.codePoint)) {
    states.push($t('glyph_manager.library.state_selected'))
  }
  if (isActive(glyph.codePoint)) {
    states.push($t('glyph_manager.library.state_active'))
  }
  return $t('glyph_manager.library.cell_accessible', {
    character: glyph.character,
    codePoint: glyph.codePoint,
    width: glyph.width,
    states: states.length ? `, ${states.join(', ')}` : '',
  })
}

const getCellFromEvent = (event: Event): HTMLButtonElement | null => {
  const target = event.target as HTMLElement | null
  return target?.closest<HTMLButtonElement>('.glyph-library-cell') ?? null
}

const getIndex = (cell: HTMLButtonElement): number =>
  Number.parseInt(cell.dataset.index ?? '0', 10)

const focusCell = (index: number): void => {
  const boundedIndex = Math.max(0, Math.min(index, baseGlyphs.value.length - 1))
  rovingIndex.value = boundedIndex
  if (
    usesVirtualization.value &&
    (boundedIndex < virtualWindow.value.startIndex ||
      boundedIndex >= virtualWindow.value.endIndex)
  ) {
    const nextScrollTop =
      Math.floor(boundedIndex / columnCount.value) * measuredRowHeight.value
    scrollPosition.value = nextScrollTop
    if (scrollContainer.value) scrollContainer.value.scrollTop = nextScrollTop
  }
  nextTick(() => {
    gridElement.value
      ?.querySelector<HTMLButtonElement>(`[data-index="${boundedIndex}"]`)
      ?.focus()
  })
}

const findOriginalGlyph = (codePoint: string): Glyph | undefined =>
  baseGlyphs.value.find(
    (glyph) => normalizeCodePoint(glyph.codePoint) === codePoint,
  )

const openCell = (cell: HTMLButtonElement): void => {
  const codePoint = cell.dataset.codePoint
  if (!codePoint) return
  const glyph = findOriginalGlyph(codePoint)
  if (glyph) emit('open', glyph)
}

const handleClick = (event: MouseEvent): void => {
  const cell = getCellFromEvent(event)
  if (!cell) return
  rovingIndex.value = getIndex(cell)
  if (props.selectionMode && cell.dataset.codePoint) {
    emit('toggle-selection', cell.dataset.codePoint)
  }
}

const handleDoubleClick = (event: MouseEvent): void => {
  if (props.selectionMode) return
  const cell = getCellFromEvent(event)
  if (cell) openCell(cell)
}

const handleFocusIn = (event: FocusEvent): void => {
  const cell = getCellFromEvent(event)
  if (cell) rovingIndex.value = getIndex(cell)
}

const handleKeydown = (event: KeyboardEvent): void => {
  const cell = getCellFromEvent(event)
  if (!cell) return
  const index = getIndex(cell)

  if (event.key === 'Enter') {
    event.preventDefault()
    openCell(cell)
    return
  }
  if (event.key === ' ' && props.selectionMode) {
    event.preventDefault()
    const codePoint = cell.dataset.codePoint
    if (codePoint) emit('toggle-selection', codePoint)
    return
  }

  const nextIndex =
    event.key === 'ArrowLeft'
      ? index - 1
      : event.key === 'ArrowRight'
        ? index + 1
        : event.key === 'ArrowUp'
          ? index - columnCount.value
          : event.key === 'ArrowDown'
            ? index + columnCount.value
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? baseGlyphs.value.length - 1
                : null
  if (nextIndex === null) return
  event.preventDefault()
  focusCell(nextIndex)
}

const updateColumnCount = (): void => {
  const cells = gridElement.value?.querySelectorAll<HTMLElement>(
    '.glyph-library-cell',
  )
  if (!cells?.length) {
    columnCount.value = 1
    return
  }
  const firstTop = cells[0]?.offsetTop
  let columns = 0
  for (const cell of cells) {
    if (cell.offsetTop !== firstTop) break
    columns += 1
  }
  columnCount.value = Math.max(1, columns)
  measuredRowHeight.value = Math.max(1, cells[0]?.offsetHeight ?? 128)
  columnsMeasured.value = true
  viewportHeight.value = scrollContainer.value?.clientHeight ?? 800
  if (
    rovingIndex.value < virtualWindow.value.startIndex ||
    rovingIndex.value >= virtualWindow.value.endIndex
  ) {
    rovingIndex.value = virtualWindow.value.startIndex
  }
}

const handleScroll = (): void => {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    scrollPosition.value = scrollContainer.value?.scrollTop ?? 0
    viewportHeight.value = scrollContainer.value?.clientHeight ?? 800
    if (
      rovingIndex.value < virtualWindow.value.startIndex ||
      rovingIndex.value >= virtualWindow.value.endIndex
    ) {
      rovingIndex.value = virtualWindow.value.startIndex
    }
    emit('scroll-position', scrollPosition.value)
  })
}

watch(baseGlyphs, (glyphs, previousGlyphs) => {
  const previousCodePoint = previousGlyphs?.[rovingIndex.value]?.codePoint
  const retainedIndex = previousCodePoint
    ? glyphs.findIndex(
        (glyph) =>
          normalizeCodePoint(glyph.codePoint) ===
          normalizeCodePoint(previousCodePoint),
      )
    : -1
  rovingIndex.value =
    retainedIndex >= 0
      ? retainedIndex
      : Math.max(0, Math.min(rovingIndex.value, glyphs.length - 1))
  columnsMeasured.value = false
  nextTick(updateColumnCount)
})

watch(
  () => props.density,
  () => {
    columnsMeasured.value = false
    nextTick(updateColumnCount)
  },
)

onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = props.initialScrollTop
    scrollPosition.value = props.initialScrollTop
    viewportHeight.value = scrollContainer.value.clientHeight || 800
  }
  nextTick(updateColumnCount)
  if (typeof ResizeObserver !== 'undefined' && scrollContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      viewportHeight.value = scrollContainer.value?.clientHeight ?? 800
      columnsMeasured.value = false
      nextTick(updateColumnCount)
    })
    resizeObserver.observe(scrollContainer.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})

defineExpose({
  focusCell,
  getScrollTop: () => scrollContainer.value?.scrollTop ?? 0,
})
</script>

<style scoped>
.glyph-library-scroll {
  --library-cell-min: clamp(5.75rem, 7vw, 7.25rem);
  --library-cell-height: clamp(7.5rem, 10vw, 8.75rem);
  --bitmap-height: clamp(3.25rem, 5vw, 4.5rem);
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  background: var(--background-color);
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

.glyph-library-scroll.density-compact {
  --library-cell-min: clamp(4.65rem, 5.5vw, 5.6rem);
  --library-cell-height: clamp(6rem, 7.2vw, 7rem);
  --bitmap-height: clamp(2.65rem, 3.5vw, 3.5rem);
}

.glyph-library-scroll.density-large {
  --library-cell-min: clamp(7rem, 9vw, 9rem);
  --library-cell-height: clamp(9.25rem, 12vw, 11rem);
  --bitmap-height: clamp(4.5rem, 7vw, 6rem);
}

.glyph-library-grid {
  min-width: 100%;
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(var(--library-cell-min), 100%), 1fr)
  );
  align-content: start;
  border-block-start: 1px solid var(--border-color);
  border-inline-start: 1px solid var(--border-color);
}

.virtual-spacer {
  grid-column: 1 / -1;
  width: 100%;
  pointer-events: none;
}

.glyph-library-cell {
  position: relative;
  min-width: 0;
  height: var(--library-cell-height);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  place-items: center;
  gap: 0.2rem;
  padding: 0.45rem 0.35rem 0.35rem;
  overflow: hidden;
  border: 0;
  border-inline-end: 1px solid var(--border-color);
  border-block-end: 1px solid var(--border-color);
  border-radius: 0;
  background: var(--background-light);
  color: var(--text-color);
  cursor: default;
  content-visibility: auto;
  contain: layout paint style;
  contain-intrinsic-size: var(--library-cell-height) var(--library-cell-min);
}

.glyph-library-cell:hover {
  z-index: 1;
  background: var(--background-hover);
  box-shadow: inset 0 0 0 1px var(--border-hover);
}

.glyph-library-cell:focus-visible {
  z-index: 4;
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.glyph-library-cell.is-active::before {
  content: '';
  position: absolute;
  z-index: 2;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  background: var(--primary-color);
}

.glyph-library-cell.is-active {
  background: color-mix(
    in srgb,
    var(--primary-color) 6%,
    var(--background-light)
  );
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--primary-color) 60%, var(--border-color));
}

.glyph-library-cell.is-selected {
  background: color-mix(
    in srgb,
    var(--primary-color) 11%,
    var(--background-light)
  );
  box-shadow: inset 0 0 0 2px var(--primary-color);
}

.selection-marker {
  position: absolute;
  z-index: 3;
  inset-block-start: 0.35rem;
  inset-inline-end: 0.35rem;
  width: 1.15rem;
  height: 1.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-hover);
  border-radius: 3px;
  background: var(--input-background);
  color: white;
  font-size: 0.9rem;
}

.is-selected .selection-marker {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.browser-reference {
  position: absolute;
  inset-block-start: 0.35rem;
  inset-inline-start: 50%;
  max-width: calc(100% - 2.5rem);
  overflow: hidden;
  color: var(--text-secondary);
  font-size: clamp(0.9rem, 1.4vw, 1.15rem);
  line-height: 1.1;
  text-overflow: ellipsis;
  transform: translateX(-50%);
}

.bitmap-preview {
  align-self: center;
  min-width: 2.75rem;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.45rem;
  background: white;
  color: #111;
}

.preview-both .bitmap-preview {
  margin-block-start: 0.8rem;
}

.bitmap-svg {
  width: auto;
  height: var(--bitmap-height);
  max-width: 100%;
  display: block;
  overflow: visible;
  fill: currentColor;
  image-rendering: pixelated;
}

.browser-primary {
  align-self: center;
  max-width: 100%;
  overflow: hidden;
  color: var(--text-color);
  font-size: calc(var(--bitmap-height) * 0.85);
  line-height: 1;
  text-overflow: ellipsis;
}

.glyph-cell-meta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  white-space: nowrap;
}

.glyph-width {
  color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
  font-size: 0.6rem;
}

.density-compact .glyph-width {
  display: none;
}

.density-compact .glyph-cell-meta {
  font-size: 0.61rem;
}

.glyph-library-empty {
  min-height: 14rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-secondary);
  text-align: center;
}

.glyph-library-empty > svg {
  font-size: 2rem;
}

.glyph-library-empty strong {
  color: var(--text-color);
  font-size: 0.95rem;
}

.glyph-library-empty span {
  font-size: 0.8125rem;
}

@media (max-width: 719px) {
  .glyph-library-scroll {
    --library-cell-min: 6.25rem;
    --library-cell-height: 7.75rem;
    --bitmap-height: 3.7rem;
  }

  .glyph-library-scroll.density-compact {
    --library-cell-min: 4.9rem;
    --library-cell-height: 6.4rem;
    --bitmap-height: 2.75rem;
  }

  .glyph-library-scroll.density-large {
    --library-cell-min: 8rem;
    --library-cell-height: 9.5rem;
    --bitmap-height: 4.8rem;
  }

  .glyph-library-cell {
    padding-inline: 0.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glyph-library-cell {
    scroll-behavior: auto;
  }
}
</style>
