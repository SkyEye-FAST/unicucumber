<template>
  <div class="glyph-list">
    <div v-for="glyph in glyphs" :key="glyph.codePoint" class="glyph-card">
      <div
        class="glyph-preview"
        :class="{ 'dual-preview': showPixelPreview && showBrowserPreview }"
        @click="$emit('edit-in-grid', glyph)"
        :title="
          $t('glyph_manager.glyph.edit_in_grid', { codePoint: glyph.codePoint })
        "
      >
        <template v-if="showPixelPreview">
          <PixelPreview
            :hex-value="glyph.hexValue"
            :width="glyph.hexValue.length === 32 ? 8 : 16"
            class="pixel-preview"
          />
        </template>
        <template v-if="showBrowserPreview">
          <div class="browser-preview">
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
import { computed, watch, nextTick } from 'vue'
import PixelPreview from './PixelPreview.vue'

const { t: $t } = useI18n()

const props = defineProps({
  glyphs: {
    type: Array,
    required: true,
  },
  settings: {
    type: Object,
    required: true,
  },
})

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

defineEmits(['edit', 'remove', 'edit-in-grid'])
</script>

<style scoped>
.glyph-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-family: v-bind('settings.browserFont');
  font-size: 24px;
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
  background-color: var(--background-hover);
  color: var(--primary-color);
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

  .btn-icon .material-symbols-outlined {
    font-size: 36px !important;
  }
}
</style>
