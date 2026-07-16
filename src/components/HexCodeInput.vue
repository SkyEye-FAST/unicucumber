<template>
  <div class="hex-code-container">
    <label class="visually-hidden" for="hexInput">
      {{ $t('hex_input.label') }}
    </label>
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
          :aria-describedby="feedbackId"
          :aria-invalid="hasValidationError"
          :placeholder="$t('hex_input.placeholder')"
          @input="normalizeDraft"
          @keydown.enter.prevent="applyDraft"
          @keydown.escape.prevent="revertDraft"
          @paste="handlePaste"
        />
        <span v-if="glyphWidth" class="width-indicator">
          {{ $t('hex_input.width', { width: glyphWidth }) }}
        </span>
      </div>
      <button
        class="copy-button"
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
        class="apply-button"
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

import { useClipboard, useTimeoutFn } from '@vueuse/core'

import { getGlyphWidthFromHex, normalizeHex } from '@/utils/hexUtils'

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
  width: min(25em, calc(100% - 1rem));
  margin-top: 15px;
}

.hex-input-row {
  display: flex;
  align-items: stretch;
  gap: 5px;
}

.hex-input-wrapper {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
}

.hex-input {
  width: 100%;
  min-width: 0;
  padding: 8px 4.5rem 8px 8px;
  font-family: var(--monospace-font);
  font-size: 1em;
  background-color: var(--background-light);
  color: var(--text-color);
  border: 1px solid var(--border-color);
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
  position: absolute;
  inset-inline-end: 0.4rem;
  top: 50%;
  translate: 0 -50%;
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  background: var(--background-hover);
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.7rem;
  pointer-events: none;
}

.copy-button,
.apply-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 3px;
  font-family: var(--normal-font);
  font-weight: 600;
  cursor: pointer;
}

.copy-button,
.apply-button {
  background-color: var(--primary-color);
  color: white;
}

.copy-button:hover,
.apply-button:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.apply-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 420px) {
  .hex-code-container {
    margin-top: 10px;
  }

  .apply-button {
    padding-inline: 10px;
  }
}
</style>
