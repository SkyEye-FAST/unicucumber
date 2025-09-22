<template>
  <div class="glyph-list">
    <div class="select-all-row">
      <div class="selection-controls">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="isAllSelected"
            @change="toggleSelectAll"
          />
          {{ $t('glyph_manager.select_all') }}
        </label>
        <button
          v-if="selectedGlyphs.length > 0"
          class="btn-danger batch-delete"
          :title="$t('glyph_manager.batch_delete')"
          @click="handleBatchDelete"
        >
          <i-material-symbols-delete-outline class="icon" />
          {{
            $t('glyph_manager.delete_selected', {
              count: selectedGlyphs.length,
            })
          }}
        </button>
      </div>
    </div>
    <div v-for="glyph in glyphs" :key="glyph.codePoint" class="glyph-card">
      <label class="checkbox-label">
        <input
          v-model="selectedGlyphs"
          type="checkbox"
          :value="glyph"
          @change="emitSelectionChange"
        />
      </label>
      <div
        class="glyph-preview"
        :class="{ 'dual-preview': showPixelPreview && showBrowserPreview }"
        :title="
          $t('glyph_manager.glyph.edit_in_grid', { codePoint: glyph.codePoint })
        "
        @click="$emit('edit-in-grid', glyph)"
      >
        <template v-if="showPixelPreview">
          <PixelPreview
            :hex-value="glyph.hexValue"
            :width="glyph.hexValue.length === 32 ? 8 : 16"
            class="pixel-preview"
          />
        </template>
        <template v-if="showBrowserPreview">
          <div class="browser-preview" :style="browserPreviewStyle">
            {{ String.fromCodePoint(parseInt(glyph.codePoint, 16)) }}
          </div>
        </template>
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
          class="btn-icon"
          :title="$t('glyph_manager.glyph.edit')"
          @click="$emit('edit', glyph)"
        >
          <i-material-symbols-edit-outline class="icon" />
        </button>
        <button
          class="btn-icon danger"
          :title="$t('glyph_manager.glyph.delete')"
          @click="$emit('remove', glyph.codePoint)"
        >
          <i-material-symbols-delete-outline class="icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import PixelPreview from './PixelPreview.vue'

interface Glyph {
  codePoint: string
  hexValue: string
}

interface Settings {
  glyphPreviewMode: 'pixelOnly' | 'browserOnly' | 'both'
  browserPreviewFont: string
}

const { t: $t } = useI18n()

const props = defineProps<{
  glyphs: Glyph[]
  settings: Settings
}>()

const emit = defineEmits<{
  (event: 'edit', glyph: Glyph): void
  (event: 'remove', codePoint: string): void
  (event: 'edit-in-grid', glyph: Glyph): void
  (event: 'selection-change', selectedGlyphs: Glyph[]): void
  (event: 'batch-delete', codePoints: string[]): void
}>()

const showPixelPreview = computed(() => {
  return ['pixelOnly', 'both'].includes(props.settings.glyphPreviewMode)
})

const showBrowserPreview = computed(() => {
  return ['browserOnly', 'both'].includes(props.settings.glyphPreviewMode)
})

watch(
  () => props.settings.glyphPreviewMode,
  () => {
    nextTick()
  },
)

const selectedGlyphs = ref<Glyph[]>([])

const isAllSelected = computed(() => {
  return (
    props.glyphs.length > 0 &&
    selectedGlyphs.value.length === props.glyphs.length
  )
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedGlyphs.value = []
  } else {
    selectedGlyphs.value = [...props.glyphs]
  }
  emitSelectionChange()
}

const emitSelectionChange = () => {
  emit('selection-change', selectedGlyphs.value)
}

const handleBatchDelete = () => {
  emit(
    'batch-delete',
    selectedGlyphs.value.map((glyph) => glyph.codePoint),
  )
  selectedGlyphs.value = []
}

const browserPreviewStyle = computed(() => {
  return {
    fontFamily: props.settings.browserPreviewFont,
  }
})
</script>

<style scoped>
.glyph-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: var(--background-color);
}

.glyph-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--background-light);
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--modal-shadow);
  border: 1px solid var(--border-color);
}

.glyph-preview {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  padding: 4px;
  min-width: 40px;
  align-items: center;
  justify-content: center;
  background: var(--background-color);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  transform-origin: center;
  border: 1px solid var(--border-color);
}

.glyph-preview.dual-preview {
  width: 80px;
  min-width: auto;
}

.pixel-preview,
.browser-preview {
  position: static;
  transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: max-content;
}

.browser-preview {
  font-size: 32px;
}

.glyph-preview:hover {
  background: var(--background-hover);
  transform: scale(1.05);
  border-color: var(--border-hover);
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
  color: var(--text-color);
}

.glyph-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.btn-icon {
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
  color: var(--primary-color);
}

.btn-icon.danger:hover {
  color: var(--danger-color);
}

.select-all-row {
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
  cursor: pointer;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  background-color: var(--danger-color);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-danger:hover {
  background-color: var(--danger-hover);
}

.batch-delete .icon {
  font-size: 1.2rem;
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
    min-width: auto;
  }

  .glyph-preview.dual-preview {
    width: 160px;
  }

  .pixel-preview,
  .browser-preview {
    height: 64px;
  }

  .browser-preview {
    font-size: 48px;
  }

  .glyph-info {
    font-size: 1.5rem;
  }

  .btn-icon {
    width: 44px;
    height: 44px;
  }

  .btn-icon .icon {
    font-size: 36px !important;
  }

  .select-all-row {
    padding: 12px 16px;
  }

  .checkbox-label input[type='checkbox'] {
    width: 24px;
    height: 24px;
  }

  .btn-danger {
    padding: 8px 16px;
    font-size: 1.5rem;
  }

  .batch-delete .icon {
    font-size: 1.5rem;
  }

  .select-all-row .selection-controls {
    gap: 16px;
  }

  .checkbox-label {
    font-size: 1.5rem;
  }
}
</style>
