<template>
  <div class="glyph-manager">
    <h2 class="title">{{ $t('glyph_manager.title') }}</h2>

    <SearchToolbar
      v-model:search-query="searchQuery"
      :glyphs="props.glyphs"
      @export="exportToHex"
    />

    <GlyphAdder
      v-model="newGlyph"
      :prefill-data="props.prefillData"
      :unifont-map="unifontMap"
      :edit-mode="editMode"
      :duplicate-glyph="duplicateGlyph"
      @add="handleAdd"
      @update="updateExistingGlyph"
      @import="importFromUnifont"
      @clear="handleClear"
    />

    <UploadSection
      @hex-upload="handleHexFileUpload"
      @image-upload="handleImageFileUpload"
    />

    <GlyphList
      :glyphs="filteredGlyphs"
      :settings="settings"
      @edit="editGlyph"
      @remove="removeGlyph"
      @edit-in-grid="handleEditInGrid"
      @batch-delete="handleBatchDelete"
    />

    <DialogBox
      :show="dialog.show"
      :title="dialog.title"
      :message="dialog.message"
      :type="dialog.type"
      :items="dialog.items || []"
      :show-cancel="dialog.showCancel"
      :confirm-text="dialog.confirmText"
      :cancel-text="dialog.cancelText"
      :danger="dialog.danger"
      :hex-value="dialog.hexValue || ''"
      :width="dialog.width || 400"
      :display-mode="dialog.displayMode || ''"
      :custom-buttons="dialog.customButtons"
      :show-progress="dialog.showProgress || false"
      :progress-current="dialog.progressCurrent || 0"
      :progress-total="dialog.progressTotal || 0"
      @confirm="handleDialogConfirm"
      @cancel="handleDialogCancel"
      @custom-action="handleDialogCustomAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { useSettings } from '@/composables/useSettings'
import type {
  DialogConfig,
  Glyph,
  GlyphData,
  GlyphManagerEmits,
  GlyphManagerProps,
  ImageWithDimensions,
  UnifontMapType,
} from '@/types/glyph'

import DialogBox from './DialogBox.vue'
import GlyphAdder from './GlyphManager/GlyphAdder.vue'
import GlyphList from './GlyphManager/GlyphList.vue'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'
import UploadSection from './GlyphManager/UploadSection.vue'

const { t: $t } = useI18n()

const props = defineProps<GlyphManagerProps>()

const emit = defineEmits<GlyphManagerEmits>()

const newGlyph = ref<GlyphData>({ codePoint: '', hexValue: '' })
const searchQuery = ref<string>('')
const editMode = ref<boolean>(false)
const duplicateGlyph = ref<Glyph | null>(null)
const unifontMap = ref<UnifontMapType>({})

const { settings } = useSettings()

const STORAGE_KEY = 'unicucumber_glyphs'

const normalizeCodePoint = (input: string): string => {
  let normalized = input.trim().toUpperCase()

  if (normalized.startsWith('U+')) {
    normalized = normalized.substring(2)
  } else if (normalized.startsWith('U') && normalized.length > 1) {
    const nextChar = normalized.charAt(1)
    if (/^[0-9A-F]/.test(nextChar)) {
      normalized = normalized.substring(1)
    }
  }

  normalized = normalized.replace(/^0+/, '') || '0'

  return normalized
}

const normalizeCodePointForStorage = (input: string): string => {
  const normalized = normalizeCodePoint(input)
  if (normalized.length < 4) {
    return normalized.padStart(4, '0')
  }
  return normalized
}

const normalizeCodePointForExport = (codePoint: string): string => {
  if (codePoint.length < 4) {
    return codePoint.padStart(4, '0')
  } else if (codePoint.length === 5) {
    return '0' + codePoint
  }
  return codePoint
}

const loadStoredGlyphs = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsedGlyphs = JSON.parse(stored) as Glyph[]
      props.onGlyphChange(parsedGlyphs)
    }
  } catch (error) {
    console.error($t('glyph_manager.error.loading_storage'), error)
  }
}

const saveGlyphsToStorage = (glyphs: Glyph[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(glyphs))
  } catch (error) {
    console.error($t('glyph_manager.error.saving_storage'), error)
  }
}

const isValidInput = computed(() => {
  const normalizedCodePoint = normalizeCodePoint(newGlyph.value.codePoint)
  const isValidCodePoint = /^[0-9A-Fa-f]{1,6}$/.test(normalizedCodePoint)
  const hasValidHex =
    (props.prefillData && props.prefillData.hexValue) ||
    /^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue)
  return isValidCodePoint && hasValidHex
})

