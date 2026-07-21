<template>
  <div
    class="glyph-manager"
    :class="{ 'is-expanded': isExpanded }"
    :role="isExpanded ? 'region' : undefined"
    :aria-label="
      isExpanded ? $t('glyph_manager.library.workspace_label') : undefined
    "
  >
    <header v-if="!isExpanded" class="glyph-manager-heading">
      <h2 class="title">{{ $t('glyph_manager.title') }}</h2>
      <button
        ref="expandButton"
        class="ui-icon-button glyph-manager-expand"
        type="button"
        :aria-label="$t('glyph_manager.library.expand')"
        :title="$t('glyph_manager.library.expand')"
        @click="expandLibrary"
      >
        <i-material-symbols-fullscreen aria-hidden="true" />
      </button>
    </header>

    <SearchToolbar
      v-if="!isExpanded"
      v-model:search-query="searchQuery"
      :glyphs="props.glyphs"
      @export="exportToHex"
      @backup="exportBackup"
      @sheet="exportBitmapSheet"
    />

    <GlyphLibraryToolbar
      v-else
      ref="libraryToolbar"
      :inert="inspectorOpen && isNarrowInspector"
      v-model:search-query="searchQuery"
      :density="settings.glyphLibraryDensity"
      :filtered-count="filteredGlyphs.length"
      :inspector-open="inspectorOpen"
      :selected-count="selectedCodePoints.length"
      :selection-mode="selectionMode"
      :total-count="props.glyphs.length"
      @backup="exportBackup"
      @collapse="collapseLibrary"
      @clear-selection="clearSelection"
      @delete-selected="handleBatchDelete(selectedCodePoints)"
      @export="exportToHex"
      @select-filtered="selectFilteredGlyphs"
      @sheet="exportBitmapSheet"
      @toggle-inspector="toggleInspector"
      @toggle-selection-mode="toggleSelectionMode"
      @update:density="settings.glyphLibraryDensity = $event"
    />

    <button
      v-if="isExpanded && inspectorOpen"
      class="inspector-scrim"
      type="button"
      :aria-label="$t('glyph_manager.library.close_inspector')"
      @click="closeInspector"
    />

    <aside
      v-show="!isExpanded || inspectorOpen"
      ref="inspector"
      class="glyph-manager-inspector"
      :role="isExpanded && isNarrowInspector ? 'dialog' : 'complementary'"
      :aria-modal="
        isExpanded && isNarrowInspector && inspectorOpen ? 'true' : undefined
      "
      :aria-label="$t('glyph_manager.library.inspector_title')"
      @keydown="handleInspectorKeydown"
    >
      <header v-if="isExpanded" class="inspector-heading">
        <h3>{{ $t('glyph_manager.library.inspector_title') }}</h3>
        <button
          class="ui-icon-button"
          type="button"
          :aria-label="$t('glyph_manager.library.close_inspector')"
          @click="closeInspector"
        >
          <i-material-symbols-close aria-hidden="true" />
        </button>
      </header>

      <GlyphAdder
        v-model="newGlyph"
        :prefill-data="props.prefillData"
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
    </aside>

    <nav
      v-if="!isExpanded"
      class="glyph-navigation"
      :aria-label="$t('glyph_manager.navigation')"
    >
      <button
        type="button"
        :disabled="!filteredGlyphs.length"
        @click="navigateGlyph(-1)"
      >
        <i-material-symbols-chevron-left />
        {{ $t('glyph_manager.previous') }}
      </button>
      <span
        class="glyph-position"
        :aria-label="
          $t('glyph_manager.position_accessible', {
            current: currentGlyphPosition,
            total: filteredGlyphs.length,
          })
        "
        :title="
          $t('glyph_manager.position_accessible', {
            current: currentGlyphPosition,
            total: filteredGlyphs.length,
          })
        "
        >{{
          $t('glyph_manager.position', {
            current: currentGlyphPosition,
            total: filteredGlyphs.length,
          })
        }}</span
      >
      <button
        type="button"
        :disabled="!filteredGlyphs.length"
        @click="navigateGlyph(1)"
      >
        {{ $t('glyph_manager.next') }}
        <i-material-symbols-chevron-right />
      </button>
    </nav>

    <GlyphList
      v-if="!isExpanded"
      :glyphs="filteredGlyphs"
      :selected-code-points="selectedCodePoints"
      :settings="settings"
      @edit="editGlyph"
      @remove="removeGlyph"
      @edit-in-grid="handleEditInGrid"
      @batch-delete="handleBatchDelete"
      @select-all-filtered="toggleFilteredSelection"
      @toggle-selection="toggleGlyphSelection"
    />

    <GlyphLibraryGrid
      v-else
      :inert="inspectorOpen && isNarrowInspector"
      :active-code-point="props.activeCodePoint"
      :browser-preview-font="settings.browserPreviewFont"
      :density="settings.glyphLibraryDensity"
      :glyphs="filteredGlyphs"
      :initial-scroll-top="matrixScrollTop"
      :preview-mode="settings.glyphPreviewMode"
      :selected-code-points="selectedCodePoints"
      :selection-mode="selectionMode"
      @open="handleLibraryOpen"
      @scroll-position="matrixScrollTop = $event"
      @toggle-selection="toggleGlyphSelection"
    />

    <p class="visually-hidden" aria-live="polite" aria-atomic="true">
      {{ libraryAnnouncement }}
    </p>

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

    <ImageImportDialog
      :file="pendingImageFile"
      @confirm="handlePreparedImage"
      @cancel="pendingImageFile = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import { useSettings } from '@/composables/useSettings'
