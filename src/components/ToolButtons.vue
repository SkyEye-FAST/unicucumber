<template>
  <div class="tool-buttons">
    <button @click="updateDrawValue(1)" :class="{ active: modelValue === 1 }" class="tool-button">
      <span class="material-symbols-outlined">draw</span>
    </button>
    <button @click="updateDrawValue(0)" :class="{ active: modelValue === 0 }" class="tool-button">
      <span class="material-symbols-outlined">ink_eraser</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const updateDrawValue = (value) => {
  emit('update:modelValue', value);
};
</script>

<style scoped>
.tool-buttons {
  display: flex;
  margin: 10px 0 15px 0;
}

.tool-button {
  font-size: 1.5em;
  padding: 5px 10px;
  border: transparent 2px solid;
  background-color: var(--border-color);
  cursor: pointer;
  width: 8em;
}

.tool-button.active {
  background: var(--primary-color);
  color: white;
}

.tool-button:hover {
  border: var(--primary-darker) 2px solid;
}

@media (orientation: portrait) and (max-width: 768px) {
  .tool-button {
    width: 7em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .tool-button {
    font-size: 2em;
    width: 8em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .tool-button {
    font-size: 3em;
    width: 8em;
  }
}
</style>
