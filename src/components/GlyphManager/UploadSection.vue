<template>
  <div class="upload-section">
    <div class="upload-buttons">
      <button @click="triggerFileUpload('hex')" class="btn-upload">
        <span class="material-symbols-outlined">upload_file</span>
        {{ $t('glyph_manager.upload.hex_file') }}
      </button>
      <button @click="triggerFileUpload('image')" class="btn-upload">
        <span class="material-symbols-outlined">image</span>
        {{ $t('glyph_manager.upload.image_file') }}
      </button>
    </div>
    <input
      type="file"
      ref="hexFileInput"
      @change="$emit('hex-upload', $event)"
      accept=".hex"
      style="display: none"
    />
    <input
      type="file"
      ref="imageFileInput"
      @change="$emit('image-upload', $event)"
      accept=".png,.jpg,.jpeg,.bmp"
      style="display: none"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const hexFileInput = ref(null)
const imageFileInput = ref(null)

const triggerFileUpload = (type) => {
  if (type === 'hex') {
    hexFileInput.value.click()
  } else {
    imageFileInput.value.click()
  }
}

defineEmits(['hex-upload', 'image-upload'])
</script>

<style scoped>
.upload-section {
  border-radius: 8px;
  background: var(--background-light);
}

.upload-buttons {
  display: flex;
  gap: 1em;
}

.btn-upload {
  font-family: var(--normal-font);
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-upload:hover {
  background: var(--primary-dark);
}

.material-symbols-outlined {
  font-size: 20px;
}

@media (orientation: portrait) and (min-width: 768px) {
  .btn-upload {
    font-size: 1.5rem;
    padding: 12px 24px;
  }
}
</style>
