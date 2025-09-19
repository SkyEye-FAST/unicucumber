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
      @clear="clearForm"
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
      :on-confirm="dialog.onConfirm"
      :on-cancel="dialog.onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '@/composables/useSettings'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'
import GlyphAdder from './GlyphManager/GlyphAdder.vue'
import UploadSection from './GlyphManager/UploadSection.vue'
import GlyphList from './GlyphManager/GlyphList.vue'
import DialogBox from './DialogBox.vue'
import type {
  Glyph,
  UnifontMapType,
  DialogConfig,
  GlyphManagerProps,
  GlyphManagerEmits,
  GlyphData,
  ImageWithDimensions,
} from '@/types/glyph'

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
  const isValidCodePoint = /^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint)
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
  const codePoint = newGlyph.value.codePoint.toUpperCase()
  const updatedGlyphs = [
    ...props.glyphs,
    {
      codePoint,
      hexValue,
    },
  ]

  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
  clearForm()
}

const findExistingGlyph = (codePoint: string): Glyph | undefined => {
  return props.glyphs.find(
    (g) => g.codePoint.toLowerCase() === codePoint.toLowerCase(),
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
}

const updateExistingGlyph = (): void => {
  const hexValue = props.prefillData
    ? props.prefillData.hexValue.toUpperCase()
    : newGlyph.value.hexValue.toUpperCase()
  const codePoint = newGlyph.value.codePoint.toUpperCase()
  const updatedGlyphs = props.glyphs.map((g) =>
    g.codePoint.toLowerCase() === codePoint.toLowerCase()
      ? { ...g, codePoint, hexValue }
      : g,
  )

  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
  clearForm()
}

const clearForm = (): void => {
  newGlyph.value = { codePoint: '', hexValue: '' }
  duplicateGlyph.value = null
  editMode.value = false

  emit('clear-prefill')
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
  removeGlyph(glyph.codePoint)
}

const handleEditInGrid = (glyph: Glyph): void => {
  emit('edit-in-grid', glyph.hexValue, glyph)
}

const exportToHex = (): void => {
  const hexContent = props.glyphs
    .map((glyph) => `${glyph.codePoint}:${glyph.hexValue}`)
    .join('\n')

  const blob = new Blob([hexContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'glyphs.hex'
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

  newGlyph.value.codePoint = newGlyph.value.codePoint.toUpperCase()
  const codePoint = parseInt(newGlyph.value.codePoint, 16)
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
        const codePoint = parts[0].toUpperCase()
        const hexValue = parts[1]?.trim().toUpperCase() || ''
        const existing = findExistingGlyph(codePoint)

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

const handleImageFileUpload = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const nameMatch = file.name?.match(/^([^.]+)/) || ['']
  const codePoint = nameMatch[0].toUpperCase()
  let useCodePoint = ''

  if (/^[0-9A-F]{4,6}$/.test(codePoint)) {
    useCodePoint = codePoint
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  try {
    const img = (await loadImage(file)) as ImageWithDimensions

    if (!validateImageDimensions(img)) {
      target.value = ''
      return
    }

    canvas.width = img.width
    canvas.height = img.height

    if (ctx) {
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (!validateMonochrome(imageData)) {
        target.value = ''
        return
      }

      let hex = ''
      for (let y = 0; y < 16; y++) {
        let row = 0
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4
          const r = imageData.data[i]
          const a = imageData.data[i + 3] || 0
          const isBlack = r === 0 && a > 127
          row = (row << 1) | (isBlack ? 1 : 0)
        }

        hex += row.toString(16).padStart(2, '0').toUpperCase()
      }

      if (useCodePoint) {
        const newGlyph = {
          codePoint: useCodePoint,
          hexValue: hex.toUpperCase(),
        }

        const updatedGlyphs = [...props.glyphs, newGlyph]
        props.onGlyphChange(updatedGlyphs)
        saveGlyphsToStorage(updatedGlyphs)
      } else {
        newGlyph.value.hexValue = hex.toUpperCase()

        nextTick(() => {
          const codePointInput = document.querySelector(
            '.add-glyph input',
          ) as HTMLInputElement
          if (codePointInput) {
            codePointInput.focus()
          }
        })
      }
    }
  } catch (error) {
    console.error('Error loading image:', error)
    dialog.value = {
      show: true,
      title: $t('dialog.image_error.title'),
      message: $t('dialog.image_error.message'),
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

  target.value = ''
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
