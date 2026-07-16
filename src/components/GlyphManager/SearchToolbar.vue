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
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-input {
  font-family: var(--monospace-font);
  width: 90%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-export {
  font-family: var(--normal-font);
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
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
    gap: 0.5rem;
  }

  .search-input {
    box-sizing: border-box;
    width: 100%;
  }

  .btn-export {
    padding-inline: 0.65rem;
  }
}

.btn-export:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: var(--primary-dark);
}

@media (orientation: portrait) and (min-width: 768px) {
  .search-box {
    width: 65%;
  }

  .search-input {
    font-size: 1.4rem;
    padding: 16px;
  }

  .btn-export {
    font-size: 1.5rem;
    padding: 12px 24px;
  }
}
</style>
