<template>
  <div class="glyph-manager">
    <h2 class="title">{{ $t('glyph_manager.title') }}</h2>

    <div class="toolbar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          :placeholder="$t('glyph_manager.search')"
          class="search-input"
        />
      </div>
      <button
        @click="exportToHex"
        class="btn-export"
        :disabled="!props.glyphs.length"
      >
        <span class="material-symbols-outlined">file_download</span>
        {{ $t('glyph_manager.export') }}
      </button>
    </div>

    <div class="add-glyph">
      <div v-if="duplicateGlyph" class="duplicate-warning">
        <p>
          {{
            $t('glyph_manager.duplicate.warning', {
              codePoint: newGlyph.codePoint,
            })
          }}
        </p>
        <div class="warning-actions">
          <button class="btn-warn" @click="updateExistingGlyph">
            {{ $t('glyph_manager.duplicate.update') }}
          </button>
          <button class="btn-cancel" @click="cancelAdd">
            {{ $t('glyph_manager.duplicate.cancel') }}
          </button>
        </div>
      </div>

      <template v-else>
        <div class="input-group">
          <input
            v-model="newGlyph.codePoint"
            :placeholder="$t('glyph_manager.add.code_point')"
            class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()"
          />
          <input
            v-if="!prefillData"
            v-model="newGlyph.hexValue"
            :placeholder="$t('glyph_manager.add.hex_value')"
            class="input"
            @input="$event.target.value = $event.target.value.toUpperCase()"
          />
          <div v-else class="hex-preview">
            <span class="hex-value">{{ prefillData.hexValue }}</span>
          </div>
        </div>
        <div class="button-group">
          <button
            @click="handleAdd"
            class="btn-add"
            :disabled="!isValidInput"
            :title="getAddButtonTitle"
          >
            {{
              editMode
                ? $t('glyph_manager.add.update_button')
                : $t('glyph_manager.add.add_button')
            }}
          </button>
          <button
            @click="importFromUnifont"
            class="btn-import"
            :disabled="!newGlyph.codePoint"
          >
            <span class="material-symbols-outlined">sync</span>
            {{ $t('glyph_manager.import') }}
          </button>
          <button
            v-if="!editMode && (newGlyph.hexValue || prefillData)"
            @click="clearForm"
            class="btn-clear"
          >
            {{ $t('glyph_manager.add.clear_button') }}
          </button>
        </div>
      </template>
    </div>

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
        @change="handleHexFileUpload"
        accept=".hex"
        style="display: none"
      />
      <input
        type="file"
        ref="imageFileInput"
        @change="handleImageFileUpload"
        accept=".png,.jpg,.jpeg,.bmp"
        style="display: none"
      />
    </div>

    <div class="glyph-list">
      <div
        v-for="glyph in filteredGlyphs"
        :key="glyph.codePoint"
        class="glyph-card"
      >
        <div
          class="glyph-preview"
          @click="handleEditInGrid(glyph)"
          :title="
            $t('glyph_manager.glyph.edit_in_grid', {
              codePoint: glyph.codePoint,
            })
          "
        >
          {{ String.fromCodePoint(parseInt(glyph.codePoint, 16)) }}
        </div>
        <div class="glyph-info">
          <div class="info-row">
            <span class="info-label">{{
              $t('glyph_manager.glyph.code_point')
            }}</span>
            <span class="info-value">U+{{ glyph.codePoint }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ $t('glyph_manager.glyph.hex') }}</span>
            <span class="info-value">{{ glyph.hexValue }}</span>
          </div>
        </div>
        <div class="glyph-actions">
          <button
            @click="editGlyph(glyph)"
            class="btn-icon"
            :title="$t('glyph_manager.glyph.edit')"
          >
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button
            @click="removeGlyph(glyph.codePoint)"
            class="btn-icon"
            :title="$t('glyph_manager.glyph.delete')"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>

    <DialogBox
      v-model:show="dialog.show"
      :title="dialog.title"
      :message="dialog.message"
      :type="dialog.type"
      :items="dialog.items"
      :show-cancel="dialog.showCancel"
      :confirm-text="dialog.confirmText"
      :cancel-text="dialog.cancelText"
      :danger="dialog.danger"
      @confirm="dialog.onConfirm"
      @cancel="dialog.onCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, defineProps, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
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

const getAddButtonTitle = computed(() => {
  if (!newGlyph.value.codePoint)
    return $t('glyph_manager.validation.enter_code_point')
  if (!/^[0-9A-Fa-f]{4,6}$/.test(newGlyph.value.codePoint))
    return $t('glyph_manager.validation.invalid_code_point')
  if (
    !props.prefillData &&
    !/^[0-9A-Fa-f]{32}$|^[0-9A-Fa-f]{64}$/.test(newGlyph.value.hexValue)
  ) {
    return $t('glyph_manager.validation.invalid_hex')
  }
  return $t('glyph_manager.validation.add_glyph')
})

