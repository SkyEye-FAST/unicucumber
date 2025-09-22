<template>
  <div class="hex-code-container">
    <input
      id="hexInput"
      v-model="localHexCode"
      class="hex-input"
      maxlength="64"
      :placeholder="$t('hex_input.placeholder')"
      @input="updateHex"
    />
    <button class="copy-button" :title="$t('hex_input.copy')" @click="copyHex">
      <span class="material-symbols-outlined">{{ copyIcon }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import { useClipboard, useTimeoutFn } from '@vueuse/core'

const props = defineProps({
  hexCode: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:hexCode', 'update:grid', 'copy'])

const localHexCode = ref(props.hexCode)
const copyIcon = ref('content_copy')

watch(
  () => props.hexCode,
  (newValue) => {
    localHexCode.value = newValue
  },
)

const updateHex = () => {
  emit('update:hexCode', localHexCode.value)
  emit('update:grid')
}

const { copy } = useClipboard()
const { start: resetIcon } = useTimeoutFn(() => {
  copyIcon.value = 'content_copy'
}, 1500)

const copyHex = async () => {
  await copy(localHexCode.value)
  copyIcon.value = 'check'
  resetIcon()
  emit('copy')
}
</script>

<style scoped>
.hex-code-container {
  width: 25em;
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.hex-input {
  width: 100%;
  padding: 8px;
  font-family: var(--monospace-font);
  font-size: 1em;
  background-color: var(--background-light);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.hex-input:focus {
  border-color: var(--border-hover);
}

.copy-button {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 5px;
  padding: 8px 15px;
  font-family: var(--monospace-font);
  font-size: 0.9em;
  background-color: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.copy-button:hover {
  background-color: var(--primary-dark);
}

@media (orientation: portrait) and (max-width: 768px) {
  .hex-code-container {
    width: 20em;
    margin-top: 10px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .hex-code-container {
    width: 32em;
  }

  .hex-input {
    padding: 10px 0;
    font-size: 1.5em;
  }

  .copy-button {
    padding: 10px 20px;
    font-size: 1.8em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .hex-code-container {
    width: 48em;
    margin: 1rem;
  }

  .hex-input {
    padding: 16px 0;
    font-size: 2.2em;
  }

  .copy-button {
    padding: 16px 35px;
    font-size: 2.5em;
  }
}
</style>
