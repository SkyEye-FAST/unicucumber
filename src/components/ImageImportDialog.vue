<template>
  <Teleport to="body">
    <div v-if="file" class="image-import-overlay">
      <section
        ref="dialogRef"
        class="image-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-import-title"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <header>
          <h2 id="image-import-title">{{ $t('image_import.title') }}</h2>
          <button
            type="button"
            :aria-label="$t('image_import.cancel')"
            @click="emit('cancel')"
          >
            <i-material-symbols-close />
          </button>
        </header>
        <div class="image-import-content">
          <div class="import-controls">
            <label>
              {{ $t('image_import.target_width') }}
              <CustomSelect
                v-model="options.targetWidth"
                :ariaLabel="$t('image_import.target_width')"
                :options="targetWidthOptions"
              />
            </label>
            <label>
              {{ $t('image_import.mode') }}
              <CustomSelect
                v-model="options.mode"
                :ariaLabel="$t('image_import.mode')"
                :options="modeOptions"
              />
            </label>
            <label class="threshold-control">
              {{ $t('image_import.threshold') }}: {{ options.threshold }}
              <input
                v-model.number="options.threshold"
                type="range"
                min="0"
                max="255"
              />
            </label>
            <label class="checkbox-control">
              <input v-model="options.invert" type="checkbox" />
              {{ $t('image_import.invert') }}
            </label>
            <label class="checkbox-control">
              <input v-model="options.transparentAsWhite" type="checkbox" />
              {{ $t('image_import.transparent_white') }}
            </label>
          </div>
          <div class="preview-area">
            <div
              v-if="preparedGrid"
              class="pixel-preview"
              :style="{
                gridTemplateColumns: `repeat(${options.targetWidth}, 1fr)`,
              }"
              :aria-label="$t('image_import.preview')"
            >
              <template v-for="(row, rowIndex) in preparedGrid" :key="rowIndex">
                <span
                  v-for="(cell, colIndex) in row"
                  :key="`${rowIndex}-${colIndex}`"
                  :class="{ filled: cell === 1 }"
                ></span>
              </template>
            </div>
            <p v-else>{{ $t('image_import.loading') }}</p>
            <p v-if="errorMessage" class="import-error" role="alert">
              {{ errorMessage }}
            </p>
          </div>
        </div>
        <footer>
          <button type="button" @click="emit('cancel')">
            {{ $t('image_import.cancel') }}
          </button>
          <button
            class="confirm"
            type="button"
            :disabled="!preparedGrid"
            @click="confirm"
          >
            {{ $t('image_import.confirm') }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import type { GridData, GlyphWidth } from '@/types/glyph'
import { prepareImageGrid } from '@/utils/imageImport'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'

const props = defineProps<{ file: File | null }>()
const emit = defineEmits<{
  confirm: [grid: GridData]
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const imageData = ref<ImageData | null>(null)
const errorMessage = ref('')
const { t: $t } = useI18n()
const options = reactive({
  targetWidth: 16 as GlyphWidth,
  mode: 'fit' as 'fit' | 'crop',
  threshold: 128,
  invert: false,
  transparentAsWhite: true,
})
const targetWidthOptions: CustomSelectOption[] = [
  { value: 8, label: '8×16' },
  { value: 16, label: '16×16' },
]
const modeOptions = computed<CustomSelectOption[]>(() => [
  { value: 'fit', label: $t('image_import.fit') },
  { value: 'crop', label: $t('image_import.crop') },
])
let registered = false
let previouslyFocused: HTMLElement | null = null

const preparedGrid = computed(() =>
  imageData.value ? prepareImageGrid(imageData.value, options) : null,
)

const loadFile = async (file: File): Promise<void> => {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Unable to prepare the selected image.')
    context.drawImage(image, 0, 0)
    imageData.value = context.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

watch(
  () => props.file,
  (file) => {
    imageData.value = null
    errorMessage.value = ''
    if (file) {
      if (!registered) {
        registered = true
        previouslyFocused = document.activeElement as HTMLElement | null
        acquireOverlayLock()
      }
      void loadFile(file).catch((error: unknown) => {
        console.error('Unable to prepare image import.', error)
        errorMessage.value = $t('image_import.load_failed')
      })
      void nextTick(() => {
        ;(
          dialogRef.value?.querySelector<HTMLElement>('input, button') ??
          dialogRef.value
        )?.focus()
      })
    } else if (registered) {
      registered = false
      releaseOverlayLock()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (registered) releaseOverlayLock()
  previouslyFocused?.focus()
})

const confirm = (): void => {
  if (preparedGrid.value) emit('confirm', preparedGrid.value)
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.image-import-overlay {
  position: fixed;
  z-index: 1300;
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(0.75rem, env(safe-area-inset-top))
    max(0.75rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom))
    max(0.75rem, env(safe-area-inset-left));
  background: var(--modal-overlay);
}

.image-import-dialog {
  width: min(42rem, 100%);
  max-height: calc(100dvh - 1.5rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--dialog-background);
  color: var(--text-color);
}

.image-import-dialog header,
.image-import-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem;
}

.image-import-dialog header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.image-import-dialog button,
.image-import-dialog input {
  min-height: 44px;
}

.image-import-dialog button {
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-light);
  color: var(--text-color);
}

.image-import-content {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) minmax(12rem, 1fr);
  gap: 1rem;
  padding: 0.75rem;
  overflow: auto;
}

.import-controls {
  display: grid;
  gap: 0.5rem;
}

.import-controls label {
  display: grid;
  gap: 0.25rem;
}

.checkbox-control {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.preview-area {
  display: grid;
  place-items: center;
}

.import-error {
  color: var(--danger-color);
}

.pixel-preview {
  width: min(100%, 18rem);
  aspect-ratio: 1;
  display: grid;
  border: 1px solid var(--primary-darker);
  image-rendering: pixelated;
}

.pixel-preview span {
  background: white;
  box-shadow: inset 0 0 0 0.3px var(--primary-darker);
}

.pixel-preview span.filled {
  background: black;
}

.image-import-dialog footer {
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
}

.image-import-dialog footer .confirm {
  background: var(--primary-color);
  color: white;
}

@media (max-width: 560px) {
  .image-import-content {
    grid-template-columns: 1fr;
  }

  .pixel-preview {
    width: min(70vw, 15rem);
  }
}
</style>
