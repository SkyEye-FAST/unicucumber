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
    />

    <DialogBox v-model:show="dialog.show" v-bind="dialog" />
  </div>
</template>

<script setup>
import { ref, computed, defineProps, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '@/composables/useSettings'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'
import GlyphAdder from './GlyphManager/GlyphAdder.vue'
import UploadSection from './GlyphManager/UploadSection.vue'
import GlyphList from './GlyphManager/GlyphList.vue'
import DialogBox from './DialogBox.vue'
const { t: $t } = useI18n()

const props = defineProps({
  glyphs: {
    type: Array,
    required: true,
  },
  onGlyphChange: {
    type: Function,
    required: true,
  },
  prefillData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['edit-in-grid', 'clear-prefill'])

const newGlyph = ref({ codePoint: '', hexValue: '' })
const searchQuery = ref('')
const editMode = ref(false)
const duplicateGlyph = ref(null)
const unifontMap = ref({})

const { settings } = useSettings()

const STORAGE_KEY = 'unicucumber_glyphs'

const loadStoredGlyphs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsedGlyphs = JSON.parse(stored)
      props.onGlyphChange(parsedGlyphs)
    }
  } catch (error) {
    console.error($t('glyph_manager.error.loading_storage'), error)
  }
}

const saveGlyphsToStorage = (glyphs) => {
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

const addGlyph = () => {
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

const findExistingGlyph = (codePoint) => {
  return props.glyphs.find(
    (g) => g.codePoint.toLowerCase() === codePoint.toLowerCase(),
  )
}

const handleAdd = () => {
  if (!isValidInput.value) return

  const existing = findExistingGlyph(newGlyph.value.codePoint)
  if (existing && !editMode.value) {
    duplicateGlyph.value = existing
    return
  }

  addGlyph()
}

const updateExistingGlyph = () => {
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

const clearForm = () => {
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
        const codePointInput = document.querySelector('.add-glyph input')
        if (codePointInput) {
          codePointInput.focus()
        }
      })
    }
  },
  { immediate: true },
)

const filteredGlyphs = computed(() => {
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

const removeGlyph = (codePoint) => {
  const updatedGlyphs = props.glyphs.filter(
    (glyph) => glyph.codePoint !== codePoint,
  )
  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
}

const editGlyph = (glyph) => {
  newGlyph.value = { ...glyph }
  editMode.value = true
  removeGlyph(glyph.codePoint)
}

const handleEditInGrid = (glyph) => {
  console.log('GlyphManager editing glyph:', glyph)
  emit('edit-in-grid', glyph.hexValue, glyph)
}

const exportToHex = () => {
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

const loadUnifontData = async () => {
  try {
    const response = await fetch('/unifont_all-16.0.02.hex')
    const text = await response.text()
    const lines = text.split('\n')
    const map = {}

    for (const line of lines) {
      if (line && line.includes(':')) {
        const [code, hex] = line.split(':')
        map[parseInt(code, 16)] = hex.trim()
      }
    }

    unifontMap.value = map
  } catch (error) {
    console.error($t('glyph_manager.error.loading_unifont'), error)
  }
}

const importFromUnifont = () => {
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

const handleHexFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const text = await file.text()
  const lines = text.split('\n')
  const newGlyphs = []
  const conflicts = []

  for (const line of lines) {
    if (line && line.includes(':')) {
      const [code, hex] = line.split(':')
      const codePoint = code.toUpperCase()
      const hexValue = hex.trim().toUpperCase()
      const existing = findExistingGlyph(codePoint)

      if (existing) {
        conflicts.push({ codePoint, hexValue })
      } else {
        newGlyphs.push({ codePoint, hexValue })
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
      onConfirm: (selectedItems) => {
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

  event.target.value = ''
}

const validateImageDimensions = (img) => {
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
    onConfirm: () => {
      dialog.value.show = false
    },
  }
  return false
}

const validateMonochrome = (imageData) => {
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    const a = imageData.data[i + 3]

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
        onConfirm: () => {
          dialog.value.show = false
        },
      }
      return false
    }
  }
  return true
}

const handleImageFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const codePoint = file.name.split('.')[0].toUpperCase()
  let useCodePoint = ''

  if (/^[0-9A-F]{4,6}$/.test(codePoint)) {
    useCodePoint = codePoint
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  try {
    const img = await loadImage(file)

    if (!validateImageDimensions(img)) {
      event.target.value = ''
      return
    }

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    if (!validateMonochrome(imageData)) {
      event.target.value = ''
      return
    }

    let hex = ''
    for (let y = 0; y < 16; y++) {
      let row = 0
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const isBlack = imageData.data[i] === 0 && imageData.data[i + 3] > 127
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
        const codePointInput = document.querySelector('.add-glyph input')
        if (codePointInput) {
          codePointInput.focus()
        }
      })
    }
  } catch (error) {
    console.error('Error loading image:', error)
    dialog.value = {
      show: true,
      title: $t('dialog.image_error.title'),
      message: $t('dialog.image_error.message'),
      type: 'alert',
      showCancel: false,
      onConfirm: () => {
        dialog.value.show = false
      },
    }
  }

  event.target.value = ''
}

const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const dialog = ref({
  show: false,
  title: '',
  message: '',
  type: 'alert',
  items: [],
  showCancel: true,
  confirmText: $t('dialog.confirm'),
  cancelText: $t('dialog.cancel'),
  danger: false,
  onConfirm: () => {},
  onCancel: () => {},
})

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
