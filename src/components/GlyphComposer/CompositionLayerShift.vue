<template>
  <div class="layer-shift tw:grid tw:gap-2">
    <label class="tw:grid tw:gap-1 tw:text-[0.8rem] tw:text-muted">
      <span>{{ $t('composition.shift_distance') }}</span>
      <input
        v-model.number="pixels"
        type="number"
        min="1"
        step="1"
        inputmode="numeric"
        :disabled="disabled"
        :aria-invalid="!validPixels"
      />
    </label>
    <div class="tw:flex tw:gap-1">
      <button
        class="ui-icon-button"
        type="button"
        :disabled="disabled || !validPixels"
        :aria-label="$t('composition.shift_left', { pixels })"
        @click="shift(-1, 0)"
      >
        <i-material-symbols-arrow-back aria-hidden="true" />
      </button>
      <button
        class="ui-icon-button"
        type="button"
        :disabled="disabled || !validPixels"
        :aria-label="$t('composition.shift_up', { pixels })"
        @click="shift(0, -1)"
      >
        <i-material-symbols-arrow-upward aria-hidden="true" />
      </button>
      <button
        class="ui-icon-button"
        type="button"
        :disabled="disabled || !validPixels"
        :aria-label="$t('composition.shift_down', { pixels })"
        @click="shift(0, 1)"
      >
        <i-material-symbols-arrow-downward aria-hidden="true" />
      </button>
      <button
        class="ui-icon-button"
        type="button"
        :disabled="disabled || !validPixels"
        :aria-label="$t('composition.shift_right', { pixels })"
        @click="shift(1, 0)"
      >
        <i-material-symbols-arrow-forward aria-hidden="true" />
      </button>
    </div>
    <span v-if="!validPixels" class="tw:text-[0.8rem]" role="status">
      {{ $t('composition.shift_invalid') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ move: [dx: number, dy: number] }>()
const { t: $t } = useI18n()
const pixels = ref<number | string>(1)
const validPixels = computed(
  () =>
    typeof pixels.value === 'number' &&
    Number.isSafeInteger(pixels.value) &&
    pixels.value > 0,
)
const shift = (dx: number, dy: number): void => {
  if (props.disabled || !validPixels.value) return
  emit('move', dx * Number(pixels.value), dy * Number(pixels.value))
}
</script>

<style scoped>
.layer-shift input {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--control-height);
}
.layer-shift button {
  min-width: 2.75rem;
  min-height: 2.75rem;
}
</style>
