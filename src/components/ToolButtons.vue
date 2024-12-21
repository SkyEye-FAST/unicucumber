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
  margin: 30px 0 15px 0;
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
  color: #fff;
}

.tool-button:hover {
  border: #0c4461 2px solid;
}
</style>
