<template>
  <nav class="glyph-navigator" :aria-label="t('glyph_navigation.title')">
    <div class="glyph-navigator__controls">
      <CustomSelect
        class="glyph-navigator__select"
        :model-value="blockId"
        :ariaLabel="t('glyph_manager.library.unicode_block_label')"
        :empty-label="t('glyph_manager.library.no_matches')"
        :options="blockOptions"
        searchable
        mobile-modal
        @update:model-value="selectBlock"
      />
      <div
        class="glyph-navigator__nav-buttons"
        role="group"
        :aria-label="t('glyph_navigation.title')"
      >
        <button
          class="ui-icon-button glyph-navigator__btn--prev-page"
          type="button"
          :disabled="page === 0"
          :aria-label="t('glyph_navigation.previous')"
          :title="t('glyph_navigation.previous')"
          @click="page -= 1"
        >
          <i-material-symbols-keyboard-double-arrow-left />
        </button>
        <button
          class="ui-icon-button glyph-navigator__btn--prev-char"
          type="button"
          :disabled="previousCodePoint === null || navigating"
          :aria-label="t('glyph_navigation.previous_character')"
          :title="previousCharacterTooltip"
          @click="openAdjacent(previousCodePoint)"
        >
          <i-material-symbols-chevron-left />
        </button>
        <button
          class="ui-icon-button glyph-navigator__btn--next-char"
          type="button"
          :disabled="nextCodePoint === null || navigating"
          :aria-label="t('glyph_navigation.next_character')"
          :title="nextCharacterTooltip"
          @click="openAdjacent(nextCodePoint)"
        >
          <i-material-symbols-chevron-right />
        </button>
        <button
          class="ui-icon-button glyph-navigator__btn--next-page"
          type="button"
          :disabled="(page + 1) * pageSize >= codePoints.length"
          :aria-label="t('glyph_navigation.next')"
          :title="t('glyph_navigation.next')"
          @click="page += 1"
        >
          <i-material-symbols-keyboard-double-arrow-right />
        </button>
      </div>
    </div>
    <div
      ref="strip"
      :id="stripId"
      class="glyph-navigator__strip"
      :aria-busy="loading"
      @wheel="scrollWithWheel"
      @scroll="updateScrollMetrics"
    >
      <button
        v-for="codePoint in visibleCodePoints"
        :key="codePoint"
        class="glyph-navigator__glyph"
        type="button"
        :data-code-point="formatCodePoint(codePoint)"
        :aria-label="`U+${formatCodePoint(codePoint)}`"
        :aria-current="
          activeCodePoint && formatCodePoint(codePoint) === activeCodePoint
            ? 'true'
            : undefined
        "
        :disabled="!resolvedGlyphs.has(codePoint)"
        @click="openGlyph(codePoint)"
      >
        <PixelPreview
          v-if="resolvedGlyphs.get(codePoint)"
          :hex-value="resolvedGlyphs.get(codePoint)!"
          :width="getGlyphWidthFromHex(resolvedGlyphs.get(codePoint)!)!"
          display-mode="editor"
        />
        <span v-else aria-hidden="true">{{
          String.fromCodePoint(codePoint)
        }}</span>
        <small>{{ formatCodePoint(codePoint) }}</small>
      </button>
    </div>
    <HorizontalScrollbar
      class="glyph-navigator__scrollbar"
      :controls="stripId"
      :label="t('glyph_navigation.title')"
      :position="scrollPosition"
      :viewport-size="viewportSize"
      :content-size="contentSize"
      @scroll="setScrollPosition"
    />
    <div v-if="error" class="glyph-navigator__status" role="status">
      {{ t('glyph_navigation.load_error') }}
      <button class="ui-button ui-button--quiet" type="button" @click="retry">
        {{ t('glyph_navigation.retry') }}
      </button>
    </div>
    <p v-else-if="!loading && !codePoints.length" role="status">
      {{ t('glyph_manager.library.no_matches') }}
    </p>
  </nav>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useShortcuts } from '@/composables/useShortcuts'

