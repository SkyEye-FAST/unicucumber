<template>
  <div class="hex-code-container">
    <div class="hex-field-header">
      <label class="hex-field-label" for="hexInput">
        {{ $t('hex_input.label') }}
      </label>
      <span v-if="glyphWidth" class="width-indicator">
        {{ $t('hex_input.width', { width: glyphWidth }) }}
      </span>
    </div>
    <div class="hex-input-row">
      <div class="hex-input-wrapper">
        <input
          id="hexInput"
          v-model="draft"
          class="hex-input"
          maxlength="64"
          inputmode="text"
          autocapitalize="characters"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          dir="ltr"
          :title="draft"
          :aria-describedby="feedbackId"
          :aria-invalid="hasValidationError"
          :placeholder="$t('hex_input.placeholder')"
          @input="normalizeDraft"
          @keydown.enter.prevent="applyDraft"
          @keydown.escape.prevent="revertDraft"
          @paste="handlePaste"
        />
      </div>
      <button
        class="copy-button ui-icon-button ui-button--primary"
        type="button"
        :title="$t('hex_input.copy')"
        :aria-label="$t('hex_input.copy')"
        @click="copyHex"
      >
        <i-material-symbols-check v-if="copyState === 'success'" class="icon" />
        <i-material-symbols-error-outline
          v-else-if="copyState === 'error'"
          class="icon"
        />
        <i-material-symbols-content-copy-outline v-else class="icon" />
      </button>
      <button
        class="apply-button ui-button ui-button--primary"
        type="button"
        :disabled="!normalizedDraft || !isChanged"
        @click="applyDraft"
      >
        {{ $t('hex_input.apply') }}
      </button>
    </div>
    <p
      :id="feedbackId"
      class="hex-feedback"
      :class="{ error: hasValidationError }"
      aria-live="polite"
    >
      <template v-if="hasValidationError">{{ validationMessage }}</template>
      <template v-else-if="isChanged">{{ $t('hex_input.ready') }}</template>
      <template v-else>{{ $t('hex_input.committed') }}</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { getGlyphWidthFromHex, normalizeHex } from '@/utils/hexUtils'
import { useClipboard, useTimeoutFn } from '@vueuse/core'

const props = defineProps<{ hexCode: string }>()
const emit = defineEmits<{
  apply: [hexCode: string]
  copy: [successful: boolean]
}>()

const { t: $t } = useI18n()

const feedbackId = 'hexInputFeedback'
const committed = ref(props.hexCode)
const draft = ref(props.hexCode)
const copyState = ref<'idle' | 'success' | 'error'>('idle')

const normalizedDraft = computed(() => normalizeHex(draft.value))
const glyphWidth = computed(() =>
  normalizedDraft.value ? getGlyphWidthFromHex(normalizedDraft.value) : null,
)
const isChanged = computed(() => draft.value !== committed.value)
const hasValidationError = computed(
  () => isChanged.value && normalizedDraft.value === null,
)
const validationMessage = computed(() => {
  if (/[^0-9A-F]/.test(draft.value)) return $t('hex_input.invalid_characters')
  return $t('hex_input.invalid_length')
})

watch(
  () => props.hexCode,
  (nextValue, previousValue) => {
    committed.value = nextValue
    if (draft.value === previousValue || normalizedDraft.value !== null) {
      draft.value = nextValue
    }
  },
)

const normalizeDraft = (): void => {
  draft.value = draft.value.toUpperCase().slice(0, 64)
}

const applyDraft = (): void => {
  const normalized = normalizedDraft.value
  if (normalized === null || normalized === committed.value) return
  committed.value = normalized
  draft.value = normalized
  emit('apply', normalized)
}

const revertDraft = (): void => {
  draft.value = committed.value
}

const handlePaste = async (): Promise<void> => {
  await nextTick()
  normalizeDraft()
}

const { copy } = useClipboard()
const { start: resetCopyState } = useTimeoutFn(() => {
  copyState.value = 'idle'
}, 1500)

const copyHex = async (): Promise<void> => {
  try {
    await copy(draft.value)
    copyState.value = 'success'
    emit('copy', true)
  } catch (error) {
    console.error('Unable to copy hexadecimal glyph data.', error)
    copyState.value = 'error'
    emit('copy', false)
  }
  resetCopyState()
}
</script>

<style scoped>
.hex-code-container {
  width: 100%;
  min-width: 0;
  margin: 0;
}

.hex-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: 0.35rem;
}

.hex-field-label {
  color: var(--text-color);
  font-size: 0.8rem;
  font-weight: 650;
}

.hex-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.hex-input-wrapper {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
}

.hex-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: var(--control-height);
  padding: 0.55rem 0.7rem;
  font-family: var(--monospace-font);
  font-size: 0.88rem;
  line-height: 1.2;
  white-space: nowrap;
  background-color: var(--input-background);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.hex-input:focus {
  border-color: var(--border-hover);
  outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
  outline-offset: 1px;
}

.hex-input[aria-invalid='true'] {
  border-color: var(--danger-color);
}

.width-indicator {
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.72rem;
  white-space: nowrap;
}

.copy-button,
.apply-button {
  flex: none;
}

.apply-button:disabled {
  background: var(--primary-color);
}

.hex-feedback {
  min-height: 1.2em;
  margin: 0.3rem 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.hex-feedback.error {
  color: var(--danger-color);
}

@media (max-width: 519px) {
  .hex-input-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
  }

  .hex-input-wrapper {
    grid-column: 1 / -1;
  }

  .copy-button {
    grid-column: 2;
  }

  .apply-button {
    grid-column: 3;
  }
}
</style>
