<template>
  <section class="export-panel" :aria-label="$t('export.title')">
    <details>
      <summary>
        <span class="section-heading">{{ $t('export.options') }}</span>
      </summary>
      <div class="export-options">
        <label>
          {{ $t('export.scale') }}
          <CustomSelect
            v-model="scale"
            :ariaLabel="$t('export.scale')"
            :options="scaleOptions"
          />
        </label>
        <label class="checkbox-option">
          <input v-model="transparent" type="checkbox" />
          {{ $t('export.transparent') }}
        </label>
        <output class="filename-preview">
          {{ $t('export.filename') }}: {{ filename('png') }}
        </output>
      </div>
    </details>

    <div class="download-buttons">
      <button
        v-for="format in downloadFormats"
        :key="format"
        class="download-button ui-button ui-button--primary"
        type="button"
        @click="downloadFile(format)"
      >
        <i-material-symbols-download class="icon" />
        <span>{{ format }}</span>
      </button>
    </div>

    <div class="export-actions">
      <button class="ui-button" type="button" @click="copyHex">
        <i-material-symbols-content-copy-outline class="icon" />
        {{ $t('export.copy_hex') }}
      </button>
      <button
        v-if="canCopyImage"
        class="ui-button"
        type="button"
        @click="copyImage"
      >
        <i-material-symbols-imagesmode-outline class="icon" />
        {{ $t('export.copy_image') }}
      </button>
      <button
        v-if="canShare"
        class="ui-button"
        type="button"
        @click="shareImage"
      >
        <i-material-symbols-share-outline class="icon" />
        {{ $t('export.share') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import { useNotifications } from '@/composables/useNotifications'
import type { GridData } from '@/types/glyph'
import {
  canvasToBlob,
  createCanvasFromGrid,
  createSVGFromGrid,
  encodeBmp,
} from '@/utils/exportUtils'
import { gridToHex } from '@/utils/hexUtils'

const props = defineProps<{
  gridData: GridData
  codepoint: string
}>()

const { t: $t } = useI18n()
const { notify } = useNotifications()
const downloadFormats = ['PNG', 'BMP', 'SVG', 'HEX'] as const
type DownloadFormat = (typeof downloadFormats)[number]
const scales = [1, 2, 4, 8, 16] as const
const scaleOptions: CustomSelectOption[] = scales.map((value) => ({
  value,
  label: `${value}×`,
}))
const scale = ref(8)
const transparent = ref(false)
const baseFilename = computed(() => props.codepoint || 'glyph')
const canShare =
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const canCopyImage =
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard?.write === 'function' &&
  typeof ClipboardItem !== 'undefined'

const filename = (extension: string): string =>
  `${baseFilename.value}.${extension.toLowerCase()}`

const createExportBlob = async (format: DownloadFormat): Promise<Blob> => {
  switch (format) {
    case 'PNG':
      return canvasToBlob(
        createCanvasFromGrid(props.gridData, {
          scale: scale.value,
          transparent: transparent.value,
        }),
      )
    case 'BMP':
      return encodeBmp(props.gridData, { scale: scale.value })
    case 'SVG':
      return new Blob(
        [
          createSVGFromGrid(props.gridData, {
            scale: scale.value,
            transparent: transparent.value,
          }),
        ],
        { type: 'image/svg+xml;charset=utf-8' },
      )
    case 'HEX':
      return new Blob([`${props.codepoint}:${gridToHex(props.gridData)}\n`], {
        type: 'text/plain;charset=utf-8',
      })
  }
}

const triggerDownload = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const downloadFile = async (format: DownloadFormat): Promise<void> => {
  try {
    const blob = await createExportBlob(format)
    const extension = format.toLowerCase()
    triggerDownload(blob, filename(extension))
    notify({
      tone: 'success',
      message: $t('export.download_ready', { format }),
    })
  } catch (error) {
    console.error(`Unable to export ${format}.`, error)
    notify({ tone: 'error', message: $t('export.failed', { format }) })
  }
}

const copyHex = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(gridToHex(props.gridData))
    notify({ tone: 'success', message: $t('export.hex_copied') })
  } catch (error) {
    console.error('Unable to copy hexadecimal glyph data.', error)
    notify({ tone: 'error', message: $t('export.copy_failed') })
  }
}

const createPngBlob = (): Promise<Blob> =>
  canvasToBlob(
    createCanvasFromGrid(props.gridData, {
      scale: scale.value,
      transparent: transparent.value,
    }),
  )

const copyImage = async (): Promise<void> => {
  try {
    const blob = await createPngBlob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    notify({ tone: 'success', message: $t('export.image_copied') })
  } catch (error) {
    console.error('Unable to copy the glyph image.', error)
    notify({ tone: 'error', message: $t('export.copy_failed') })
  }
}

const shareImage = async (): Promise<void> => {
  try {
    const blob = await createPngBlob()
    const file = new File([blob], filename('png'), { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: baseFilename.value })
      return
    }
    triggerDownload(blob, file.name)
    notify({ tone: 'info', message: $t('export.share_fallback') })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    console.error('Unable to share the glyph image.', error)
    notify({ tone: 'error', message: $t('export.share_failed') })
  }
}
</script>

<style scoped>
.export-panel {
  width: 100%;
  margin: 0.35rem 0 0;
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color);
}

.export-panel details {
  min-width: 0;
}

.export-panel summary {
  min-height: 2rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  cursor: pointer;
  color: var(--text-color);
}

.export-panel summary::marker {
  color: var(--text-secondary);
}

.export-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--background-hover);
}

.export-options label {
  min-height: var(--control-height-compact);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.export-options :deep(.custom-select) {
  width: 4.5rem;
}

.export-options :deep(.custom-select__trigger) {
  min-height: var(--control-height-compact);
}

.checkbox-option input {
  width: 1.2rem;
  height: 1.2rem;
}

.filename-preview {
  flex: 1 1 12rem;
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.download-buttons,
.export-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.download-button,
.export-actions button {
  min-width: 0;
  width: 100%;
}

.export-actions {
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
}

@media (max-width: 519px) {
  .download-buttons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .export-actions {
    grid-template-columns: 1fr;
  }
}
</style>
