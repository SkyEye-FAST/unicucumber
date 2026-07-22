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
    <details class="export-menu">
      <summary class="btn-export" :aria-disabled="!glyphs.length">
        <i-material-symbols-file-download class="icon" />
        {{ $t('glyph_manager.export') }}
      </summary>
      <div class="export-options">
        <button
          type="button"
          :disabled="!glyphs.length"
          @click="$emit('export')"
        >
          {{ $t('glyph_manager.export_hex') }}
        </button>
        <button
          type="button"
          :disabled="!glyphs.length"
          @click="$emit('backup')"
        >
          {{ $t('glyph_manager.export_backup') }}
        </button>
        <button
          type="button"
          :disabled="!glyphs.length"
          @click="$emit('sheet', { columns: sheetColumns, scale: sheetScale })"
        >
          {{ $t('glyph_manager.export_sheet') }}
        </button>
        <label>
          {{ $t('glyph_manager.sheet_columns') }}
          <select v-model.number="sheetColumns">
            <option :value="8">8</option>
            <option :value="16">16</option>
            <option :value="32">32</option>
          </select>
        </label>
        <label>
          {{ $t('glyph_manager.sheet_scale') }}
          <select v-model.number="sheetScale">
            <option :value="1">1×</option>
            <option :value="2">2×</option>
            <option :value="4">4×</option>
          </select>
        </label>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

defineProps({
  glyphs: {
    type: Array,
    required: true,
  },
  searchQuery: {
    type: String,
    default: '',
  },
})

defineEmits<{
  'update:searchQuery': [value: string]
  export: []
  backup: []
  sheet: [options: { columns: number; scale: number }]
}>()

const sheetColumns = ref(16)
const sheetScale = ref(2)
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

.export-options {
  position: absolute;
  z-index: 5;
  right: 0;
  top: calc(100% + 0.25rem);
  width: min(14rem, calc(100vw - 2rem));
  display: grid;
  padding: 0.35rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--dialog-background);
  box-shadow: 0 4px 12px var(--modal-shadow);
}

.export-options button {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--text-color);
  text-align: left;
}

.export-options label {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-inline: 0.35rem;
  color: var(--text-color);
}

.export-options select {
  min-height: 36px;
}

.export-options button:hover,
.export-options button:focus-visible {
  background: var(--background-hover);
}

@media (max-width: 480px) {
  .toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
  }

  .btn-export {
    padding-inline: 0.65rem;
    font-size: 0.82rem;
  }

  .export-options {
    inset-inline-start: auto;
    inset-inline-end: 0;
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
