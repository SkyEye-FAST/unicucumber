<template>
  <section
    class="export-panel tw:box-border tw:grid tw:w-full tw:gap-2 tw:p-3"
    :aria-label="$t('export.title')"
  >
    <div
      class="tw:flex tw:min-w-0 tw:items-baseline tw:justify-between tw:gap-3"
    >
      <span class="section-heading">{{ $t('export.title') }}</span>
      <output
        class="filename-preview tw:min-w-0 tw:text-end tw:wrap-anywhere"
        :aria-label="$t('export.filename')"
      >
        {{ filename(selectedFormat.toLowerCase()) }}
      </output>
    </div>

    <div class="export-command tw:grid tw:min-w-0 tw:gap-2">
      <div
        class="format-picker tw:grid tw:min-w-0 tw:grid-cols-4 tw:p-[0.2rem]"
        role="radiogroup"
        :aria-label="$t('export.title')"
      >
        <button
          v-for="format in downloadFormats"
          :key="format"
          class="format-option"
          :class="{ selected: selectedFormat === format }"
          type="button"
          role="radio"
          :aria-checked="selectedFormat === format"
          @click="selectedFormat = format"
        >
          {{ format }}
        </button>
      </div>

      <button
        class="download-button ui-button ui-button--primary"
        type="button"
        @click="downloadFile(selectedFormat)"
      >
        <i-material-symbols-download class="icon" />
        <span>{{ $t('export.download', { format: selectedFormat }) }}</span>
      </button>
    </div>

    <div
      v-if="canCopyImage || canShare"
      class="utility-actions tw:grid tw:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] tw:gap-2"
    >
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

    <details class="export-settings tw:min-w-0">
      <summary class="settings-trigger tw:flex tw:items-center tw:gap-2">
        <i-material-symbols-tune class="icon" />
        <span>{{ $t('export.options') }}</span>
        <i-material-symbols-keyboard-arrow-down
          class="icon settings-chevron tw:ml-auto"
        />
      </summary>
      <div
        class="export-options tw:mt-2 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] tw:items-center tw:gap-2 tw:px-3 tw:py-2"
      >
        <label class="export-option">
          <span class="export-option__label">{{ $t('export.scale') }}</span>
          <CustomSelect
            v-model="scale"
            :ariaLabel="$t('export.scale')"
            :options="scaleOptions"
          />
        </label>
        <label class="checkbox-option">
          <span>{{ $t('export.transparent') }}</span>
          <input v-model="transparent" type="checkbox" />
        </label>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import { useNotifications } from '@/composables/useNotifications'
import type { ExportScale, GridData } from '@/types/glyph'
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
  exportScale: ExportScale
  exportTransparent: boolean
}>()
const emit = defineEmits<{
  'update:exportScale': [value: ExportScale]
  'update:exportTransparent': [value: boolean]
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
const scale = computed({
  get: () => props.exportScale,
  set: (value: string | number) =>
    emit('update:exportScale', Number(value) as ExportScale),
})
const transparent = computed({
  get: () => props.exportTransparent,
  set: (value: boolean) => emit('update:exportTransparent', value),
})
const baseFilename = computed(() => props.codepoint || 'glyph')
const canShare =
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const canCopyImage =
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard?.write === 'function' &&
  typeof ClipboardItem !== 'undefined'
const selectedFormat = ref<DownloadFormat>('PNG')

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
  margin: 0.35rem 0 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  background: var(--background-light);
}

.filename-preview {
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.78rem;
}

.format-picker {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--background-hover);
}

.format-option {
  min-width: 0;
  min-height: var(--control-height);
  padding: 0.4rem 0.25rem;
  border: 0;
  border-radius: calc(var(--radius-md) - 0.15rem);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.format-option:hover,
.format-option:focus-visible {
  background: var(--background-light);
  color: var(--text-color);
}

.format-option.selected {
  background: var(--primary-color);
  box-shadow: 0 1px 3px
    color-mix(in srgb, var(--primary-darker) 28%, transparent);
  color: white;
}

.download-button,
.utility-actions button {
  width: 100%;
  min-width: 0;
}

.export-settings {
  border-top: 1px solid var(--border-color);
}

.settings-trigger {
  min-height: var(--control-height-compact);
  padding: var(--space-2) 0 0;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.85rem;
  list-style: none;
}

.settings-trigger::-webkit-details-marker {
  display: none;
}

.settings-chevron {
  transition: transform 140ms ease;
}

.export-settings[open] .settings-chevron {
  transform: rotate(180deg);
}

.export-options {
  border-radius: var(--radius-sm);
  background: var(--background-hover);
}

.export-options label {
  min-width: 0;
  min-height: var(--control-height-compact);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.export-option__label {
  min-width: max-content;
}

.export-options :deep(.custom-select) {
  flex: 0 0 5.25rem;
  width: 5.25rem;
}

.export-options :deep(.custom-select__trigger) {
  min-height: var(--control-height-compact);
}

.checkbox-option input {
  flex: none;
  width: 1.2rem;
  height: 1.2rem;
}

@container (min-width: 40rem) {
  .export-command {
    grid-template-columns: minmax(0, 1fr) minmax(11rem, 0.55fr);
  }
}

@media (max-width: 519px) {
  .export-panel {
    margin-inline: calc(-1 * var(--space-2));
    width: calc(100% + (2 * var(--space-2)));
    padding-inline: var(--space-2);
  }

  .utility-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-chevron {
    transition: none;
  }
}
</style>