import CustomSelect from '@/components/CustomSelect.vue'
import HorizontalScrollbar from '@/components/HorizontalScrollbar.vue'
import PixelPreview from '@/components/GlyphManager/PixelPreview.vue'
import {
  UNICODE_BLOCKS,
  getUnicodeBlockNameForLocale,
} from '@/data/unicodeBlocks'
import { unifontLoader } from '@/services/unifontLoader'
import type { Glyph } from '@/types/glyph'
import { getGlyphWidthFromHex } from '@/utils/hexUtils'

const props = defineProps<{ activeCodePoint: string; glyphs: Glyph[] }>()
const emit = defineEmits<{ open: [hexValue: string, glyph: Glyph] }>()
const { t, locale } = useI18n()
const { shortcutTooltip } = useShortcuts()
const pageSize = 32
const page = ref(0)
const strip = ref<HTMLElement | null>(null)
const stripId = useId()
const scrollPosition = ref(0)
const viewportSize = ref(0)
const contentSize = ref(0)
const updateScrollMetrics = () => {
  if (!strip.value) return
  scrollPosition.value = strip.value.scrollLeft
  viewportSize.value = strip.value.clientWidth
  contentSize.value = strip.value.scrollWidth
}
const setScrollPosition = (position: number) => {
  if (!strip.value) return
  strip.value.scrollLeft = position
  updateScrollMetrics()
}
useResizeObserver(strip, updateScrollMetrics)
const scrollWithWheel = (event: WheelEvent): void => {
  const element = strip.value
  if (!element || event.ctrlKey || event.deltaX || !event.deltaY) return
  const unit =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1
  const delta = event.deltaY * unit
  const next = Math.max(
    0,
    Math.min(
      element.scrollWidth - element.clientWidth,
      element.scrollLeft + delta,
    ),
  )
  if (next === element.scrollLeft) return
  event.preventDefault()
  element.scrollLeft = next
}
const blockId = ref('basic-latin')
const catalog = ref<number[]>([])
const catalogLoading = ref(false)
const catalogError = ref(false)
const glyphsLoading = ref(false)
const glyphsError = ref(false)
const navigating = ref(false)
const navigationError = ref(false)
const resolvedGlyphs = ref(new Map<number, string>())
const loading = computed(() => catalogLoading.value || glyphsLoading.value)
const error = computed(
  () => catalogError.value || glyphsError.value || navigationError.value,
)
let generation = 0
let disposed = false

const formatCodePoint = (value: number): string =>
  value.toString(16).toUpperCase().padStart(4, '0')
const blockOptions = computed(() =>
  UNICODE_BLOCKS.map((block) => {
    const localized = getUnicodeBlockNameForLocale(locale.value, block.id)
    return {
      value: block.id,
      label: localized ? `${localized} · ${block.name}` : block.name,
      searchText: `${block.name} ${formatCodePoint(block.start)} ${formatCodePoint(block.end)}`,
    }
  }),
)
const savedGlyphs = computed(
  () =>
    new Map(
      props.glyphs.map((glyph) => [
        Number.parseInt(glyph.codePoint, 16),
        glyph.hexValue,
      ]),
    ),
)
const orderedCodePoints = computed(() =>
  [...new Set([...catalog.value, ...savedGlyphs.value.keys()])].sort(
    (a, b) => a - b,
  ),
)
const previousCodePoint = computed(() => {
  if (!props.activeCodePoint) return null
  const active = Number.parseInt(props.activeCodePoint, 16)
  if (Number.isNaN(active)) return null
  let previous: number | null = null
  for (const value of orderedCodePoints.value) {
    if (value >= active) break
    previous = value
  }
  return previous
})
const nextCodePoint = computed(() => {
  if (!props.activeCodePoint) return null
  const active = Number.parseInt(props.activeCodePoint, 16)
  if (Number.isNaN(active)) return null
  return orderedCodePoints.value.find((value) => value > active) ?? null
})
const previousCharacterTooltip = computed(() =>
  shortcutTooltip(
    previousCodePoint.value !== null
      ? `${t('glyph_navigation.previous_character')} (U+${formatCodePoint(previousCodePoint.value)})`
      : t('glyph_navigation.previous_character'),
    'previousCharacter',
  ),
)
const nextCharacterTooltip = computed(() =>
  shortcutTooltip(
    nextCodePoint.value !== null
      ? `${t('glyph_navigation.next_character')} (U+${formatCodePoint(nextCodePoint.value)})`
      : t('glyph_navigation.next_character'),
    'nextCharacter',
  ),
)
const codePoints = computed(() => {
  const block = UNICODE_BLOCKS.find((item) => item.id === blockId.value)!
  return orderedCodePoints.value.filter(
    (value) => value >= block.start && value <= block.end,
  )
})
const visibleCodePoints = computed(() =>
  codePoints.value.slice(page.value * pageSize, (page.value + 1) * pageSize),
)

