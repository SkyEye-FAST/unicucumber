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
        <div class="char-codepoint-row">
          <input
            :value="modelValue.codePoint"
            :placeholder="$t('glyph_manager.add.code_point')"
            class="input codepoint-input"
            @input="updateCodePoint"
          />
          <input
            :value="modelValue.character || ''"
            :placeholder="$t('glyph_manager.add.character')"
            class="input character-input"
            maxlength="1"
            @input="updateCharacter"
          />
        </div>
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
          <i-material-symbols-sync-outline class="icon" />
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
  character?: string
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
})

const emit = defineEmits<{
  'update:modelValue': [value: GlyphData]
  add: []
  import: []
  clear: []
  update: []
}>()

const normalizeCodePoint = (input: string): string => {
  return input.trim().toUpperCase()
}

const extractHexDigits = (codePoint: string): string => {
  let extracted = codePoint.trim().toUpperCase()

  if (extracted.startsWith('U+')) {
    extracted = extracted.substring(2)
  } else if (extracted.startsWith('U') && extracted.length > 1) {
    const nextChar = extracted.charAt(1)
    if (/^[0-9A-F]/.test(nextChar)) {
      extracted = extracted.substring(1)
    }
  }

  extracted = extracted.replace(/^0+/, '') || '0'

  return extracted
}

const updateCodePoint = (event: Event) => {
  const target = event.target as HTMLInputElement
  const normalizedCodePoint = normalizeCodePoint(target.value)

  let character = ''
  const hexDigits = extractHexDigits(normalizedCodePoint)
  if (hexDigits && /^[0-9A-Fa-f]{1,6}$/.test(hexDigits)) {
    try {
      const cp = parseInt(hexDigits, 16)
      if (cp >= 0 && cp <= 0x10ffff) {
        character = String.fromCodePoint(cp)
      }
    } catch {}
  }

  emit('update:modelValue', {
    ...props.modelValue,
    codePoint: normalizedCodePoint,
    character,
  })
}

const updateHexValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', {
    ...props.modelValue,
    hexValue: target.value.toUpperCase(),
  })
}

const updateCharacter = (event: Event) => {
  const target = event.target as HTMLInputElement
  const character = target.value
  let codePoint = ''

  if (character) {
    const cp = character.codePointAt(0)
    if (cp !== undefined) {
      codePoint = cp.toString(16).toUpperCase().padStart(4, '0')
    }
  }

  emit('update:modelValue', {
    ...props.modelValue,
    character,
    codePoint,
  })
}

const isValidInput = computed(() => {
  const hexDigits = extractHexDigits(props.modelValue.codePoint)
  const isValidCodePoint = /^[0-9A-Fa-f]{1,6}$/.test(hexDigits)
  const hasValidHex =
    (props.prefillData && props.prefillData.hexValue) ||
    /^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(props.modelValue.hexValue)
  return isValidCodePoint && hasValidHex
})

const getAddButtonTitle = computed(() => {
  if (!props.modelValue.codePoint)
    return $t('glyph_manager.validation.enter_code_point')
  const hexDigits = extractHexDigits(props.modelValue.codePoint)
  if (!/^[0-9A-Fa-f]{1,6}$/.test(hexDigits))
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
  padding: var(--space-4);
  border: 1px solid
    color-mix(in srgb, var(--primary-color) 70%, var(--border-color));
  border-radius: var(--radius-md);
  background: color-mix(
    in srgb,
    var(--background-light) 96%,
    var(--primary-color)
  );
}

.add-glyph h3 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.input {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--control-height);
  font-family: var(--monospace-font);
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
  font-size: 0.9rem;
}

.input:focus {
  border-color: var(--primary-color);
  outline: 0;
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.character-input {
  font-family: var(--normal-font);
  background: var(--background-color);
  flex: 0 0 34%;
  min-width: 0;
}

.codepoint-input {
  flex: 1;
  min-width: 0;
}

.char-codepoint-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-width: 0;
  width: 100%;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.btn-add {
  min-height: var(--control-height);
  font-family: var(--normal-font);
  padding: 0.55rem 0.85rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-add:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-import {
  min-height: var(--control-height);
  font-family: var(--normal-font);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.55rem 0.85rem;
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
}

.btn-import:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-import:hover:not(:disabled) {
  border-color: var(--primary-color);
  background: color-mix(
    in srgb,
    var(--primary-color) 10%,
    var(--background-light)
  );
}

.btn-clear {
  min-height: var(--control-height);
  font-family: var(--normal-font);
  padding: 0.55rem 0.85rem;
  background: var(--danger-color);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
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

@media (max-width: 420px) {
  .button-group > button {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
