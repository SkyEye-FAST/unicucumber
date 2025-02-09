<template>
  <div class="tool-buttons">
    <button
      @click="updateDrawValue(1)"
      :class="{ active: modelValue === 1 }"
      :disabled="disabled && modelValue !== 2"
      class="tool-button"
    >
      <span class="material-symbols-outlined">draw</span>
    </button>
    <button
      @click="updateDrawValue(0)"
      :class="{ active: modelValue === 0 }"
      :disabled="disabled && modelValue !== 2"
      class="tool-button"
    >
      <span class="material-symbols-outlined">ink_eraser</span>
    </button>
    <button
      @click="updateDrawValue(2)"
      :class="{ active: modelValue === 2 }"
      class="tool-button"
    >
      <span class="material-symbols-outlined">select</span>
    </button>
  </div>
</template>

<script setup>
const emit = defineEmits(['update:modelValue'])
const { disabled } = defineProps({
  modelValue: {
    type: Number,
    required: true,
  },
  copyMode: {
    type: Boolean,
    default: false,
  },
  moveMode: {
    type: Boolean,
    default: false,
  },
  selectedRegion: {
    type: Object,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const updateDrawValue = (value) => {
  if (value === 2 || !disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<style scoped>
.tool-buttons {
  display: flex;
  margin: 10px 0 15px 0;
  transition: none !important;
}

.tool-button {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5em;
  padding: 7px 10px;
  border: transparent 2px solid;
  background-color: var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  width: 6em;
  transition: none !important;
}

.tool-button.active {
  background: var(--primary-color);
  color: white;
}

.tool-button:hover:not(.active) {
  background-color: var(--background-hover);
  border-color: var(--border-hover);
}

.tool-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

@media (orientation: portrait) and (max-width: 768px) {
  .tool-buttons {
    margin: 0.5rem 0 0.8rem;
  }

  .tool-button {
    width: 5em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .tool-button {
    font-size: 2em;
    width: 6em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .tool-buttons {
    margin: 1.2rem;
  }

  .tool-button {
    padding: 16px 24px;
    font-size: 3em;
    width: 6em;
  }

  .tool-button .material-symbols-outlined {
    font-size: 1em !important;
  }
}
</style>