const selectBlock = (value: string | number): void => {
  blockId.value = String(value)
  page.value = 0
}
const revealActive = (): void => {
  if (!props.activeCodePoint) return
  const active = Number.parseInt(props.activeCodePoint, 16)
  if (Number.isNaN(active)) return
  const block = UNICODE_BLOCKS.find(
    (item) => active >= item.start && active <= item.end,
  )
  if (!block) return
  blockId.value = block.id
  page.value = Math.max(
    0,
    Math.floor(codePoints.value.indexOf(active) / pageSize),
  )
}
watch(
  () => props.activeCodePoint,
  () => {
    navigationError.value = false
    revealActive()
  },
  { immediate: true },
)
watch(visibleCodePoints, async () => {
  await nextTick()
  if (!strip.value) return
  const active = strip.value.querySelector<HTMLElement>('[aria-current="true"]')
  strip.value.scrollLeft = active
    ? active.offsetLeft - strip.value.offsetLeft
    : 0
  updateScrollMetrics()
})

const loadPage = async (): Promise<void> => {
  const request = ++generation
  glyphsLoading.value = true
  glyphsError.value = false
  const values = new Map<number, string>()
  // Saved edits remain available even when optional Unifont data is offline.
  for (const codePoint of visibleCodePoints.value) {
    const saved = savedGlyphs.value.get(codePoint)
    if (saved) values.set(codePoint, saved)
  }
  resolvedGlyphs.value = new Map(values)
  const results = await Promise.allSettled(
    visibleCodePoints.value.map(async (codePoint) => {
      const hex =
        values.get(codePoint) ?? (await unifontLoader.getGlyph(codePoint))
      if (!hex) throw new Error('Missing Unifont glyph')
      return [codePoint, hex] as const
    }),
  )
  if (disposed || request !== generation) return
  for (const result of results) {
    if (result.status === 'fulfilled') values.set(...result.value)
    else glyphsError.value = true
  }
  resolvedGlyphs.value = values
  glyphsLoading.value = false
}
watch(
  [visibleCodePoints, savedGlyphs],
  () => {
    void loadPage()
  },
  { immediate: true },
)

const loadCatalog = async (): Promise<void> => {
  const initialBlock = blockId.value
  catalogLoading.value = true
  catalogError.value = false
  try {
    const values = await unifontLoader.loadCatalogCodePoints()
    if (disposed) return
    catalog.value = values
    if (blockId.value === initialBlock) revealActive()
  } catch {
    if (!disposed) catalogError.value = true
  } finally {
    if (!disposed) catalogLoading.value = false
  }
}
const retry = async (): Promise<void> => {
  navigationError.value = false
  if (catalogError.value) await loadCatalog()
  if (!disposed) await loadPage()
}
const openGlyph = (codePoint: number): void => {
  const hexValue = resolvedGlyphs.value.get(codePoint)
  if (hexValue)
    emit('open', hexValue, { codePoint: formatCodePoint(codePoint), hexValue })
}
const openAdjacent = async (codePoint: number | null): Promise<void> => {
  if (codePoint === null || navigating.value) return
  const active = props.activeCodePoint
  navigating.value = true
  navigationError.value = false
  try {
    const hexValue =
      savedGlyphs.value.get(codePoint) ??
      (await unifontLoader.getGlyph(codePoint))
    if (!hexValue) throw new Error('Missing Unifont glyph')
    if (!disposed && active === props.activeCodePoint) {
      emit('open', hexValue, {
        codePoint: formatCodePoint(codePoint),
        hexValue,
      })
    }
  } catch {
    if (!disposed && active === props.activeCodePoint)
      navigationError.value = true
  } finally {
    navigating.value = false
  }
}
defineExpose({
  previousCharacter: () => openAdjacent(previousCodePoint.value),
  nextCharacter: () => openAdjacent(nextCodePoint.value),
})

