<template>
  <div class="add-glyph">
    <div v-if="duplicateGlyph" class="duplicate-warning">
      <p>
        {{
          $t('glyph_manager.duplicate.warning', {
            codePoint: modelValue.codePoint,
          })
        }}
      </p>
      <div class="warning-actions">
        <button class="btn-warn" @click="$emit('update')">
          {{ $t('glyph_manager.duplicate.update') }}
        </button>
        <button class="btn-cancel" @click="$emit('clear')">
          {{ $t('glyph_manager.duplicate.cancel') }}
        </button>
      </div>
    </div>

    <template v-else>
      <div class="input-group">
        <input
          :value="modelValue.codePoint"
          :placeholder="$t('glyph_manager.add.code_point')"
          class="input"
          @input="updateCodePoint"
        />
        <input
          v-if="!prefillData"
          :value="modelValue.hexValue"
          :placeholder="$t('glyph_manager.add.hex_value')"
          class="input"
          @input="updateHexValue"
        />
        <div v-else class="hex-preview">{{ prefillData.hexValue }}</div>
      </div>

      <div v-if="shouldShowPreview" class="glyph-preview-section">
        <div class="preview-label">{{ $t('glyph_manager.add.preview') }}:</div>
        <div class="preview-container">
          <PixelPreview
            :hex-value="getHexValue"
            :width="getGlyphWidth"
            display-mode="editor"
          />
        </div>
      </div>

      <div class="button-group">
        <button
          class="btn-add"
          :disabled="!isValidInput"
          :title="getAddButtonTitle"
          @click="$emit('add')"
        >
          {{
            editMode
              ? $t('glyph_manager.add.update_button')
              : $t('glyph_manager.add.add_button')
          }}
        </button>
        <button
          class="btn-import"
          :disabled="!modelValue.codePoint"
          @click="$emit('import')"
        >
          <span class="material-symbols-outlined">sync</span>
          {{ $t('glyph_manager.import') }}
        </button>
        <button
          v-if="!editMode && (modelValue.hexValue || prefillData)"
          class="btn-clear"
          @click="$emit('clear')"
        >
          {{ $t('glyph_manager.add.clear_button') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PixelPreview from './PixelPreview.vue'

interface GlyphData {
  codePoint: string
  hexValue: string
}

const { t: $t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Object as () => GlyphData,
    required: true,
  },
  prefillData: {
    type: Object as () => GlyphData | null | undefined,
    default: undefined,
  },
  editMode: Boolean,
  duplicateGlyph: {
    type: Object as () => GlyphData | null | undefined,
    default: undefined,
  },
  unifontMap: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: GlyphData]
  add: []
  import: []
  clear: []
  update: []
}>()

const normalizeCodePoint = (input: string): string => {
  let normalized = input.trim().toUpperCase()

  if (normalized.startsWith('U+')) {
    normalized = normalized.substring(2)
  } else if (normalized.startsWith('U') && normalized.length > 1) {
    const nextChar = normalized.charAt(1)
    if (/^[0-9A-F]/.test(nextChar)) {
      normalized = normalized.substring(1)
    }
  }

  normalized = normalized.replace(/^0+/, '') || '0'

  return normalized
}

const updateCodePoint = (event: Event) => {
  const target = event.target as HTMLInputElement
  const normalizedCodePoint = normalizeCodePoint(target.value)
  emit('update:modelValue', {
    ...props.modelValue,
    codePoint: normalizedCodePoint,
  })
}

const updateHexValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', {
    ...props.modelValue,
    hexValue: target.value.toUpperCase(),
  })
}

const isValidInput = computed(() => {
  const normalizedCodePoint = normalizeCodePoint(props.modelValue.codePoint)
  const isValidCodePoint = /^[0-9A-Fa-f]{4,6}$/.test(normalizedCodePoint)
  const hasValidHex =
    (props.prefillData && props.prefillData.hexValue) ||
    /^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(props.modelValue.hexValue)
  return isValidCodePoint && hasValidHex
})

const getAddButtonTitle = computed(() => {
  if (!props.modelValue.codePoint)
    return $t('glyph_manager.validation.enter_code_point')
  const normalizedCodePoint = normalizeCodePoint(props.modelValue.codePoint)
  if (!/^[0-9A-Fa-f]{4,6}$/.test(normalizedCodePoint))
    return $t('glyph_manager.validation.invalid_code_point')
  if (
    !props.prefillData &&
    !/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(props.modelValue.hexValue)
  ) {
    return $t('glyph_manager.validation.invalid_hex')
  }
  return $t('glyph_manager.validation.add_glyph')
})

const shouldShowPreview = computed(() => {
  const hexValue = getHexValue.value
  return hexValue && /^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(hexValue)
})

const getHexValue = computed(() => {
  return props.prefillData?.hexValue || props.modelValue.hexValue
})

const getGlyphWidth = computed(() => {
  const hexValue = getHexValue.value
  return hexValue && hexValue.length <= 32 ? 8 : 16
})

watch(
  () => props.prefillData,
  (newData) => {
    if (newData) {
      emit('update:modelValue', {
        codePoint: newData.codePoint || '',
        hexValue: newData.hexValue,
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.add-glyph {
  border: 2px solid var(--primary-color);
  padding: 16px;
  border-radius: 8px;
  background: var(--background-light);
}

.add-glyph h3 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.input {
  font-family: var(--monospace-font);
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.input[readonly] {
  background-color: var(--background-hover);
  cursor: not-allowed;
}

.hex-preview {
  background: var(--background-hover);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
  font-family: var(--monospace-font);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-add {
  font-family: var(--normal-font);
  padding: 8px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-add:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-import {
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

.btn-import:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-import:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-clear {
  font-family: var(--normal-font);
  padding: 8px 20px;
  background: var(--danger-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-clear:hover {
  background: var(--danger-hover);
}

.btn-warn {
  font-family: var(--normal-font);
  padding: 8px 16px;
  background: var(--warning-color);
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-warn:hover {
  background: var(--warning-hover);
}

.btn-cancel {
  font-family: var(--normal-font);
  padding: 8px 16px;
  background: var(--grey-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: var(--grey-hover);
}

.duplicate-warning {
  background-color: var(--warning-background);
  border: 1px solid var(--warning-border);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.duplicate-warning p {
  color: var(--warning-text);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.warning-actions {
  display: flex;
  gap: 8px;
}

.glyph-preview-section {
  margin-top: 12px;
  padding: 12px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.preview-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 600;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

@media (orientation: portrait) and (min-width: 768px) {
  .add-glyph {
    padding: 24px;
  }

  .input {
    font-size: 1.5rem;
    padding: 12px;
  }

  .button-group {
    gap: 12px;
    margin-top: 16px;
  }

  .btn-add,
  .btn-import,
  .btn-clear {
    font-size: 1.5rem;
    padding: 12px 24px;
  }

  .hex-preview {
    padding: 12px 16px;
    font-size: 1.8rem;
  }
}
</style>