import { useNotifications } from '@/composables/useNotifications'
import { getGlyphRepository } from '@/storage/glyphRepository'
import type {
  DialogConfig,
  Glyph,
  GlyphData,
  GridData,
  GlyphManagerEmits,
  GlyphManagerProps,
  ImageWithDimensions,
} from '@/types/glyph'
import { parseHexFile } from '@/utils/hexImport'
import { gridToHex } from '@/utils/hexUtils'
import { canvasToBlob } from '@/utils/exportUtils'
import { createBitmapSheet, createGlyphBackup } from '@/utils/libraryExport'

import DialogBox from './DialogBox.vue'
import ImageImportDialog from './ImageImportDialog.vue'
import GlyphAdder from './GlyphManager/GlyphAdder.vue'
import GlyphLibraryGrid from './GlyphManager/GlyphLibraryGrid.vue'
import GlyphLibraryToolbar from './GlyphManager/GlyphLibraryToolbar.vue'
import GlyphList from './GlyphManager/GlyphList.vue'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'
import UploadSection from './GlyphManager/UploadSection.vue'

const { t: $t } = useI18n()
const { notify } = useNotifications()

const props = defineProps<GlyphManagerProps>()
const isExpanded = defineModel<boolean>('expanded', { default: false })

const emit = defineEmits<GlyphManagerEmits>()

const newGlyph = ref<GlyphData>({ codePoint: '', hexValue: '' })
const searchQuery = ref<string>('')
const editMode = ref<boolean>(false)
const duplicateGlyph = ref<Glyph | null>(null)
const pendingImageFile = ref<File | null>(null)
const unicodeNames = ref<Record<string, string>>({})
const selectedCodePoints = ref<string[]>([])
const selectionMode = ref(false)
const inspectorOpen = ref(false)
const matrixScrollTop = ref(0)
const libraryAnnouncement = ref('')
const expandButton = ref<HTMLButtonElement | null>(null)
const inspector = ref<HTMLElement | null>(null)
const libraryToolbar = ref<{
  focusInspectorButton: () => void
} | null>(null)
const narrowInspectorQuery = window.matchMedia('(max-width: 719px)')
const isNarrowInspector = ref(narrowInspectorQuery.matches)
let nameLookupRequest = 0

const { settings } = useSettings()

const glyphRepository = getGlyphRepository()

const normalizedSelectionCodePoint = (value: string): string =>
  value.trim().toUpperCase().padStart(4, '0')

const clearSelection = (): void => {
  selectedCodePoints.value = []
}

const toggleGlyphSelection = (codePoint: string): void => {
  const normalized = normalizedSelectionCodePoint(codePoint)
  selectedCodePoints.value = selectedCodePoints.value.includes(normalized)
    ? selectedCodePoints.value.filter((value) => value !== normalized)
    : [...selectedCodePoints.value, normalized]
}

