<template>
  <div class="toolbar">
    <div class="search-box">
      <input
        :value="searchQuery"
        :placeholder="$t('glyph_manager.search')"
        class="search-input"
        @input="
          (e) =>
            $emit('update:searchQuery', (e.target as HTMLInputElement).value)
        "
      />
    </div>
    <details ref="exportDropdownRef" class="export-menu">
      <summary class="btn-export">
        <i-material-symbols-file-download class="icon" />
        {{ $t('glyph_manager.export') }}
      </summary>
      <div class="export-backdrop" @click="closeDropdown" />
      <div class="export-options">
        <FontExportOptions
          :busy="fontExportBusy"
          :metadata="fontMetadata"
          :scope="exportScope"
          @font="handleFontExport($event)"
          @reset-metadata="$emit('reset-font-metadata')"
          @update:metadata="$emit('update:fontMetadata', $event)"
          @update:scope="$emit('update:exportScope', $event)"
        />
        <p class="export-options__group export-options__group--data">
          {{ $t('glyph_manager.export_data_files') }}
        </p>
        <BatchExportOptions
          :busy="batchExportBusy"
          :saved-count="savedCount"
          :filtered-count="filteredCount"
          @export="handleBatchExport($event)"
        />
        <button type="button" class="export-item-btn" @click="handleBackup">
          <span class="export-item-btn__content">
            <i-material-symbols-download aria-hidden="true" />
            <span>{{ $t('glyph_manager.export_backup') }}</span>
          </span>
        </button>
        <div class="export-sheet-group">
          <button type="button" class="export-item-btn" @click="handleSheet">
            <span class="export-item-btn__content">
              <i-material-symbols-download aria-hidden="true" />
              <span>{{ $t('glyph_manager.export_sheet') }}</span>
            </span>
          </button>
          <div class="export-sheet-options">
            <label>
              <span>{{ $t('glyph_manager.sheet_columns') }}</span>
              <CustomSelect
                v-model="sheetColumns"
                :ariaLabel="$t('glyph_manager.sheet_columns')"
                :options="sheetColumnOptions"
              />
            </label>
            <label>
              <span>{{ $t('glyph_manager.sheet_scale') }}</span>
              <CustomSelect
                v-model="sheetScale"
                :ariaLabel="$t('glyph_manager.sheet_scale')"
                :options="sheetScaleOptions"
              />
            </label>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import type { FontExportMetadata, FontExportScope } from '@/utils/fontExport'

import FontExportOptions from './FontExportOptions.vue'
import BatchExportOptions from './BatchExportOptions.vue'
import type { BatchExportRequest } from '@/utils/batchExport'

const { t: $t } = useI18n()

defineProps<{
  batchExportBusy: boolean
  savedCount: number
  filteredCount: number
  exportScope: FontExportScope
  fontExportBusy: boolean
  fontMetadata: FontExportMetadata
  searchQuery?: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'batch-export': [request: BatchExportRequest]
  backup: []
  font: [format: 'otf' | 'ttf' | 'woff' | 'woff2' | 'bdf' | 'psf']
  'reset-font-metadata': []
  sheet: [options: { columns: number; scale: number }]
  'update:exportScope': [value: FontExportScope]
  'update:fontMetadata': [value: FontExportMetadata]
}>()

const exportDropdownRef = ref<HTMLDetailsElement | null>(null)
const closeDropdown = (): void => {
  if (exportDropdownRef.value) {
    exportDropdownRef.value.open = false
  }
}
const handleFontExport = (
  format: 'otf' | 'ttf' | 'woff' | 'woff2' | 'bdf' | 'psf',
): void => {
  emit('font', format)
  closeDropdown()
}
const handleBatchExport = (request: BatchExportRequest): void => {
  emit('batch-export', request)
}
const handleBackup = (): void => {
  emit('backup')
  closeDropdown()
}
const handleSheet = (): void => {
  emit('sheet', { columns: sheetColumns.value, scale: sheetScale.value })
  closeDropdown()
}

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
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
}

.search-box {
  min-width: 0;
}

.search-input {
  box-sizing: border-box;
  font-family: var(--monospace-font);
  width: 100%;
  min-height: var(--control-height);
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  background: var(--input-background);
  color: var(--text-color);
  font-size: 0.9rem;
}

.search-input:focus {
  border-color: var(--primary-color);
  outline: 0;
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.btn-export {
  box-sizing: border-box;
  font-family: var(--normal-font);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: var(--control-height);
  min-height: var(--control-height);
  padding: 0.55rem 0.85rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}

.export-menu {
  position: relative;
}

.export-menu summary {
  list-style: none;
  min-height: 44px;
}

.export-menu summary::-webkit-details-marker {
  display: none;
}

.export-backdrop {
  display: none;
}

.export-options {
  position: absolute;
  z-index: 5;
  inset-inline-start: auto;
  inset-inline-end: 0;
  top: calc(100% + 0.25rem);
  box-sizing: border-box;
  width: min(34rem, calc(100vw - 1.5rem), calc(100cqw - 2rem));
  max-height: calc(100dvh - 8rem);
  display: grid;
  padding: 0.35rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  box-shadow: 0 4px 12px var(--modal-shadow);
}

.export-options button {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 0;
  background: transparent;
  color: var(--text-color);
  font-size: 0.8125rem;
  line-height: 1.25;
  text-align: left;
}

.export-item-btn__content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.export-sheet-group {
  display: grid;
  gap: 0.2rem;
}

.export-sheet-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0.15rem 0.55rem 0.35rem;
}

.export-sheet-options label {
  min-height: 2rem;
  padding-inline: 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.export-options__group {
  margin: 0;
  padding: 0.55rem 0.55rem 0.2rem;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.export-options__group--data {
  margin-block-start: 0.2rem;
  border-block-start: 1px solid var(--border-color);
}

.export-options label {
  min-height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-inline: 0.35rem;
  color: var(--text-color);
  font-size: 0.8125rem;
  line-height: 1.25;
}

.export-options :deep(.custom-select) {
  width: 4.5rem;
}

.export-options :deep(.custom-select__trigger) {
  min-height: 2rem;
  font-size: 0.8125rem;
}

.export-options label:last-child :deep(.custom-select__menu) {
  inset-block-start: auto;
  inset-block-end: calc(100% + 0.3rem);
  z-index: 60;
}

/* A select list must be able to escape the scrollable export menu. */
.export-options:has(:deep(.custom-select.is-open)) {
  overflow: visible;
}

.export-options button:hover,
.export-options button:focus-visible {
  background: var(--background-hover);
}

@media (max-width: 719px) {
  .toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
  }

  .btn-export {
    padding-inline: 0.65rem;
    font-size: 0.82rem;
  }

  .export-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 18;
    background: color-mix(in srgb, var(--modal-overlay) 45%, transparent);
  }

  .export-options {
    position: fixed;
    inset-block-start: auto;
    inset-block-end: max(0.5rem, env(safe-area-inset-bottom));
    inset-inline: 0.5rem;
    z-index: 20;
    width: auto;
    max-width: none;
    max-height: min(80dvh, calc(100dvh - 3.5rem));
    border-radius: var(--radius-lg);
    box-shadow: 0 12px 32px var(--shadow-color);
  }
}

.btn-export:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: var(--primary-dark);
}
</style>
