<template>
  <div class="glyph-list">
    <div v-for="glyph in glyphs" :key="glyph.codePoint" class="glyph-card">
      <div
        class="glyph-preview"
        @click="$emit('edit-in-grid', glyph)"
        :title="
          $t('glyph_manager.glyph.edit_in_grid', { codePoint: glyph.codePoint })
        "
      >
        {{ String.fromCodePoint(parseInt(glyph.codePoint, 16)) }}
      </div>
      <div class="glyph-info">
        <div class="info-row">
          <span class="info-label">{{
            $t('glyph_manager.glyph.code_point')
          }}</span>
          <span class="info-value">U+{{ glyph.codePoint }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('glyph_manager.glyph.hex') }}</span>
          <span class="info-value">{{ glyph.hexValue }}</span>
        </div>
      </div>
      <div class="glyph-actions">
        <button
          @click="$emit('edit', glyph)"
          class="btn-icon"
          :title="$t('glyph_manager.glyph.edit')"
        >
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button
          @click="$emit('remove', glyph.codePoint)"
          class="btn-icon"
          :title="$t('glyph_manager.glyph.delete')"
        >
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
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
})

defineEmits(['edit', 'remove', 'edit-in-grid'])
</script>

<style scoped>
.glyph-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.glyph-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.glyph-preview {
  flex: 0 0 40px;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-light);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  transform-origin: center;
}

.glyph-preview:hover {
  background: var(--background-active);
  transform: scale(1.05);
}

.glyph-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-weight: 600;
}

.info-value {
  font-family: var(--monospace-font);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glyph-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--background-active);
  color: var(--text-color);
}

@media (orientation: portrait) and (min-width: 768px) {
  .glyph-card {
    padding: 16px;
    gap: 16px;
  }

  .glyph-preview {
    flex: 0 0 80px;
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
  }

  .glyph-info {
    font-size: 1.5rem;
  }

  .btn-icon {
    width: 44px;
    height: 44px;
  }

  .btn-icon .material-symbols-outlined {
    font-size: 36px !important;
  }
}
</style>
