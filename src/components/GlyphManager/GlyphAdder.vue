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
      <div class="tw:flex tw:gap-[8px]">
        <button class="btn-warn" @click="$emit('update')">
          {{ $t('glyph_manager.duplicate.update') }}
        </button>
        <button class="btn-cancel" @click="$emit('clear')">
          {{ $t('glyph_manager.duplicate.cancel') }}
        </button>
      </div>
    </div>

    <template v-else>
      <div class="input-group tw:flex tw:flex-col tw:gap-2">
        <div class="tw:flex tw:w-full tw:min-w-0 tw:items-center tw:gap-2">
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
        <div v-else class="hex-preview tw:truncate">
          {{ prefillData.hexValue }}
        </div>
      </div>

      <div v-if="shouldShowPreview" class="glyph-preview-section">
        <div class="preview-label">{{ $t('glyph_manager.add.preview') }}:</div>
        <div class="preview-container tw:flex tw:justify-center">
          <PixelPreview
            :hex-value="getHexValue"
            :width="getGlyphWidth"
            display-mode="editor"
          />
        </div>
      </div>

      <div class="button-group tw:mt-[12px] tw:flex tw:flex-wrap tw:gap-[8px]">
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
          class="btn-import tw:flex tw:items-center tw:gap-2"
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

import { normalizeCodePointHex } from '@/utils/charUtils'
import { getGlyphWidthFromHex, normalizeHex } from '@/utils/hexUtils'

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
  const normalizedHexCodePoint = normalizeCodePointHex(hexDigits)
  if (normalizedHexCodePoint !== null) {
    character = String.fromCodePoint(
      Number.parseInt(normalizedHexCodePoint, 16),
    )
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
  const isValidCodePoint = normalizeCodePointHex(hexDigits) !== null
  const hasValidHex =
    (props.prefillData && props.prefillData.hexValue) ||
    normalizeHex(props.modelValue.hexValue) !== null
  return isValidCodePoint && hasValidHex
})

const getAddButtonTitle = computed(() => {
  if (!props.modelValue.codePoint)
    return $t('glyph_manager.validation.enter_code_point')
  const hexDigits = extractHexDigits(props.modelValue.codePoint)
  if (normalizeCodePointHex(hexDigits) === null)
    return $t('glyph_manager.validation.invalid_code_point')
  if (!props.prefillData && normalizeHex(props.modelValue.hexValue) === null) {
    return $t('glyph_manager.validation.invalid_hex')
  }
  return $t('glyph_manager.validation.add_glyph')
})

const shouldShowPreview = computed(() => {
  const hexValue = getHexValue.value
  return hexValue && normalizeHex(hexValue) !== null
})

const getHexValue = computed(() => {
  return props.prefillData?.hexValue || props.modelValue.hexValue
})

const getGlyphWidth = computed(() => {
  const hexValue = getHexValue.value
  return hexValue ? (getGlyphWidthFromHex(hexValue) ?? 16) : 16
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

.hex-preview {
  background: var(--background-hover);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
  font-family: var(--monospace-font);
}

/* Shared button structure, followed by action-specific colors and states. */
.btn-add,
.btn-import,
.btn-clear,
.btn-warn,
.btn-cancel {
  font-family: var(--normal-font);
  cursor: pointer;
  font-weight: 600;
}

.btn-add,
.btn-import,
.btn-clear {
  min-height: var(--control-height);
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-sm);
}

.btn-add,
.btn-clear {
  color: white;
  border: none;
  font-size: 0.9em;
}

.btn-add {
  background: var(--primary-color);
}

.btn-add:disabled,
.btn-import:disabled {
  background: var(--border-color);
}

.btn-import {
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
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
  background: var(--danger-color);
}

.btn-clear:hover {
  background: var(--danger-hover);
}

.btn-warn,
.btn-cancel {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-warn {
  background: var(--warning-color);
  color: black;
}

.btn-warn:hover {
  background: var(--warning-hover);
}

.btn-cancel {
  background: var(--grey-color);
  color: white;
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
  padding: 8px;
  background: var(--glyph-preview-background);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

@media (max-width: 420px) {
  .add-glyph {
    padding: 0.75rem;
  }

  .input-group {
    gap: 0.4rem;
  }

  .button-group {
    gap: var(--space-2);
    margin-top: 0.65rem;
  }

  .button-group > button {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
