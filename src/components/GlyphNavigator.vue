<template>
  <nav class="glyph-navigator" :aria-label="t('glyph_navigation.title')">
    <div class="glyph-navigator__controls">
      <CustomSelect
        :model-value="blockId"
        :ariaLabel="t('glyph_manager.library.unicode_block_label')"
        :empty-label="t('glyph_manager.library.no_matches')"
        :options="blockOptions"
        searchable
        mobile-modal
        @update:model-value="selectBlock"
      />
      <button
        class="ui-icon-button"
        type="button"
        :disabled="page === 0"
        :aria-label="t('glyph_navigation.previous')"
        @click="page -= 1"
      >
        <i-material-symbols-chevron-left />
      </button>
      <button
        class="ui-icon-button"
        type="button"
        :disabled="(page + 1) * pageSize >= codePoints.length"
        :aria-label="t('glyph_navigation.next')"
        @click="page += 1"
      >
        <i-material-symbols-chevron-right />
      </button>
    </div>
    <div ref="strip" class="glyph-navigator__strip" :aria-busy="loading">
      <button
        v-for="codePoint in visibleCodePoints"
        :key="codePoint"
        class="glyph-navigator__glyph"
        type="button"
        :data-code-point="formatCodePoint(codePoint)"
        :aria-label="`U+${formatCodePoint(codePoint)}`"
        :aria-current="
          formatCodePoint(codePoint) === activeCodePoint ? 'true' : undefined
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import CustomSelect from '@/components/CustomSelect.vue'
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
const pageSize = 32
const page = ref(0)
const strip = ref<HTMLElement | null>(null)
const blockId = ref('basic-latin')
const catalog = ref<number[]>([])
const catalogLoading = ref(false)
const catalogError = ref(false)
const glyphsLoading = ref(false)
const glyphsError = ref(false)
const resolvedGlyphs = ref(new Map<number, string>())
const loading = computed(() => catalogLoading.value || glyphsLoading.value)
const error = computed(() => catalogError.value || glyphsError.value)
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
const codePoints = computed(() => {
  const block = UNICODE_BLOCKS.find((item) => item.id === blockId.value)!
  return [...new Set([...catalog.value, ...savedGlyphs.value.keys()])]
    .filter((value) => value >= block.start && value <= block.end)
    .sort((a, b) => a - b)
})
const visibleCodePoints = computed(() =>
  codePoints.value.slice(page.value * pageSize, (page.value + 1) * pageSize),
)

const selectBlock = (value: string | number): void => {
  blockId.value = String(value)
  page.value = 0
}
const revealActive = (): void => {
  const active = Number.parseInt(props.activeCodePoint, 16)
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
watch(() => props.activeCodePoint, revealActive, { immediate: true })
watch(visibleCodePoints, async () => {
  await nextTick()
  if (!strip.value) return
  const active = strip.value.querySelector<HTMLElement>('[aria-current="true"]')
  strip.value.scrollLeft = active
    ? active.offsetLeft - strip.value.offsetLeft
    : 0
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
  if (catalogError.value) await loadCatalog()
  if (!disposed) await loadPage()
}
const openGlyph = (codePoint: number): void => {
  const hexValue = resolvedGlyphs.value.get(codePoint)
  if (hexValue)
    emit('open', hexValue, { codePoint: formatCodePoint(codePoint), hexValue })
}
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
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
}
.glyph-navigator__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.glyph-navigator__strip {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}
.glyph-navigator__glyph {
  display: flex;
  flex: 0 0 3.5rem;
  min-height: 4rem;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  color: var(--text-color);
  background: var(--input-background);
  cursor: pointer;
}
.glyph-navigator__glyph[aria-current='true'] {
  border-color: var(--primary-color);
  box-shadow: inset 0 0 0 1px var(--primary-color);
}
.glyph-navigator__glyph:disabled {
  opacity: 0.5;
  cursor: default;
}
.glyph-navigator__glyph small {
  font-family: var(--monospace-font);
  font-size: 0.65rem;
}
.glyph-navigator__status {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>
