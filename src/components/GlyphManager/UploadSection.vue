<template>
  <div
    class="upload-section"
    @dragenter.prevent="dragActive = true"
    @dragover.prevent="dragActive = true"
    @dragleave.prevent="dragActive = false"
    @drop.prevent="handleDrop"
  >
    <div class="upload-buttons" :class="{ 'drag-active': dragActive }">
      <button class="btn-upload" type="button" @click="openHexDialog()">
        <i-material-symbols-upload-file-outline class="icon" />
        {{ $t('glyph_manager.upload.hex_file') }}
      </button>
      <button class="btn-upload" type="button" @click="openImageDialog()">
        <i-material-symbols-image-outline class="icon" />
        {{ $t('glyph_manager.upload.image_file') }}
      </button>
      <button
        v-if="canReadClipboard"
        class="btn-upload"
        type="button"
        @click="pasteImage"
      >
        <i-material-symbols-content-paste class="icon" />
        {{ $t('glyph_manager.upload.paste_image') }}
      </button>
    </div>
    <p class="drop-hint">{{ $t('glyph_manager.upload.drop_hint') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useFileDialog } from '@vueuse/core'

import { useNotifications } from '@/composables/useNotifications'

const emit = defineEmits(['hex-upload', 'image-upload'])
const { t: $t } = useI18n()
const { notify } = useNotifications()
const dragActive = ref(false)
const canReadClipboard =
  typeof navigator.clipboard?.read === 'function' &&
  typeof ClipboardItem !== 'undefined'

const { open: openHexDialog, onChange: onHexChange } = useFileDialog({
  accept: '.hex,text/plain',
})
const { open: openImageDialog, onChange: onImageChange } = useFileDialog({
  accept: 'image/*,.bmp',
  multiple: true,
})

const emitImageFiles = (files: File[]): void => {
  if (files.length > 0) emit('image-upload', { target: { files } })
}

onHexChange((files) => {
  const file = files?.[0]
  if (file) emit('hex-upload', { target: { files: [file] } })
})

onImageChange((files) => {
  if (files) emitImageFiles(Array.from(files))
})

const handleDrop = (event: DragEvent): void => {
  dragActive.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  const hexFile = files.find((file) => file.name.toLowerCase().endsWith('.hex'))
  if (hexFile) emit('hex-upload', { target: { files: [hexFile] } })
  emitImageFiles(files.filter((file) => file.type.startsWith('image/')))
}

const pasteImage = async (): Promise<void> => {
  try {
    const items = await navigator.clipboard.read()
    const files: File[] = []
    for (const item of items) {
      const type = item.types.find((candidate) =>
        candidate.startsWith('image/'),
      )
      if (!type) continue
      const blob = await item.getType(type)
      files.push(new File([blob], `clipboard-${Date.now()}.png`, { type }))
    }
    if (files.length === 0) {
      notify({
        tone: 'warning',
        message: $t('glyph_manager.upload.no_clipboard_image'),
      })
      return
    }
    emitImageFiles(files)
  } catch (error) {
    console.error('Unable to read an image from the clipboard.', error)
    notify({
      tone: 'error',
      message: $t('glyph_manager.upload.clipboard_failed'),
    })
  }
}
</script>

<style scoped>
.upload-section {
  border-radius: 8px;
  background: var(--background-light);
}

.upload-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.35rem;
  border: 1px dashed transparent;
  border-radius: 6px;
}

.upload-buttons.drag-active {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.btn-upload {
  min-width: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: var(--primary-color);
  color: white;
  font-family: var(--normal-font);
  font-weight: 600;
  cursor: pointer;
}

.btn-upload:hover {
  background: var(--primary-dark);
}

.drop-hint {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
  text-align: center;
}

@media (max-width: 420px) {
  .upload-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
