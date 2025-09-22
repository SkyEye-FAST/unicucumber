<template>
  <div class="upload-section">
    <div class="upload-buttons">
      <button class="btn-upload" @click="handleHexClick">
        <i-material-symbols-upload-file-outline class="icon" />
        {{ $t('glyph_manager.upload.hex_file') }}
      </button>
      <button class="btn-upload" @click="handleImageClick">
        <i-material-symbols-image-outline class="icon" />
        {{ $t('glyph_manager.upload.image_file') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'

const emit = defineEmits(['hex-upload', 'image-upload'])

const { open: openHexDialog, onChange: onHexChange } = useFileDialog({
  accept: '.hex',
})

const { open: openImageDialog, onChange: onImageChange } = useFileDialog({
  accept: '.png,.jpg,.jpeg,.bmp',
  multiple: true,
})

const handleHexClick = (event: MouseEvent) => {
  event.preventDefault()
  openHexDialog()
}

const handleImageClick = (event: MouseEvent) => {
  event.preventDefault()
  openImageDialog()
}

onHexChange((files) => {
  if (files) {
    emit('hex-upload', { target: { files } })
  }
})

onImageChange((files) => {
  if (files) {
    emit('image-upload', { target: { files } })
  }
})
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

.icon {
  font-size: 20px;
}

@media (orientation: portrait) and (min-width: 768px) {
  .btn-upload {
    font-size: 1.5rem;
    padding: 12px 24px;
  }
}
</style>
