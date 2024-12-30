<template>
  <div class="toolbar">
    <div class="search-box">
      <input
        :value="searchQuery"
        :placeholder="$t('glyph_manager.search')"
        class="search-input"
        @input="$emit('update:searchQuery', $event.target.value)"
      />
    </div>
    <button
      @click="$emit('export')"
      class="btn-export"
      :disabled="!glyphs.length"
    >
      <span class="material-symbols-outlined">file_download</span>
      {{ $t('glyph_manager.export') }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()

defineProps({
  glyphs: {
    type: Array,
    required: true,
  },
  searchQuery: String,
})

defineEmits(['update:searchQuery', 'export'])
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