onMounted(() => {
  void loadCatalog()
})
onBeforeUnmount(() => {
  disposed = true
  generation += 1
})
</script>

<style scoped>
.glyph-navigator {
  box-sizing: border-box;
  width: min(100%, 43rem);
  justify-self: center;
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--background-light);
  box-shadow: 0 1px 3px var(--shadow-color);
}
.glyph-navigator__controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  min-width: 0;
}
.glyph-navigator__select {
  flex: 1 1 0;
  min-width: 0;
}
.glyph-navigator__nav-buttons {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: none;
}
.glyph-navigator__nav-buttons .ui-icon-button {
  width: var(--control-height);
  min-width: var(--control-height);
  height: var(--control-height);
  min-height: var(--control-height);
  border: 1px solid var(--border-color);
  background: var(--input-background);
  border-radius: var(--radius-sm);
  color: var(--text-color);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.glyph-navigator__nav-buttons .ui-icon-button:hover:not(:disabled) {
  border-color: var(--border-hover);
  background: var(--background-hover);
  color: var(--primary-color);
}
.glyph-navigator__nav-buttons .ui-icon-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.glyph-navigator__strip {
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  scrollbar-width: auto;
  padding: 0.25rem 0.15rem 0.5rem;
}
.glyph-navigator__glyph {
  display: flex;
  flex: 0 0 3.75rem;
  min-height: 4.25rem;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  padding: 0.35rem 0.25rem 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-color);
  background: var(--input-background);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}
.glyph-navigator__glyph:hover:not(:disabled):not([aria-current='true']) {
  border-color: var(--border-hover);
  background: var(--background-hover);
  transform: translateY(-2px);
  box-shadow: 0 2px 6px var(--shadow-color);
}
.glyph-navigator__glyph[aria-current='true'] {
  border-color: var(--primary-color);
  background: color-mix(
    in srgb,
    var(--primary-color) 8%,
    var(--input-background)
  );
  box-shadow:
    0 0 0 1px var(--primary-color),
    0 2px 6px color-mix(in srgb, var(--primary-color) 20%, transparent);
  transform: translateY(-1px);
}
.glyph-navigator__glyph:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.glyph-navigator__glyph small {
  font-family: var(--monospace-font);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
}
.glyph-navigator__glyph[aria-current='true'] small {
  color: var(--primary-color);
}
.glyph-navigator__status {
  color: var(--text-secondary);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.glyph-navigator__scrollbar {
  display: none;
}
@media (max-width: 540px) {
  .glyph-navigator__controls {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .glyph-navigator__select {
    flex: 1 1 100%;
    width: 100%;
  }
  .glyph-navigator__nav-buttons {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
  }
  .glyph-navigator__nav-buttons .ui-icon-button {
    width: 100%;
    min-width: 0;
    height: var(--control-height);
  }
}
@media (min-width: 720px) {
  .glyph-navigator__strip {
    scrollbar-width: none;
  }
  .glyph-navigator__strip::-webkit-scrollbar {
    display: none;
  }
  .glyph-navigator__scrollbar {
    display: block;
    margin-top: 0.25rem;
  }
}
</style>