const addGlyph = () => {
  if (!isValidInput.value) return

  const hexValue = props.prefillData
    ? props.prefillData.hexValue
    : newGlyph.value.hexValue
  const updatedGlyphs = [
    ...props.glyphs,
    {
      codePoint: newGlyph.value.codePoint,
      hexValue: hexValue,
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
    ? props.prefillData.hexValue
    : newGlyph.value.hexValue
  const updatedGlyphs = props.glyphs.map((g) =>
    g.codePoint.toLowerCase() === newGlyph.value.codePoint.toLowerCase()
      ? { ...g, hexValue }
      : g,
  )

  props.onGlyphChange(updatedGlyphs)
  saveGlyphsToStorage(updatedGlyphs)
  clearForm()
}

const cancelAdd = () => {
  duplicateGlyph.value = null
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
  console.log('Editing glyph:', {
    codePoint: glyph.codePoint,
    hexValue: glyph.hexValue,
  })
  emit('edit-in-grid', glyph.hexValue)
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
    const response = await fetch('/unifont-16.0.02.hex')
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

const hexFileInput = ref(null)
const imageFileInput = ref(null)

const triggerFileUpload = (type) => {
  if (type === 'hex') {
    hexFileInput.value.click()
  } else {
    imageFileInput.value.click()
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
      const existing = findExistingGlyph(codePoint)

      if (existing) {
        conflicts.push({ codePoint, hexValue: hex.trim() })
      } else {
        newGlyphs.push({ codePoint, hexValue: hex.trim() })
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
    title: $t('glyph_manager.upload.invalid_dimensions'),
    message: $t('glyph_manager.upload.invalid_dimensions'),
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
        title: $t('glyph_manager.upload.not_monochrome'),
        message: $t('glyph_manager.upload.not_monochrome'),
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
        hexValue: hex,
      }

      const updatedGlyphs = [...props.glyphs, newGlyph]
      props.onGlyphChange(updatedGlyphs)
      saveGlyphsToStorage(updatedGlyphs)
    } else {
      newGlyph.value.hexValue = hex

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
      title: $t('glyph_manager.upload.image_error'),
      message: $t('glyph_manager.upload.image_error'),
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

.search-box {
  position: relative;
}

.search-input {
  font-family: 'Maple Mono NF CN', monospace;
  width: 90%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
}

.add-glyph {
  border: 2px solid var(--primary-color);
  padding: 16px;
  border-radius: 8px;
  background: var(--background-light);
}

.input {
  font-family: 'Maple Mono NF CN', monospace;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-add {
  padding: 8px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-add:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.glyph-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.glyph-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-color);
}

.glyph-preview {
  flex: 0 0 40px;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-light);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
  transform-origin: center;
}

.glyph-preview:hover {
  background: var(--background-active);
  transform: scale(1.05);
}

.glyph-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-weight: 600;
}

.info-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glyph-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--background-active);
  color: var(--text-color);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.input[readonly] {
  background-color: var(--background-hover);
  cursor: not-allowed;
}

.hex-preview {
  background: var(--background-hover);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 4px;
  font-family: monospace;
}

.hex-label {
  color: var(--text-secondary);
  font-weight: 500;
  margin-right: 8px;
}

.hex-value {
  word-break: break-all;
  color: var(--text-color);
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-clear {
  padding: 8px 20px;
  background: var(--danger-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-clear:hover {
  background: var(--danger-hover);
}

.add-glyph h3 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: var(--text-secondary);
}

.duplicate-warning {
  background-color: var(--warning-background);
  border: 1px solid var(--warning-border);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.duplicate-warning p {
  color: var(--warning-text);
  margin: 0 0 12px 0;
  font-weight: 500;
}

.warning-actions {
  display: flex;
  gap: 8px;
}

.btn-warn {
  padding: 8px 16px;
  background: var(--warning-color);
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-warn:hover {
  background: var(--warning-hover);
}

.btn-cancel {
  padding: 8px 16px;
  background: var(--grey-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: var(--grey-hover);
}

.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-export:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-export:hover:not(:disabled) {
  background: var(--primary-dark);
}

.upload-buttons {
  display: flex;
  gap: 1em;
}

.btn-upload {
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

.btn-import {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-import:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.btn-import:hover:not(:disabled) {
  background: var(--primary-dark);
}
</style>