const selectFilteredGlyphs = (): void => {
  selectedCodePoints.value = Array.from(
    new Set([
      ...selectedCodePoints.value,
      ...filteredGlyphs.value.map((glyph) =>
        normalizedSelectionCodePoint(glyph.codePoint),
      ),
    ]),
  )
}

const toggleFilteredSelection = (): void => {
  const filtered = new Set(
    filteredGlyphs.value.map((glyph) =>
      normalizedSelectionCodePoint(glyph.codePoint),
    ),
  )
  const allFilteredSelected =
    filtered.size > 0 &&
    Array.from(filtered).every((value) =>
      selectedCodePoints.value.includes(value),
    )
  selectedCodePoints.value = allFilteredSelected
    ? selectedCodePoints.value.filter((value) => !filtered.has(value))
    : Array.from(new Set([...selectedCodePoints.value, ...filtered]))
}

const toggleSelectionMode = (): void => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) clearSelection()
}

const expandLibrary = (): void => {
  if (selectedCodePoints.value.length > 0) selectionMode.value = true
  isExpanded.value = true
}

const collapseLibrary = (): void => {
  inspectorOpen.value = false
  isExpanded.value = false
}

const toggleInspector = (): void => {
  if (inspectorOpen.value) closeInspector()
  else openInspector()
}

const openInspector = (): void => {
  inspectorOpen.value = true
  nextTick(() => {
    inspector.value
      ?.querySelector<HTMLElement>(
        'input:not(:disabled), button:not(:disabled)',
      )
      ?.focus()
  })
}

const closeInspector = (): void => {
  inspectorOpen.value = false
  nextTick(() => libraryToolbar.value?.focusInspectorButton())
}

const handleInspectorMediaChange = (event: MediaQueryListEvent): void => {
  isNarrowInspector.value = event.matches
}

