<template>
  <div class="hex-code-container">
    <input v-model="localHexCode" @input="updateHex" id="hexInput" class="hex-input" maxlength="64"
      placeholder="Enter .hex format string (32 or 64 characters)" />
    <button @click="copyHex" class="copy-button">
      <span class="material-symbols-outlined">{{ copyIcon }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  hexCode: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:hexCode', 'update:grid', 'copy']);

const localHexCode = ref(props.hexCode);
const copyIcon = ref('content_copy');

watch(() => props.hexCode, (newValue) => {
  localHexCode.value = newValue;
});

const updateHex = () => {
  emit('update:hexCode', localHexCode.value);
  emit('update:grid');
};

const copyHex = async () => {
  await navigator.clipboard.writeText(localHexCode.value);
  copyIcon.value = 'check';
  setTimeout(() => {
    copyIcon.value = 'content_copy';
  }, 1500);
  emit('copy');
};
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
  font-family: "Fira Code", monospace;
  font-size: 1em;
  border: 2px solid #000;
}

.copy-button {
  margin-left: 5px;
  padding: 6px 15px;
  font-family: "Fira Code", monospace;
  font-size: 0.9em;
  background-color: var(--primary-color);
  color: #fff;
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
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .hex-code-container {
    width: 35em;
  }

  .hex-input {
    padding: 10px 0;
    font-size: 1.5em;
  }

  .copy-button {
    padding: 10px 20px;
    font-size: 1.5em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .hex-code-container {
    width: 50em;
  }

  .hex-input {
    padding: 10px 0;
    font-size: 2.2em;
  }

  .copy-button {
    padding: 10px 35px;
    font-size: 2.2em;
  }
}
</style>