const addGlyph = (): void => {
  if (!isValidInput.value) return

  const hexValue = props.prefillData
    ? props.prefillData.hexValue.toUpperCase()
    : newGlyph.value.hexValue.toUpperCase()
  const codePoint = normalizeCodePointForStorage(newGlyph.value.codePoint)
  const updatedGlyphs = [
    ...props.glyphs,
    {
      codePoint,
      hexValue,
    },
  ]

  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
  clearForm(false)

  if (manualInputQueue.value.length > 0) {
    nextTick(() => {
      processNextManualInputGlyph()
    })
  }
}

const findExistingGlyph = (codePoint: string): Glyph | undefined => {
  const normalizedInput = normalizeCodePoint(codePoint)
  return props.glyphs.find(
    (g) => normalizeCodePoint(g.codePoint) === normalizedInput,
  )
}

const handleAdd = (): void => {
  if (!isValidInput.value) return

  const existing = findExistingGlyph(newGlyph.value.codePoint)
  if (existing && !editMode.value) {
    duplicateGlyph.value = existing
    return
  }

  addGlyph()

  if (manualInputQueue.value.length > 0) {
    nextTick(() => {
      processNextManualInputGlyph()
    })
  }
}

const updateExistingGlyph = (): void => {
  const hexValue = props.prefillData
    ? props.prefillData.hexValue.toUpperCase()
    : newGlyph.value.hexValue.toUpperCase()
  const codePoint = normalizeCodePointForStorage(newGlyph.value.codePoint)
  const updatedGlyphs = props.glyphs.map((g) =>
    normalizeCodePoint(g.codePoint) ===
    normalizeCodePoint(newGlyph.value.codePoint)
      ? { ...g, codePoint, hexValue }
      : g,
  )

  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
  clearForm(false)

  if (manualInputQueue.value.length > 0) {
    nextTick(() => {
      processNextManualInputGlyph()
    })
  }
}

const clearForm = (shouldClearQueue: boolean = true): void => {
  newGlyph.value = { codePoint: '', hexValue: '' }
  duplicateGlyph.value = null
  editMode.value = false

  emit('clear-prefill')

  if (shouldClearQueue) {
    manualInputQueue.value = []
    manualInputOriginalTotal.value = 0
  }
}

const handleClear = (): void => {
  const shouldClearQueue = manualInputQueue.value.length === 0
  clearForm(shouldClearQueue)

  if (!shouldClearQueue && manualInputQueue.value.length > 0) {
    nextTick(() => {
      processNextManualInputGlyph()
    })
  }
}

watch(
  () => props.prefillData,
  (newData) => {
    if (newData) {
      nextTick(() => {
        const codePointInput = document.querySelector(
          '.add-glyph input',
        ) as HTMLInputElement | null
        if (codePointInput) {
          codePointInput.focus()
        }
      })
    }
  },
  { immediate: true },
)

const filteredGlyphs = computed<Glyph[]>(() => {
  const query = searchQuery.value.toLowerCase()
  return props.glyphs
    .filter(
      (glyph) =>
        glyph.codePoint.toLowerCase().includes(query) ||
        glyph.hexValue.toLowerCase().includes(query),
    )
    .sort((a, b) => {
      const codePointA = parseInt(a.codePoint, 16)
      const codePointB = parseInt(b.codePoint, 16)
      return codePointA - codePointB
    })
})

const removeGlyph = (codePoint: string): void => {
  const updatedGlyphs = props.glyphs.filter(
    (glyph) => glyph.codePoint !== codePoint,
  )
  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
}

const editGlyph = (glyph: Glyph): void => {
  newGlyph.value = { ...glyph }
  editMode.value = true
}

const handleEditInGrid = (glyph: Glyph): void => {
  emit('edit-in-grid', glyph.hexValue, glyph)
}