const handleInspectorKeydown = (event: KeyboardEvent): void => {
  if (
    event.key !== 'Tab' ||
    !isExpanded.value ||
    !isNarrowInspector.value ||
    !inspector.value
  ) {
    return
  }
  const focusable = Array.from(
    inspector.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
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

const handleEscape = (): boolean => {
  if (dialog.value.show || pendingImageFile.value) return true
  if (selectionMode.value) {
    selectionMode.value = false
    clearSelection()
    return true
  }
  if (inspectorOpen.value) {
    closeInspector()
    return true
  }
  if (isExpanded.value) {
    collapseLibrary()
    return true
  }
  return false
}

watch(isExpanded, (expanded, wasExpanded) => {
  if (expanded) {
    libraryAnnouncement.value = $t('glyph_manager.library.entered_fullscreen')
  } else if (wasExpanded) {
    libraryAnnouncement.value = $t('glyph_manager.library.exited_fullscreen')
    nextTick(() => expandButton.value?.focus())
  }
})

watch(
  () => props.glyphs,
  (glyphs) => {
    const validCodePoints = new Set(
      glyphs.map((glyph) => normalizedSelectionCodePoint(glyph.codePoint)),
    )
    selectedCodePoints.value = selectedCodePoints.value.filter((codePoint) =>
      validCodePoints.has(codePoint),
    )
  },
)

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

const loadStoredGlyphs = async (): Promise<void> => {
  try {
    props.onGlyphChange(await glyphRepository.listGlyphs())
  } catch (error) {
    console.error($t('glyph_manager.error.loading_storage'), error)
  }
}

const saveGlyphsToStorage = async (glyphs: Glyph[]): Promise<boolean> => {
  try {
    await glyphRepository.replaceGlyphs(glyphs)
    return true
  } catch (error) {
    console.error($t('glyph_manager.error.saving_storage'), error)
    notify({
      tone: 'error',
      message: $t('storage.glyph_save_failed'),
    })
    return false
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
  const savedGlyph = { codePoint, hexValue }
  void saveGlyphsToStorage(updatedGlyphs).then((saved) => {
    if (saved) emit('saved', savedGlyph)
  })
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
  const savedGlyph = { codePoint, hexValue }
  void saveGlyphsToStorage(updatedGlyphs).then((saved) => {
    if (saved) emit('saved', savedGlyph)
  })
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
      if (isExpanded.value) inspectorOpen.value = true
      nextTick(() => {
        const codePointInput =
          inspector.value?.querySelector<HTMLInputElement>('.add-glyph input')
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
    .filter((glyph) => {
      const character = String.fromCodePoint(
        parseInt(glyph.codePoint, 16),
      ).toLowerCase()
      return (
        glyph.codePoint.toLowerCase().includes(query) ||
        glyph.hexValue.toLowerCase().includes(query) ||
        character.includes(query) ||
        (unicodeNames.value[glyph.codePoint] || '')
          .toLowerCase()
          .includes(query)
      )
    })
    .sort((a, b) => {
      const codePointA = parseInt(a.codePoint, 16)
      const codePointB = parseInt(b.codePoint, 16)
      return codePointA - codePointB
    })
})

watch(searchQuery, async (query) => {
  const request = ++nameLookupRequest
  if (query.trim().length < 2 || !/[g-z\s-]/i.test(query)) return
  try {
    const module = await import('unicode-name')
    const lookup = module.unicodeName ?? module.default?.unicodeName
    if (!lookup) return
    for (let index = 0; index < props.glyphs.length; index += 50) {
      if (request !== nameLookupRequest) return
      const additions: Record<string, string> = {}
      props.glyphs.slice(index, index + 50).forEach((glyph) => {
        if (unicodeNames.value[glyph.codePoint] !== undefined) return
        additions[glyph.codePoint] =
          lookup(String.fromCodePoint(parseInt(glyph.codePoint, 16))) || ''
      })
      unicodeNames.value = { ...unicodeNames.value, ...additions }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }
  } catch (error) {
    console.error($t('glyph_manager.error.loading_unicode_names'), error)
    notify({
      tone: 'warning',
      message: $t('glyph_manager.error.loading_unicode_names'),
    })
  }
})

const activeListIndex = computed(() => {
  const active = normalizeCodePoint(
    props.activeCodePoint || newGlyph.value.codePoint,
  )
  return filteredGlyphs.value.findIndex(
    (glyph) => normalizeCodePoint(glyph.codePoint) === active,
  )
})

const currentGlyphPosition = computed(() =>
  activeListIndex.value < 0 ? 0 : activeListIndex.value + 1,
)

const navigateGlyph = (direction: -1 | 1): void => {
  const glyphs = filteredGlyphs.value
  if (!glyphs.length) return
  const current = activeListIndex.value
  const index =
    current < 0
      ? direction > 0
        ? 0
        : glyphs.length - 1
      : (current + direction + glyphs.length) % glyphs.length
  const glyph = glyphs[index]
  if (glyph) handleEditInGrid(glyph)
}

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

const handleLibraryOpen = (glyph: Glyph): void => {
  handleEditInGrid(glyph)
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

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const exportBackup = (): void => {
  try {
    const backup = createGlyphBackup(props.glyphs)
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      `unicucumber-backup-${Date.now()}.json`,
    )
    notify({ tone: 'success', message: $t('glyph_manager.backup_exported') })
  } catch (error) {
    console.error('Unable to export glyph backup.', error)
    notify({ tone: 'error', message: $t('glyph_manager.export_failed') })
  }
}

const exportBitmapSheet = async (
  options: { columns: number; scale: number } = { columns: 16, scale: 2 },
): Promise<void> => {
  try {
    const canvas = createBitmapSheet(props.glyphs, options)
    const blob = await canvasToBlob(canvas)
    downloadBlob(blob, `unicucumber-sheet-${Date.now()}.png`)
    notify({
      tone: 'success',
      message: $t('glyph_manager.sheet_exported', options),
    })
  } catch (error) {
    console.error('Unable to export bitmap sheet.', error)
    notify({ tone: 'error', message: $t('glyph_manager.export_failed') })
  }
}

const unifontChunkCache = new Map<string, Record<string, string>>()

const importFromUnifont = async (): Promise<void> => {
  if (!newGlyph.value.codePoint) return

  const normalizedCodePoint = normalizeCodePoint(newGlyph.value.codePoint)
  const codePoint = parseInt(normalizedCodePoint, 16)
  const chunkId = Math.floor(codePoint / 0x1000)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0')

  try {
    let chunk = unifontChunkCache.get(chunkId)
    if (!chunk) {
      const response = await fetch(`/unifont/${chunkId}.json`)
      if (!response.ok) {
        throw new Error(`Unifont chunk ${chunkId}: ${response.status}`)
      }
      chunk = (await response.json()) as Record<string, string>
      if (unifontChunkCache.size >= 8) {
        const oldest = unifontChunkCache.keys().next().value
        if (oldest) unifontChunkCache.delete(oldest)
      }
      unifontChunkCache.set(chunkId, chunk)
    }
    const hexValue = chunk[String(codePoint)]
    if (hexValue) {
      if (props.prefillData) emit('edit-in-grid', hexValue)
      else newGlyph.value.hexValue = hexValue
    } else {
      notify({
        tone: 'warning',
        message: $t('glyph_manager.error.unifont_not_found'),
      })
    }
  } catch (error) {
    console.error($t('glyph_manager.error.loading_unifont'), error)
    notify({
      tone: 'warning',
      message: $t('glyph_manager.error.loading_unifont'),
    })
  }
}

const handleHexFileUpload = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const text = await file.text()
  const parsed = parseHexFile(text)
  const newGlyphs: Glyph[] = []
  const conflicts: Glyph[] = []

  for (const glyph of parsed.glyphs) {
    if (findExistingGlyph(glyph.codePoint)) conflicts.push(glyph)
    else newGlyphs.push(glyph)
  }

  const invalidSummary = parsed.errors
    .slice(0, 20)
    .map((error) =>
      $t('glyph_manager.hex_invalid_line', {
        line: error.line,
        reason: $t(
          `glyph_manager.hex_error_${error.reason.replaceAll('-', '_')}`,
        ),
      }),
    )
    .join('\n')
  if (parsed.errors.length > 0) {
    console.warn('Invalid .hex import lines:', parsed.errors)
    notify({
      tone: 'warning',
      message: $t('glyph_manager.hex_invalid_count', {
        count: parsed.errors.length,
      }),
    })
  }

  if (conflicts.length > 0) {
    dialog.value = {
      show: true,
      title: $t('dialog.hex_import.title'),
      message: [$t('dialog.hex_import.message'), invalidSummary]
        .filter(Boolean)
        .join('\n\n'),
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
    if (parsed.errors.length > 0) {
      dialog.value = {
        show: true,
        title: $t('glyph_manager.hex_invalid_title'),
        message: invalidSummary,
        type: 'alert',
        showCancel: false,
        confirmText: $t('dialog.confirm'),
        items: [],
        onConfirm: () => {
          dialog.value.show = false
        },
      }
    }
  } else if (parsed.errors.length > 0) {
    dialog.value = {
      show: true,
      title: $t('glyph_manager.hex_invalid_title'),
      message: invalidSummary,
      type: 'alert',
      showCancel: false,
      confirmText: $t('dialog.confirm'),
      items: [],
      onConfirm: () => {
        dialog.value.show = false
      },
    }
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

  if (files.length === 1 && files[0]) {
    try {
      const image = await loadImage(files[0])
      if (!validateImageDimensions(image as ImageWithDimensions)) {
        pendingImageFile.value = files[0]
        target.value = ''
        return
      }
    } catch (error) {
      console.error('Error loading image:', error)
    }
  }

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

const handlePreparedImage = (grid: GridData): void => {
  const file = pendingImageFile.value
  if (!file) return

  pendingImageFile.value = null
  const fileName = file.name.match(/^([^.]+)/)?.[0] || ''
  const normalizedCodePoint = normalizeCodePoint(fileName)
  const codePoint = /^[0-9A-F]{1,6}$/.test(normalizedCodePoint)
    ? normalizeCodePointForStorage(fileName)
    : ''
  const glyph: Glyph = { codePoint, hexValue: gridToHex(grid) }

  if (!codePoint) {
    handleManualInputGlyphs([glyph])
    notify({ tone: 'info', message: $t('image_import.prepared') })
    return
  }

  const existing = findExistingGlyph(codePoint)
  if (existing) {
    newGlyph.value = { ...glyph }
    editMode.value = false
    duplicateGlyph.value = existing
    notify({ tone: 'info', message: $t('image_import.prepared') })
    return
  }

  const updatedGlyphs = [...props.glyphs, glyph]
  props.onGlyphChange(updatedGlyphs)
  void saveGlyphsToStorage(updatedGlyphs).then((saved) => {
    if (saved) {
      emit('saved', glyph)
      notify({ tone: 'success', message: $t('image_import.imported') })
    }
  })
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
          const codePointInput = inspector.value?.querySelector(
            '.add-glyph input',
          ) as HTMLInputElement | undefined
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
        const codePointInput = inspector.value?.querySelector(
          '.add-glyph input',
        ) as HTMLInputElement | undefined
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
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    img.src = url
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
      clearSelection()
      selectionMode.value = false
      dialog.value.show = false
    },
    onCancel: () => {
      dialog.value.show = false
    },
  }
}

onMounted(() => {
  narrowInspectorQuery.addEventListener('change', handleInspectorMediaChange)
  void loadStoredGlyphs()
})

onBeforeUnmount(() => {
  narrowInspectorQuery.removeEventListener('change', handleInspectorMediaChange)
})

defineExpose({ handleEscape })
</script>

<style scoped>
.glyph-manager {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  font-family: var(--normal-font);
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  background: var(--background-light);
}

.glyph-manager.is-expanded {
  width: 100%;
  height: 100dvh;
  padding: 0;
  gap: 0;
  isolation: isolate;
  background: var(--background-color);
}

.glyph-manager-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-inline-end: 2.85rem;
}

.title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: bold;
}

.glyph-manager-expand {
  flex: none;
  width: var(--control-height-compact);
  min-width: var(--control-height-compact);
  min-height: var(--control-height-compact);
  color: var(--text-secondary);
}

.icon {
  font-size: 20px;
}

.glyph-manager-inspector {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.is-expanded .glyph-manager-inspector {
  position: absolute;
  z-index: 30;
  inset-block: 0;
  inset-inline-end: 0;
  width: min(24rem, calc(100vw - 3rem));
  box-sizing: border-box;
  padding: 0 var(--space-4) max(1rem, env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  border-inline-start: 1px solid var(--border-color);
  background: var(--background-light);
  box-shadow: -6px 0 20px
    color-mix(in srgb, var(--shadow-color) 75%, transparent);
  animation: inspector-in 160ms ease-out;
}

.inspector-heading {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  min-height: 3.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-inline: calc(var(--space-4) * -1);
  padding: max(0.5rem, env(safe-area-inset-top)) var(--space-4) 0.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-light);
}

.inspector-heading h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 0.95rem;
}

.is-expanded .glyph-manager-inspector :deep(.add-glyph) {
  padding: var(--space-4) 0;
  border: 0;
  border-bottom: 1px solid var(--border-color);
  border-radius: 0;
  background: transparent;
}

.is-expanded .glyph-manager-inspector :deep(.upload-section) {
  padding-block-end: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  border-radius: 0;
  background: transparent;
}

.inspector-scrim {
  display: none;
}

.glyph-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.glyph-navigation button {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-light);
  color: var(--text-color);
}

@keyframes inspector-in {
  from {
    transform: translateX(1rem);
    opacity: 0;
  }
}

@media (max-width: 719px) {
  .glyph-manager {
    height: 100dvh;
    padding: max(0.75rem, env(safe-area-inset-top))
      max(0.75rem, env(safe-area-inset-right))
      max(0.75rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-left));
    gap: 0.65rem;
  }

  .glyph-manager.is-expanded {
    padding: 0;
    gap: 0;
  }

  .title {
    font-size: 1.25rem;
  }

  .glyph-manager-heading {
    padding-inline-end: 3.25rem;
  }

  .is-expanded .glyph-manager-inspector {
    position: fixed;
    width: 100%;
    max-width: none;
    padding-inline: max(var(--space-4), env(safe-area-inset-left))
      max(var(--space-4), env(safe-area-inset-right));
    border-inline-start: 0;
  }

  .inspector-scrim {
    position: fixed;
    z-index: 29;
    inset: 0;
    display: block;
    border: 0;
    background: var(--modal-overlay);
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-expanded .glyph-manager-inspector {
    animation: none;
  }
}
</style>
