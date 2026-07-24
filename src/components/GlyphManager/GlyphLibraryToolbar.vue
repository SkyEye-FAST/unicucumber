<template>
  <header class="library-toolbar">
    <div class="library-toolbar__main">
      <div class="library-identity">
        <h2>{{ $t('glyph_manager.library.title') }}</h2>
        <span class="library-count" aria-live="polite">
          {{ countLabel }}
        </span>
      </div>

      <div class="library-search">
        <i-material-symbols-search aria-hidden="true" />
        <input
          :value="searchQuery"
          type="search"
          :aria-label="$t('glyph_manager.library.search_label')"
          :placeholder="$t('glyph_manager.search')"
          @input="handleSearchInput"
        />
        <button
          v-if="searchQuery"
          class="library-clear-search"
          type="button"
          :aria-label="$t('glyph_manager.library.clear_search')"
          @click="$emit('update:searchQuery', '')"
        >
          <i-material-symbols-close aria-hidden="true" />
        </button>
      </div>

      <div
        v-show="filtersOpen"
        id="glyph-library-filters"
        class="library-filters"
      >
        <label>
          <span>{{ $t('glyph_manager.library.source_filter_label') }}</span>
          <CustomSelect
            :model-value="sourceFilter"
            :ariaLabel="$t('glyph_manager.library.source_filter_label')"
            :options="sourceFilterOptions"
            @update:model-value="updateSourceFilter"
          />
        </label>
        <div class="unicode-range-filters">
          <label>
            <span>{{ $t('glyph_manager.library.unicode_plane_label') }}</span>
            <CustomSelect
              :model-value="unicodePlane"
              :ariaLabel="$t('glyph_manager.library.unicode_plane_label')"
              :options="unicodePlaneOptions"
              mobile-modal
              searchable
              @update:model-value="updateUnicodePlane"
            />
          </label>
          <label>
            <span>{{ $t('glyph_manager.library.unicode_block_label') }}</span>
            <CustomSelect
              :model-value="unicodeBlock"
              :ariaLabel="$t('glyph_manager.library.unicode_block_label')"
              :disabled="unicodePlane === 'all'"
              :empty-label="$t('glyph_manager.library.no_matches')"
              :options="unicodeBlockOptions"
              mobile-modal
              searchable
              @update:model-value="updateUnicodeBlock"
            />
          </label>
        </div>
      </div>

      <div class="library-toolbar__buttons">
        <button
          class="ui-button library-filter-toggle"
          type="button"
          :aria-expanded="filtersOpen"
          aria-controls="glyph-library-filters"
          @click="filtersOpen = !filtersOpen"
        >
          <i-material-symbols-filter-alt aria-hidden="true" />
          <span>{{ $t('glyph_manager.library.filters') }}</span>
        </button>
        <button
          class="ui-button library-action library-selection-toggle"
          type="button"
          :class="{ 'is-active': selectionMode }"
          :aria-pressed="selectionMode"
          @click="$emit('toggle-selection-mode')"
        >
          <i-material-symbols-select-check-box aria-hidden="true" />
          <span>{{ $t('glyph_manager.library.selection_mode') }}</span>
        </button>
        <button
          class="ui-button library-tools-toggle"
          type="button"
          :aria-expanded="toolsOpen"
          aria-controls="glyph-library-tools"
          @click="toolsOpen = !toolsOpen"
        >
          <i-material-symbols-tune aria-hidden="true" />
          <span>{{ $t('glyph_manager.library.tools') }}</span>
          <i-material-symbols-keyboard-arrow-up
            v-if="toolsOpen"
            aria-hidden="true"
          />
          <i-material-symbols-keyboard-arrow-down v-else aria-hidden="true" />
        </button>
        <button
          class="ui-icon-button library-collapse"
          type="button"
          :aria-label="$t('glyph_manager.library.exit_fullscreen')"
          :title="$t('glyph_manager.library.exit_fullscreen')"
          @click="$emit('collapse')"
        >
          <i-material-symbols-fullscreen-exit aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-show="toolsOpen" id="glyph-library-tools" class="library-tools">
      <details ref="exportMenu" class="library-export-menu">
        <summary
          class="ui-button library-action"
          :aria-disabled="managedCount === 0"
          :aria-label="$t('glyph_manager.export')"
        >
          <i-material-symbols-download aria-hidden="true" />
          <span>{{ $t('glyph_manager.export') }}</span>
        </summary>
        <div class="library-export-options">
          <p class="library-export-options__group">
            {{ $t('glyph_manager.export_font_files') }}
          </p>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('otf')"
          >
            {{ $t('glyph_manager.export_otf') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('ttf')"
          >
            {{ $t('glyph_manager.export_ttf') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('woff')"
          >
            {{ $t('glyph_manager.export_woff') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('woff2')"
          >
            {{ $t('glyph_manager.export_woff2') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('bdf')"
          >
            {{ $t('glyph_manager.export_bdf') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportFont('psf')"
          >
            {{ $t('glyph_manager.export_psf') }}
          </button>
          <p
            class="library-export-options__group library-export-options__group--data"
          >
            {{ $t('glyph_manager.export_data_files') }}
          </p>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportHex"
          >
            {{ $t('glyph_manager.export_hex') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportBackup"
          >
            {{ $t('glyph_manager.export_backup') }}
          </button>
          <button
            type="button"
            :disabled="managedCount === 0"
            @click="exportSheet"
          >
            {{ $t('glyph_manager.export_sheet') }}
          </button>
          <label>
            {{ $t('glyph_manager.sheet_columns') }}
            <CustomSelect
              v-model="sheetColumns"
              :ariaLabel="$t('glyph_manager.sheet_columns')"
              :options="sheetColumnOptions"
            />
          </label>
          <label>
            {{ $t('glyph_manager.sheet_scale') }}
            <CustomSelect
              v-model="sheetScale"
              :ariaLabel="$t('glyph_manager.sheet_scale')"
              :options="sheetScaleOptions"
            />
          </label>
        </div>
      </details>

      <fieldset class="density-control">
        <legend class="visually-hidden">
          {{ $t('glyph_manager.library.density_label') }}
        </legend>
        <label v-for="option in densityOptions" :key="option">
          <input
            :checked="density === option"
            type="radio"
            name="glyph-library-density"
            :value="option"
            @change="$emit('update:density', option)"
          />
          <span>{{ $t(`glyph_manager.library.density.${option}`) }}</span>
        </label>
      </fieldset>
    </div>

    <div v-if="selectionMode" class="library-selection-bar">
      <strong>{{ selectedLabel }}</strong>
      <span class="library-selection-spacer" />
      <button
        class="ui-button ui-button--primary library-selection-add"
        type="button"
        :disabled="selectedAddableCount === 0"
        @click="$emit('add-selected')"
      >
        <i-material-symbols-add-box-outline aria-hidden="true" />
        {{
          $t('glyph_manager.library.add_selected_to_manager', {
            count: selectedAddableCount,
          })
        }}
      </button>
      <button
        class="ui-button ui-button--quiet"
        type="button"
        @click="$emit('select-filtered')"
      >
        {{ $t('glyph_manager.library.select_filtered') }}
      </button>
      <button
        class="ui-button ui-button--quiet"
        type="button"
        :disabled="selectedCount === 0"
        @click="$emit('clear-selection')"
      >
        {{ $t('glyph_manager.library.clear_selection') }}
      </button>
      <button
        v-if="selectedManagedCount > 0"
        class="ui-button ui-button--danger"
        type="button"
        @click="$emit('delete-selected')"
      >
        <i-material-symbols-delete-outline aria-hidden="true" />
        {{
          $t('glyph_manager.library.remove_from_manager', {
            count: selectedManagedCount,
          })
        }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import {
  blocksForPlane,
  UNICODE_BLOCK_NAMES_ZH_HANS,
  UNICODE_BLOCK_NAMES_ZH_HANT,
  UNICODE_PLANES,
  type UnicodeBlock,
} from '@/data/unicodeBlocks'
import type {
  GlyphLibraryDensity,
  GlyphSourceFilter,
  GlyphUnicodeBlockFilter,
  GlyphUnicodePlaneFilter,
} from '@/types/glyph'

const { t: $t, locale } = useI18n()

const props = defineProps<{
  density: GlyphLibraryDensity
  filteredCount: number
  managedCount: number
  modifiedCount: number
  searchQuery: string
  selectedAddableCount: number
  sourceFilter: GlyphSourceFilter
  selectedCount: number
  selectedManagedCount: number
  selectionMode: boolean
  totalCount: number
  unicodeBlock: GlyphUnicodeBlockFilter
  unicodePlane: GlyphUnicodePlaneFilter
}>()

const emit = defineEmits<{
  'add-selected': []
  backup: []
  collapse: []
  'clear-selection': []
  'delete-selected': []
  export: []
  font: [format: 'otf' | 'ttf' | 'woff' | 'woff2' | 'bdf' | 'psf']
  'select-filtered': []
  sheet: [options: { columns: number; scale: number }]
  'toggle-selection-mode': []
  'update:density': [value: GlyphLibraryDensity]
  'update:searchQuery': [value: string]
  'update:sourceFilter': [value: GlyphSourceFilter]
  'update:unicodeBlock': [value: GlyphUnicodeBlockFilter]
  'update:unicodePlane': [value: GlyphUnicodePlaneFilter]
}>()

const densityOptions: GlyphLibraryDensity[] = [
  'compact',
  'comfortable',
  'large',
]
const exportMenu = ref<HTMLDetailsElement | null>(null)
const filtersOpen = ref(false)
const toolsOpen = ref(false)
const sheetColumns = ref(16)
const sheetScale = ref(2)
const sheetColumnOptions: CustomSelectOption[] = [
  { value: 8, label: '8' },
  { value: 16, label: '16' },
  { value: 32, label: '32' },
]
const sheetScaleOptions: CustomSelectOption[] = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

const countLabel = computed(() =>
  props.filteredCount === props.totalCount
    ? $t('glyph_manager.library.glyph_count', { count: props.totalCount })
    : $t('glyph_manager.library.filtered_count', {
        filtered: props.filteredCount,
        total: props.totalCount,
      }),
)
const selectedLabel = computed(() =>
  $t('glyph_manager.library.selected_count', { count: props.selectedCount }),
)

const handleSearchInput = (event: Event): void => {
  emit('update:searchQuery', (event.target as HTMLInputElement).value)
}
const unicodePlanes = UNICODE_PLANES
const sourceFilterOptions = computed<CustomSelectOption[]>(() => [
  { value: 'all', label: $t('glyph_manager.library.source.all') },
  {
    value: 'modified',
    label: $t('glyph_manager.library.source.modified', {
      count: props.modifiedCount,
    }),
  },
])
const unicodePlaneOptions = computed<CustomSelectOption[]>(() => [
  { value: 'all', label: $t('glyph_manager.library.unicode_plane.all') },
  ...unicodePlanes.map((plane) => ({
    value: plane,
    label: $t(`glyph_manager.library.unicode_plane.${plane}`),
  })),
])
const availableBlocks = computed(() =>
  props.unicodePlane === 'all'
    ? []
    : blocksForPlane(Number.parseInt(props.unicodePlane, 10)),
)
const formatCodePoint = (value: number): string =>
  value.toString(16).toUpperCase().padStart(4, '0')
const blockLabel = (block: UnicodeBlock): string => {
  const localized =
    locale.value === 'zh-TW'
      ? UNICODE_BLOCK_NAMES_ZH_HANT[block.id]
      : locale.value.startsWith('zh')
        ? UNICODE_BLOCK_NAMES_ZH_HANS[block.id]
        : undefined
  const name = localized ? `${localized} · ${block.name}` : block.name
  return `${name}  U+${formatCodePoint(block.start)}–U+${formatCodePoint(block.end)}`
}
const unicodeBlockOptions = computed<CustomSelectOption[]>(() => [
  { value: 'all', label: $t('glyph_manager.library.unicode_block_all') },
  ...availableBlocks.value.map((block) => ({
    value: block.id,
    label: blockLabel(block),
    searchText: `${block.name} ${formatCodePoint(block.start)} ${formatCodePoint(block.end)}`,
  })),
])
const updateSourceFilter = (value: string | number): void => {
  emit('update:sourceFilter', value as GlyphSourceFilter)
}
const updateUnicodePlane = (value: string | number): void => {
  emit('update:unicodePlane', value as GlyphUnicodePlaneFilter)
  emit('update:unicodeBlock', 'all')
}
const updateUnicodeBlock = (value: string | number): void => {
  emit('update:unicodeBlock', value as GlyphUnicodeBlockFilter)
}

const closeExportMenu = (): void => {
  if (exportMenu.value) exportMenu.value.open = false
}
const exportHex = (): void => {
  emit('export')
  closeExportMenu()
}
const exportBackup = (): void => {
  emit('backup')
  closeExportMenu()
}
const exportFont = (
  format: 'otf' | 'ttf' | 'woff' | 'woff2' | 'bdf' | 'psf',
): void => {
  emit('font', format)
  closeExportMenu()
}
const exportSheet = (): void => {
  emit('sheet', { columns: sheetColumns.value, scale: sheetScale.value })
  closeExportMenu()
}
</script>

<style scoped>
.library-toolbar {
  position: sticky;
  inset-block-start: 0;
  z-index: 12;
  flex: none;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--background-light) 96%, transparent);
  backdrop-filter: blur(10px);
}

.library-toolbar__main {
  display: grid;
  grid-template-areas:
    'identity search actions'
    'filters filters filters';
  grid-template-columns: max-content minmax(12rem, 1fr) auto;
  align-items: end;
  gap: var(--space-2) var(--space-3);
  padding: 0.55rem max(0.75rem, env(safe-area-inset-right)) 0.55rem
    max(0.75rem, env(safe-area-inset-left));
}

.library-identity {
  grid-area: identity;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-3);
  white-space: nowrap;
}

.library-identity h2 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 750;
}

.library-count {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.library-search {
  grid-area: search;
  min-width: 0;
  height: var(--control-height);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  padding-inline: 0.7rem 0.3rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-secondary);
}

.library-search:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.library-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-color);
  font-family: var(--normal-font);
  font-size: 0.875rem;
}

.library-search input::-webkit-search-cancel-button {
  display: none;
}

.library-clear-search {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
}

.library-filters {
  grid-area: filters;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.library-filters label {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  white-space: nowrap;
}

.library-filters :deep(.custom-select) {
  min-width: 8rem;
  max-width: 13rem;
}

.library-filters :deep(.custom-select__trigger) {
  min-height: var(--control-height-compact);
  font-size: 0.75rem;
}

.unicode-range-filters {
  display: grid;
  grid-template-columns: minmax(8rem, 0.9fr) minmax(12rem, 1.4fr);
  align-items: center;
  gap: var(--space-2);
}

.unicode-range-filters label {
  min-width: 0;
}

.unicode-range-filters :deep(.custom-select) {
  width: 100%;
  max-width: none;
}

@media (min-width: 720px) {
  .library-toolbar__main {
    align-items: end;
  }

  .library-identity {
    align-self: center;
  }

  .library-filters {
    align-items: end;
  }

  .library-filters > label,
  .unicode-range-filters label {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.2rem;
  }
}

@media (min-width: 1600px) {
  .library-filters > label {
    width: 12rem;
  }

  .unicode-range-filters {
    grid-template-columns: 19rem 30rem;
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .library-filters > label {
    width: 11rem;
  }

  .unicode-range-filters {
    grid-template-columns: 12rem 18rem;
  }
}

@media (min-width: 960px) and (max-width: 1199px) {
  .library-filters > label {
    width: 9rem;
  }

  .unicode-range-filters {
    grid-template-columns: 11rem 15rem;
  }
}

.library-toolbar__buttons,
.library-tools {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.library-toolbar__buttons {
  grid-area: actions;
}

.library-filter-toggle,
.library-tools-toggle,
.library-selection-toggle {
  min-height: var(--control-height-compact);
  padding-inline: 0.55rem;
  font-size: 0.75rem;
}

.library-selection-toggle {
  border-color: color-mix(
    in srgb,
    var(--primary-color) 45%,
    var(--border-color)
  );
  background: color-mix(
    in srgb,
    var(--primary-color) 8%,
    var(--background-light)
  );
  color: var(--primary-darker);
  font-weight: 700;
}

.library-tools {
  min-height: 3rem;
  padding: 0.35rem max(0.75rem, env(safe-area-inset-right)) 0.35rem
    max(0.75rem, env(safe-area-inset-left));
  border-top: 1px solid var(--border-color);
  background: color-mix(
    in srgb,
    var(--background-color) 45%,
    var(--background-light)
  );
}

.library-action,
.library-collapse {
  min-height: var(--control-height-compact);
  height: var(--control-height-compact);
  font-size: 0.78rem;
}

.library-action {
  padding-inline: 0.65rem;
}

.library-action.is-active {
  border-color: color-mix(
    in srgb,
    var(--primary-color) 55%,
    var(--border-color)
  );
  background: color-mix(
    in srgb,
    var(--primary-color) 11%,
    var(--background-light)
  );
  color: var(--primary-darker);
  box-shadow: inset 0 -2px var(--primary-color);
}

.library-export-menu {
  position: relative;
}

.library-export-menu summary {
  list-style: none;
}

.library-export-menu summary::-webkit-details-marker {
  display: none;
}

.library-export-options {
  position: absolute;
  inset-block-start: calc(100% + 0.35rem);
  inset-inline-end: 0;
  width: min(18.5rem, calc(100vw - 1.5rem));
  max-height: calc(100dvh - 5rem);
  display: grid;
  gap: 1px;
  padding: 0.35rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  box-shadow: 0 8px 24px var(--shadow-color);
}

.library-export-options button,
.library-export-options label {
  min-height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-inline: 0.6rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-color);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: start;
}

.library-export-options__group {
  margin: 0;
  padding: 0.5rem 0.6rem 0.15rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.library-export-options__group--data {
  margin-block-start: 0.2rem;
  border-block-start: 1px solid var(--border-color);
}

.library-export-options button:hover,
.library-export-options button:focus-visible {
  background: var(--background-hover);
}

.library-export-options :deep(.custom-select) {
  width: 5rem;
}

.library-export-options :deep(.custom-select__trigger) {
  min-height: 1.875rem;
  font-size: 0.75rem;
}

.library-export-options label:last-child :deep(.custom-select__menu) {
  inset-block-start: auto;
  inset-block-end: calc(100% + 0.3rem);
  z-index: 60;
}

/* Keep nested select options above the export panel instead of clipping them. */
.library-export-options:has(:deep(.custom-select.is-open)) {
  overflow: visible;
}

.density-control {
  height: var(--control-height-compact);
  display: inline-flex;
  align-items: stretch;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
}

.density-control label {
  position: relative;
  display: inline-flex;
  align-items: stretch;
}

.density-control input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.density-control span {
  min-width: 3.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: 0.45rem;
  border-inline-start: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.72rem;
  cursor: pointer;
}

.density-control label:first-of-type span {
  border-inline-start: 0;
}

.density-control input:checked + span {
  background: var(--primary-color);
  color: white;
  font-weight: 700;
}

.density-control input:focus-visible + span {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.library-selection-bar {
  min-height: 3rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.35rem max(0.75rem, env(safe-area-inset-right)) 0.35rem
    max(0.75rem, env(safe-area-inset-left));
  border-top: 1px solid var(--border-color);
  background: color-mix(
    in srgb,
    var(--primary-color) 5%,
    var(--background-light)
  );
  font-size: 0.8125rem;
}

.library-selection-spacer {
  flex: 1;
}

.library-selection-bar .ui-button {
  min-height: var(--control-height-compact);
  padding: 0.45rem 0.65rem;
  font-size: 0.78rem;
}

@media (max-width: 719px) {
  .library-toolbar__main {
    grid-template-areas:
      'identity actions'
      'search search'
      'filters filters';
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    padding: max(0.75rem, env(safe-area-inset-top))
      max(0.75rem, env(safe-area-inset-right)) 0.75rem
      max(0.75rem, env(safe-area-inset-left));
  }

  .library-identity {
    min-width: 0;
    gap: var(--space-2);
  }

  .library-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .library-filters label {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .library-filters :deep(.custom-select) {
    width: 100%;
    max-width: none;
  }

  .unicode-range-filters {
    grid-column: 1 / -1;
  }

  .library-tools {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .library-toolbar__buttons {
    gap: 0.2rem;
  }

  .library-filter-toggle,
  .library-tools-toggle {
    width: 2.25rem;
    min-width: 2.25rem;
    padding: 0;
  }

  .library-filter-toggle span,
  .library-tools-toggle span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .library-selection-toggle {
    padding-inline: 0.45rem;
  }

  .library-action span {
    white-space: nowrap;
  }

  .library-selection-bar {
    flex-wrap: wrap;
    padding-block: 0.45rem;
  }

  .library-selection-spacer {
    display: none;
  }

  .library-selection-bar .library-selection-add {
    order: -1;
    width: 100%;
  }
}

@media (max-width: 420px) {
  .library-identity {
    padding-inline-end: 2.5rem;
  }

  .library-identity h2 {
    font-size: 0.95rem;
  }

  .library-count {
    font-size: 0.72rem;
  }

  .density-control {
    flex: none;
  }

  .density-control span {
    min-width: 2.65rem;
    padding-inline: 0.3rem;
    font-size: 0.66rem;
  }
}
</style>