const exportToHex = (): void => {
  const hexContent = [...props.glyphs]
    .sort((a, b) => {
      const codePointA = parseInt(a.codePoint, 16)
      const codePointB = parseInt(b.codePoint, 16)
      return codePointA - codePointB
    })
    .map((glyph) => {
      const codePoint = normalizeCodePointForExport(glyph.codePoint)
      return `${codePoint}:${glyph.hexValue}`
    })
    .join('\n')

  const blob = new Blob([hexContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
  const filename = `glyphs_unicucumber_${timestamp}.hex`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const loadUnifontData = async (): Promise<void> => {
  try {
    const response = await fetch('/unifont-map.json')
    const data = await response.json()
    unifontMap.value = data.glyphs
  } catch (error) {
    console.error($t('glyph_manager.error.loading_unifont'), error)
  }
}

const importFromUnifont = (): void => {
  if (!newGlyph.value.codePoint) return

  const normalizedCodePoint = normalizeCodePoint(newGlyph.value.codePoint)
  const codePoint = parseInt(normalizedCodePoint, 16)
  const hexValue = unifontMap.value[codePoint]

  if (hexValue) {
    if (props.prefillData) {
      emit('edit-in-grid', hexValue)
    } else {
      newGlyph.value.hexValue = hexValue
    }
  }
}

const handleHexFileUpload = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const text = await file.text()
  const lines = text.split('\n')
  const newGlyphs: Glyph[] = []
  const conflicts: Glyph[] = []

  for (const line of lines) {
    if (line && line.includes(':')) {
      const parts = line.split(':')
      if (parts[0]) {
        const codePoint = normalizeCodePointForStorage(parts[0])
        const hexValue = parts[1]?.trim().toUpperCase() || ''
        const existing = findExistingGlyph(parts[0])

        if (existing) {
          conflicts.push({ codePoint, hexValue })
        } else {
          newGlyphs.push({ codePoint, hexValue })
        }
      }
    }
  }

  if (conflicts.length > 0) {
    dialog.value = {
      show: true,
      title: $t('dialog.hex_import.title'),
      message: $t('dialog.hex_import.message'),
      type: 'list',
      items: conflicts,
      confirmText: $t('dialog.hex_import.confirm'),
      cancelText: $t('dialog.hex_import.cancel'),
      onConfirm: (selectedItems?: Glyph[]) => {
        if (!selectedItems) return

        const updatedGlyphs = props.glyphs.map((g) => {
          const selected = selectedItems.find(
            (s) => s.codePoint === g.codePoint,
          )
          return selected ? selected : g
        })

        const finalGlyphs = [...updatedGlyphs, ...newGlyphs]
        props.onGlyphChange(finalGlyphs)
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false
      },
      onCancel: () => {
        const finalGlyphs = [...props.glyphs, ...newGlyphs]
        props.onGlyphChange(finalGlyphs)
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false
      },
    }
  } else if (newGlyphs.length > 0) {
    const updatedGlyphs = [...props.glyphs, ...newGlyphs]
    props.onGlyphChange(updatedGlyphs)
    saveGlyphsToStorage(updatedGlyphs)
  }

  target.value = ''
}

const validateImageDimensions = (img: ImageWithDimensions): boolean => {
  if (
    (img.width === 16 && img.height === 16) ||
    (img.width === 8 && img.height === 16)
  ) {
    return true
  }

  dialog.value = {
    show: true,
    title: $t('dialog.dimension_error.title'),
    message: $t('dialog.dimension_error.message'),
    type: 'alert',
    showCancel: false,
    confirmText: $t('dialog.confirm'),
    cancelText: $t('dialog.cancel'),
    danger: false,
    items: [],
    onConfirm: () => {
      dialog.value.show = false
    },
  }
  return false
}

const validateMonochrome = (imageData: ImageData): boolean => {
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i] || 0
    const g = imageData.data[i + 1] || 0
    const b = imageData.data[i + 2] || 0
    const a = imageData.data[i + 3] || 0

    if (
      a > 0 &&
      !(
        (r === 0 && g === 0 && b === 0) ||
        (r === 255 && g === 255 && b === 255)
      )
    ) {
      dialog.value = {
        show: true,
        title: $t('dialog.format_error.title'),
        message: $t('dialog.format_error.message'),
        type: 'alert',
        showCancel: false,
        confirmText: $t('dialog.confirm'),
        cancelText: $t('dialog.cancel'),
        danger: false,
        items: [],
        onConfirm: () => {
          dialog.value.show = false
        },
      }
      return false
    }
  }
  return true
}

const processImageFile = async (
  file: File,
): Promise<{ glyph: Glyph | null; error: string | null }> => {
  const nameMatch = file.name?.match(/^([^.]+)/) || ['']
  const fileName = nameMatch[0]
  const normalizedCodePoint = normalizeCodePoint(fileName)
  let useCodePoint = ''

  if (/^[0-9A-F]{1,6}$/.test(normalizedCodePoint)) {
    useCodePoint = normalizeCodePointForStorage(fileName)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  try {
    const img = (await loadImage(file)) as ImageWithDimensions

    if (!validateImageDimensions(img)) {
      return { glyph: null, error: $t('dialog.dimension_error.message') }
    }

    canvas.width = img.width
    canvas.height = img.height

    if (ctx) {
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (!validateMonochrome(imageData)) {
        return { glyph: null, error: $t('dialog.format_error.message') }
      }

      let hex = ''
      const width = canvas.width

      for (let y = 0; y < 16; y++) {
        let rowBinary = ''
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const r = imageData.data[i] || 0
          const a = imageData.data[i + 3] || 0
          const isBlack = r === 0 && a > 127
          rowBinary += isBlack ? '1' : '0'
        }

        for (let i = 0; i < rowBinary.length; i += 4) {
          const chunk = rowBinary.slice(i, i + 4).padEnd(4, '0')
          hex += parseInt(chunk, 2).toString(16).toUpperCase()
        }
      }

      if (useCodePoint) {
        return {
          glyph: {
            codePoint: useCodePoint,
            hexValue: hex.toUpperCase(),
          },
          error: null,
        }
      } else {
        return {
          glyph: {
            codePoint: '',
            hexValue: hex.toUpperCase(),
          },
          error: null,
        }
      }
    }
  } catch (error) {
    console.error('Error loading image:', error)
    return { glyph: null, error: $t('dialog.image_error.message') }
  }

  return { glyph: null, error: 'Unknown error' }
}

const handleImageFileUpload = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const results: Array<{
    glyph: Glyph | null
    error: string | null
    fileName: string
  }> = []
  const validGlyphs: Glyph[] = []
  const conflicts: Glyph[] = []
  const manualInputGlyphs: Glyph[] = []
  const errors: Array<{ fileName: string; error: string }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue

    const result = await processImageFile(file)
    results.push({ ...result, fileName: file.name })

    if (result.error) {
      errors.push({ fileName: file.name, error: result.error })
    } else if (result.glyph) {
      if (result.glyph.codePoint === '') {
        manualInputGlyphs.push(result.glyph)
      } else {
        const existing = findExistingGlyph(result.glyph.codePoint)
        if (existing) {
          conflicts.push(result.glyph)
        } else {
          validGlyphs.push(result.glyph)
        }
      }
    }
  }

  if (errors.length > 0) {
    const errorMessage = errors
      .map((e) => `${e.fileName}: ${e.error}`)
      .join('\n')
    dialog.value = {
      show: true,
      title: $t('dialog.image_error.title'),
      message: errorMessage,
      type: 'alert',
      showCancel: false,
      confirmText: $t('dialog.confirm'),
      cancelText: $t('dialog.cancel'),
      danger: false,
      items: [],
      onConfirm: () => {
        dialog.value.show = false
      },
    }
  }

  if (conflicts.length > 0) {
    dialog.value = {
      show: true,
      title: $t('dialog.hex_import.title'),
      message: $t('dialog.hex_import.message'),
      type: 'list',
      items: conflicts,
      confirmText: $t('dialog.hex_import.confirm'),
      cancelText: $t('dialog.hex_import.cancel'),
      onConfirm: (selectedItems?: Glyph[]) => {
        if (!selectedItems) return

        const updatedGlyphs = props.glyphs.map((g) => {
          const selected = selectedItems.find(
            (s) => s.codePoint === g.codePoint,
          )
          return selected ? selected : g
        })

        const finalGlyphs = [...updatedGlyphs, ...validGlyphs]
        props.onGlyphChange(finalGlyphs)
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false

        handleManualInputGlyphs(manualInputGlyphs)
      },
      onCancel: () => {
        const finalGlyphs = [...props.glyphs, ...validGlyphs]
        props.onGlyphChange(finalGlyphs)
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false

        handleManualInputGlyphs(manualInputGlyphs)
      },
    }
  } else if (validGlyphs.length > 0) {
    const updatedGlyphs = [...props.glyphs, ...validGlyphs]
    props.onGlyphChange(updatedGlyphs)
    saveGlyphsToStorage(updatedGlyphs)

    handleManualInputGlyphs(manualInputGlyphs)
  } else {
    handleManualInputGlyphs(manualInputGlyphs)
  }

  target.value = ''
}

const manualInputQueue = ref<Glyph[]>([])
const manualInputOriginalTotal = ref<number>(0)

const handleManualInputGlyphs = (manualInputGlyphs: Glyph[]): void => {
  if (manualInputGlyphs.length > 0) {
    manualInputQueue.value = [...manualInputGlyphs]
    manualInputOriginalTotal.value = manualInputGlyphs.length

    if (manualInputGlyphs.length === 1) {
      const firstGlyph = manualInputGlyphs[0]
      if (firstGlyph) {
        newGlyph.value.hexValue = firstGlyph.hexValue

        manualInputQueue.value.shift()

        nextTick(() => {
          const codePointInput = document.querySelector(
            '.add-glyph input',
          ) as HTMLInputElement
          if (codePointInput) {
            codePointInput.focus()
          }
        })
      }
    } else {
      processNextManualInputGlyph()
    }
  }
}

const processNextManualInputGlyph = (): void => {
  if (manualInputQueue.value.length === 0) {
    return
  }

  const currentGlyph = manualInputQueue.value[0]
  const remaining = manualInputQueue.value.length
  const current = manualInputOriginalTotal.value - remaining + 1

  dialog.value = {
    show: true,
    title: $t('glyph_manager.manual_input.title'),
    message: $t('glyph_manager.manual_input.message'),
    type: 'alert',
    showCancel: false,
    danger: false,
    items: [],
    hexValue: currentGlyph?.hexValue || '',
    displayMode: 'glyph-input',
    showProgress: true,
    progressCurrent: current,
    progressTotal: manualInputOriginalTotal.value,
    customButtons: [
      {
        text: $t('glyph_manager.manual_input.process'),
        action: 'process',
        class: 'btn-primary',
      },
      {
        text: $t('glyph_manager.manual_input.skip_one'),
        action: 'skipOne',
        class: 'btn-secondary',
      },
      {
        text: $t('glyph_manager.manual_input.skip_all'),
        action: 'skipAll',
        class: 'btn-secondary',
      },
    ],
    onConfirm: () => {},
    onCancel: () => {
      dialog.value.show = false
      manualInputQueue.value = []
      manualInputOriginalTotal.value = 0
    },
  }
}

const handleDialogConfirm = (selectedItems?: Glyph[]): void => {
  if (dialog.value.onConfirm) {
    dialog.value.onConfirm(selectedItems)
  }
}

const handleDialogCancel = (): void => {
  if (dialog.value.onCancel) {
    dialog.value.onCancel()
  }
}

const handleDialogCustomAction = (action: string): void => {
  dialog.value.show = false

  if (action === 'process') {
    const currentGlyph = manualInputQueue.value[0]
    if (currentGlyph) {
      newGlyph.value.hexValue = currentGlyph.hexValue
      manualInputQueue.value.shift()

      nextTick(() => {
        const codePointInput = document.querySelector(
          '.add-glyph input',
        ) as HTMLInputElement
        if (codePointInput) {
          codePointInput.focus()
        }
      })
    }
  } else if (action === 'skipOne') {
    manualInputQueue.value.shift()
    if (manualInputQueue.value.length > 0) {
      nextTick(() => {
        processNextManualInputGlyph()
      })
    }
  } else if (action === 'skipAll') {
    manualInputQueue.value = []
    manualInputOriginalTotal.value = 0
  }
}

const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const dialog = ref<DialogConfig>({
  show: false,
  title: '',
  message: '',
  type: 'alert',
  items: [],
  showCancel: true,
  confirmText: $t('dialog.confirm'),
  cancelText: $t('dialog.cancel'),
  danger: false,
  hexValue: '',
  width: 400,
  showProgress: false,
  progressCurrent: 0,
  progressTotal: 0,
  onConfirm: () => {},
  onCancel: () => {},
})

const handleBatchDelete = (codePoints: string[]): void => {
  dialog.value = {
    show: true,
    title: $t('dialog.batch_delete.title'),
    message: $t('dialog.batch_delete.message', { count: codePoints.length }),
    type: 'confirm',
    danger: true,
    confirmText: $t('dialog.batch_delete.confirm'),
    cancelText: $t('dialog.cancel'),
    showCancel: true,
    items: [],
    onConfirm: () => {
      const updatedGlyphs = props.glyphs.filter(
        (glyph) => !codePoints.includes(glyph.codePoint),
      )
      props.onGlyphChange(updatedGlyphs)
      saveGlyphsToStorage(updatedGlyphs)
      dialog.value.show = false
    },
    onCancel: () => {
      dialog.value.show = false
    },
  }
}

onMounted(() => {
  loadStoredGlyphs()
  loadUnifontData()
})
</script>

<style scoped>
.glyph-manager {
  font-family: var(--normal-font);
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: bold;
}

.material-symbols-outlined {
  font-size: 20px;
}

@media (orientation: portrait) and (min-width: 768px) {
  .glyph-manager {
    padding: 24px;
    gap: 24px;
  }

  .title {
    font-size: 2.5rem;
  }
}
</style>
