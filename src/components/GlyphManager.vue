<template>
  <div
    class="glyph-manager"
    :class="{ 'is-expanded': isExpanded }"
    :data-glyph-count="props.glyphs.length"
    :role="isExpanded ? 'region' : undefined"
    :aria-label="
      isExpanded ? $t('glyph_manager.library.workspace_label') : undefined
    "
  >
    <header v-if="!isExpanded" class="glyph-manager-heading">
      <div class="glyph-manager-heading__identity">
        <h2 class="title">{{ $t('glyph_manager.title') }}</h2>
        <span class="compact-count">{{ props.glyphs.length }}</span>
      </div>
      <div class="glyph-manager-heading__actions">
        <button
          class="ui-button compact-tools-toggle"
          type="button"
          :aria-label="$t('glyph_manager.library.tools')"
          :aria-expanded="compactToolsOpen"
          :aria-controls="'compact-glyph-tools'"
          @click="compactToolsOpen = !compactToolsOpen"
        >
          <i-material-symbols-tune aria-hidden="true" />
          <span>{{ $t('glyph_manager.library.tools') }}</span>
          <i-material-symbols-keyboard-arrow-up
            v-if="compactToolsOpen"
            class="compact-tools-toggle__indicator"
            aria-hidden="true"
          />
          <i-material-symbols-keyboard-arrow-down
            v-else
            class="compact-tools-toggle__indicator"
            aria-hidden="true"
          />
        </button>
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
      </div>
    </header>

    <SearchToolbar
      v-if="!isExpanded"
      v-model:export-scope="fontExportScope"
      v-model:font-metadata="activeFontMetadata"
      v-model:search-query="searchQuery"
      :font-export-busy="fontExportBusy"
      @export="exportToHex"
      @font="exportFont"
      @backup="exportBackup"
      @reset-font-metadata="resetFontMetadata"
      @sheet="exportBitmapSheet"
    />

    <GlyphLibraryToolbar
      v-else
      v-model:search-query="searchQuery"
      :density="settings.glyphLibraryDensity"
      v-model:export-scope="fontExportScope"
      :filtered-count="filteredGlyphs.length"
      :font-export-busy="fontExportBusy"
      v-model:font-metadata="activeFontMetadata"
      v-model:source-filter="sourceFilter"
      v-model:unicode-block="unicodeBlock"
      v-model:unicode-plane="unicodePlane"
      :modified-count="modifiedCodePoints.length"
      :selected-addable-count="selectedAddableCodePoints.length"
      :selected-count="selectedCodePoints.length"
      :selected-managed-count="selectedManagedCodePoints.length"
      :selection-mode="selectionMode"
      :total-count="catalogGlyphs.length"
      @backup="exportBackup"
      @add-selected="addSelectedGlyphsToManager"
      @collapse="collapseLibrary"
      @clear-selection="clearSelection"
      @delete-selected="handleBatchDelete(selectedManagedCodePoints)"
      @export="exportToHex"
      @font="exportFont"
      @reset-font-metadata="resetFontMetadata"
      @select-filtered="selectFilteredGlyphs"
      @sheet="exportBitmapSheet"
      @toggle-selection-mode="toggleSelectionMode"
      @update:density="settings.glyphLibraryDensity = $event"
    />

    <aside
      v-show="!isExpanded && compactToolsOpen"
      :id="!isExpanded ? 'compact-glyph-tools' : undefined"
      ref="inspector"
      class="glyph-manager-inspector"
      role="complementary"
      :aria-label="$t('glyph_manager.library.inspector_title')"
    >
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

    <div
      v-if="displayLibraryPending"
      class="glyph-library-status"
      role="status"
      aria-live="polite"
    >
      <span class="glyph-library-spinner" aria-hidden="true" />
      <span>{{ loadingLabel }}</span>
    </div>

    <div
      v-else-if="displayLibraryError"
      class="glyph-library-status is-error"
      role="alert"
    >
      <span>{{ $t('glyph_manager.library.load_failed') }}</span>
      <button type="button" class="ui-button" @click="retryLibraryLoad">
        {{ $t('glyph_manager.library.retry') }}
      </button>
    </div>

    <GlyphList
      v-else-if="!isExpanded"
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
      :active-code-point="props.activeCodePoint"
      :browser-preview-font="settings.browserPreviewFont"
      :density="settings.glyphLibraryDensity"
      :glyphs="filteredGlyphs"
      :initial-scroll-top="matrixScrollTop"
      :preview-mode="settings.glyphPreviewMode"
      :modified-code-points="modifiedCodePoints"
      :resolved-hex-values="catalogHexValues"
      :selected-code-points="selectedCodePoints"
      :selection-mode="selectionMode"
      @open="handleLibraryOpen"
      @scroll-position="matrixScrollTop = $event"
      @set-selection="setGlyphSelection"
      @toggle-selection="toggleGlyphSelection"
      @visible-code-points="hydrateCatalogGlyphs"
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
      v-model:mode="settings.imageImportMode"
      v-model:threshold="settings.imageImportThreshold"
      v-model:transparent-as-white="settings.imageImportTransparentAsWhite"
      :file="pendingImageFile"
      @confirm="handlePreparedImage"
      @cancel="pendingImageFile = null"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'

import { useI18n } from 'vue-i18n'

import { useNotifications } from '@/composables/useNotifications'
import { useSettings } from '@/composables/useSettings'
import { UNICODE_BLOCKS } from '@/data/unicodeBlocks'
import { getUnifontChunkId, unifontLoader } from '@/services/unifontLoader'
import type {
  DialogConfig,
  Glyph,
  GlyphData,
  GlyphManagerEmits,
  GlyphManagerProps,
  GlyphSourceFilter,
  GlyphUnicodeBlockFilter,
  GlyphUnicodePlaneFilter,
  GridData,
  ImageWithDimensions,
} from '@/types/glyph'
import { normalizeCodePointHex } from '@/utils/charUtils'
import { canvasToBlob } from '@/utils/exportUtils'
import {
  createBdfFont,
  createFontExportMetadata,
  createOfficialUnifontMetadata,
  createPixelFont,
  createPsfFont,
  createWoff2Font,
  type FontExportMetadata,
  type FontExportFormat,
  type FontExportScope,
} from '@/utils/fontExport'
import {
  formatGlyphCodePoint,
  sortGlyphsByCodePoint,
} from '@/utils/glyphLibrary'
import { parseHexFile } from '@/utils/hexImport'
import { gridToHex, normalizeHex } from '@/utils/hexUtils'
import { createBitmapSheet, createGlyphBackup } from '@/utils/libraryExport'

import DialogBox from './DialogBox.vue'
import GlyphAdder from './GlyphManager/GlyphAdder.vue'
import GlyphLibraryGrid from './GlyphManager/GlyphLibraryGrid.vue'
import GlyphLibraryToolbar from './GlyphManager/GlyphLibraryToolbar.vue'
import GlyphList from './GlyphManager/GlyphList.vue'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'
import UploadSection from './GlyphManager/UploadSection.vue'
import ImageImportDialog from './ImageImportDialog.vue'

const { t: $t } = useI18n()
const { notify } = useNotifications()

const props = withDefaults(defineProps<GlyphManagerProps>(), {
  libraryLoading: false,
  libraryLoaded: true,
  libraryError: null,
  onRetryLoad: undefined,
})
const isExpanded = defineModel<boolean>('expanded', { default: false })
const searchQuery = defineModel<string>('searchQuery', { default: '' })

const emit = defineEmits<GlyphManagerEmits>()

const newGlyph = ref<GlyphData>({ codePoint: '', hexValue: '' })
const sourceFilter = ref<GlyphSourceFilter>('all')
const unicodePlane = ref<GlyphUnicodePlaneFilter>('all')
const unicodeBlock = ref<GlyphUnicodeBlockFilter>('all')
const editMode = ref<boolean>(false)
const duplicateGlyph = ref<Glyph | null>(null)
const pendingImageFile = ref<File | null>(null)
const unicodeNameMatches = shallowRef<ReadonlySet<string>>(new Set())
const catalogHexMatches = shallowRef<ReadonlySet<string>>(new Set())
const selectedCodePoints = ref<string[]>([])
const selectionMode = ref(false)
const compactToolsOpen = ref(false)
const matrixScrollTop = ref(0)
const unifontCatalogGlyphs = shallowRef<Glyph[]>([])
const catalogHexValues = shallowRef<Record<string, string>>({})
const unifontBaselineHex = shallowRef<Record<string, string | null>>({})
const catalogLoading = ref(false)
const catalogError = shallowRef<Error | null>(null)
const fontExportBusy = ref(false)
const fontExportScope = ref<FontExportScope>('full')
const unifontVersion =
  (import.meta.env.VITE_UNIFONT_VERSION as string | undefined) || '17.0.05'
const fullFontMetadata = ref<FontExportMetadata>(
  createOfficialUnifontMetadata(unifontVersion),
)
const modifiedFontMetadata = ref<FontExportMetadata>(createFontExportMetadata())
const activeFontMetadata = computed<FontExportMetadata>({
  get: () =>
    fontExportScope.value === 'full'
      ? fullFontMetadata.value
      : modifiedFontMetadata.value,
  set: (value) => {
    if (fontExportScope.value === 'full') fullFontMetadata.value = value
    else modifiedFontMetadata.value = value
  },
})
const libraryAnnouncement = ref('')
const expandButton = ref<HTMLButtonElement | null>(null)
const inspector = ref<HTMLElement | null>(null)
let nameLookupRequest = 0
let unifontPrefetchTimer = 0
let narrowViewportQuery: MediaQueryList | null = null
let catalogLoadPromise: Promise<void> | null = null
let baselineLookupRequest = 0
let hexLookupRequest = 0
let catalogHydrationQueue: Promise<void> = Promise.resolve()
const hydratedCatalogChunkKeys = new Map<string, string[]>()
const hydratedCatalogChunkOrder: string[] = []
const MAX_HYDRATED_CATALOG_CHUNKS = 8

const { settings } = useSettings()

const savedLibraryPending = computed(
  () => props.libraryLoading || (!props.libraryLoaded && !props.libraryError),
)

const displayLibraryPending = computed(
  () => savedLibraryPending.value || (isExpanded.value && catalogLoading.value),
)
const displayLibraryError = computed(
  () => props.libraryError ?? (isExpanded.value ? catalogError.value : null),
)
const loadingLabel = computed(() =>
  isExpanded.value && catalogLoading.value
    ? $t('glyph_manager.library.loading_unifont')
    : $t('glyph_manager.library.loading'),
)

const selectedUnicodeBlock = computed(() =>
  unicodeBlock.value === 'all'
    ? null
    : (UNICODE_BLOCKS.find((block) => block.id === unicodeBlock.value) ?? null),
)

const catalogGlyphs = computed<Glyph[]>(() => {
  if (!unifontCatalogGlyphs.value.length) return props.glyphs
  const overrides = new Map(
    props.glyphs.map((glyph) => [formatGlyphCodePoint(glyph.codePoint), glyph]),
  )
  const merged = unifontCatalogGlyphs.value.map((glyph) => {
    const codePoint = formatGlyphCodePoint(glyph.codePoint)
    const override = overrides.get(codePoint)
    if (!override) return glyph
    overrides.delete(codePoint)
    return { ...override, codePoint }
  })
  return sortGlyphsByCodePoint([...merged, ...overrides.values()])
})
const managedCodePointSet = computed(
  () =>
    new Set(props.glyphs.map((glyph) => formatGlyphCodePoint(glyph.codePoint))),
)
const modifiedCodePoints = computed(() => {
  return props.glyphs
    .filter((glyph) => {
      const codePoint = formatGlyphCodePoint(glyph.codePoint)
      if (!(codePoint in unifontBaselineHex.value)) return false
      const original = unifontBaselineHex.value[codePoint]
      return original === null || original !== glyph.hexValue.toUpperCase()
    })
    .map((glyph) => formatGlyphCodePoint(glyph.codePoint))
})
const modifiedSet = computed(() => new Set(modifiedCodePoints.value))
const selectedManagedCodePoints = computed(() =>
  selectedCodePoints.value.filter((codePoint) =>
    managedCodePointSet.value.has(codePoint),
  ),
)
const selectedAddableCodePoints = computed(() =>
  selectedCodePoints.value.filter(
    (codePoint) => !managedCodePointSet.value.has(codePoint),
  ),
)

const loadGlyphBaselines = async (
  glyphs: readonly Glyph[],
  tolerateErrors = true,
): Promise<Record<string, string | null>> => {
  const baselines: Record<string, string | null> = {}
  for (let index = 0; index < glyphs.length; index += 50) {
    const batch = glyphs.slice(index, index + 50)
    const results = await Promise.all(
      batch.map(async (glyph) => {
        const codePoint = formatGlyphCodePoint(glyph.codePoint)
        try {
          const hexValue = await unifontLoader.getGlyph(
            Number.parseInt(codePoint, 16),
          )
          return [codePoint, hexValue?.toUpperCase() ?? null] as const
        } catch (error) {
          if (!tolerateErrors) throw error
          return [codePoint, undefined] as const
        }
      }),
    )
    for (const [codePoint, hexValue] of results) {
      if (hexValue !== undefined) baselines[codePoint] = hexValue
    }
  }
  return baselines
}

const refreshManagedBaselines = async (): Promise<void> => {
  const request = ++baselineLookupRequest
  const baselines = await loadGlyphBaselines(props.glyphs)
  if (request === baselineLookupRequest) {
    unifontBaselineHex.value = baselines
  }
}

const hydrateCatalogGlyphs = (codePoints: string[]): void => {
  const chunkIds = Array.from(
    new Set(
      codePoints.map((codePoint) =>
        getUnifontChunkId(Number.parseInt(codePoint, 16)),
      ),
    ),
  )
  if (chunkIds.length === 0) return

  catalogHydrationQueue = catalogHydrationQueue
    .catch(() => undefined)
    .then(async () => {
      const chunks = await Promise.all(
        chunkIds.map(async (chunkId) => ({
          chunkId,
          chunk: await unifontLoader.loadChunk(chunkId),
        })),
      )
      const next = { ...catalogHexValues.value }
      for (const { chunkId, chunk } of chunks) {
        const keys: string[] = []
        for (const [decimal, hexValue] of Object.entries(chunk)) {
          const codePoint = Number.parseInt(decimal, 10)
          const normalizedHex = normalizeHex(hexValue)
          if (!Number.isInteger(codePoint) || normalizedHex === null) continue
          const key = formatGlyphCodePoint(codePoint.toString(16))
          next[key] = normalizedHex.toUpperCase()
          keys.push(key)
        }
        hydratedCatalogChunkKeys.set(chunkId, keys)
        const existingIndex = hydratedCatalogChunkOrder.indexOf(chunkId)
        if (existingIndex >= 0)
          hydratedCatalogChunkOrder.splice(existingIndex, 1)
        hydratedCatalogChunkOrder.push(chunkId)
      }

      while (hydratedCatalogChunkOrder.length > MAX_HYDRATED_CATALOG_CHUNKS) {
        const evicted = hydratedCatalogChunkOrder.shift()
        if (!evicted) break
        for (const key of hydratedCatalogChunkKeys.get(evicted) ?? []) {
          delete next[key]
        }
        hydratedCatalogChunkKeys.delete(evicted)
      }
      catalogHexValues.value = next
    })
    .catch((error) => {
      console.error('Unable to hydrate visible Unifont glyphs.', error)
    })
}

const loadUnifontCatalog = (): Promise<void> => {
  if (unifontCatalogGlyphs.value.length) return Promise.resolve()
  if (catalogLoadPromise) return catalogLoadPromise
  catalogLoading.value = true
  catalogError.value = null
  const request = unifontLoader
    .loadCatalogCodePoints()
    .then((codePoints) => {
      unifontCatalogGlyphs.value = codePoints.map((codePoint) => ({
        codePoint: formatGlyphCodePoint(codePoint.toString(16)),
        hexValue: '',
      }))
      void refreshManagedBaselines()
    })
    .catch((error) => {
      catalogError.value =
        error instanceof Error ? error : new Error('Unable to load Unifont.')
    })
    .finally(() => {
      catalogLoading.value = false
      if (catalogLoadPromise === request) catalogLoadPromise = null
    })
  catalogLoadPromise = request
  return request
}

const resetFontMetadata = (): void => {
  activeFontMetadata.value =
    fontExportScope.value === 'full'
      ? createOfficialUnifontMetadata(unifontVersion)
      : createFontExportMetadata()
}

const retryLibraryLoad = (): void => {
  if (props.libraryError) void props.onRetryLoad?.()
  if (isExpanded.value && catalogError.value) void loadUnifontCatalog()
}

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

const setGlyphSelection = (codePoint: string, selected: boolean): void => {
  const normalized = normalizedSelectionCodePoint(codePoint)
  const isSelected = selectedCodePoints.value.includes(normalized)
  if (isSelected === selected) return
  selectedCodePoints.value = selected
    ? [...selectedCodePoints.value, normalized]
    : selectedCodePoints.value.filter((value) => value !== normalized)
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
  void loadUnifontCatalog()
}

const collapseLibrary = (): void => {
  isExpanded.value = false
}

const handleNarrowViewportChange = (event: MediaQueryListEvent): void => {
  compactToolsOpen.value = !event.matches
}

const handleEscape = (): boolean => {
  if (dialog.value.show || pendingImageFile.value) return true
  if (selectionMode.value) {
    selectionMode.value = false
    clearSelection()
    return true
  }
  if (!isExpanded.value && compactToolsOpen.value) {
    compactToolsOpen.value = false
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
    void refreshManagedBaselines()
  } else if (wasExpanded) {
    libraryAnnouncement.value = $t('glyph_manager.library.exited_fullscreen')
    nextTick(() => expandButton.value?.focus())
  }
})

watch(
  () => props.glyphs,
  () => {
    if (isExpanded.value) void refreshManagedBaselines()
  },
)

watch(catalogGlyphs, (glyphs) => {
  const validCodePoints = new Set(
    glyphs.map((glyph) => normalizedSelectionCodePoint(glyph.codePoint)),
  )
  selectedCodePoints.value = selectedCodePoints.value.filter((codePoint) =>
    validCodePoints.has(codePoint),
  )
})

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

const normalizeCodePointForStorage = (input: string): string | null =>
  normalizeCodePointHex(normalizeCodePoint(input))

const normalizeCodePointForExport = (codePoint: string): string => {
  if (codePoint.length < 4) {
    return codePoint.padStart(4, '0')
  } else if (codePoint.length === 5) {
    return '0' + codePoint
  }
  return codePoint
}

const saveGlyphsToStorage = async (glyphs: Glyph[]): Promise<boolean> => {
  try {
    await props.onGlyphChange(glyphs)
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

const addGlyphsToManager = async (
  sourceGlyphs: readonly Glyph[],
): Promise<Glyph[]> => {
  const additions = sourceGlyphs.filter(
    (glyph) =>
      !managedCodePointSet.value.has(formatGlyphCodePoint(glyph.codePoint)),
  )
  if (!additions.length) return []

  const saved = await saveGlyphsToStorage([
    ...props.glyphs,
    ...additions.map((glyph) => ({
      codePoint: formatGlyphCodePoint(glyph.codePoint),
      hexValue: glyph.hexValue.toUpperCase(),
    })),
  ])
  if (!saved) return []

  notify({
    tone: 'success',
    message: $t('glyph_manager.library.added_to_manager', {
      count: additions.length,
    }),
  })
  return additions
}

const addSelectedGlyphsToManager = async (): Promise<void> => {
  const selected = new Set(selectedAddableCodePoints.value)
  const additions = (
    await Promise.all(
      catalogGlyphs.value
        .filter((glyph) => selected.has(formatGlyphCodePoint(glyph.codePoint)))
        .map((glyph) => resolveCatalogGlyph(glyph)),
    )
  ).filter((glyph): glyph is Glyph => glyph !== null)
  if ((await addGlyphsToManager(additions)).length > 0) clearSelection()
}

const isValidInput = computed(() => {
  const isValidCodePoint =
    normalizeCodePointForStorage(newGlyph.value.codePoint) !== null
  const hasValidHex =
    (props.prefillData && props.prefillData.hexValue) ||
    normalizeHex(newGlyph.value.hexValue) !== null
  return isValidCodePoint && hasValidHex
})

const addGlyph = (): void => {
  if (!isValidInput.value) return

  const hexValue = props.prefillData
    ? props.prefillData.hexValue.toUpperCase()
    : newGlyph.value.hexValue.toUpperCase()
  const codePoint = normalizeCodePointForStorage(newGlyph.value.codePoint)
  if (codePoint === null) return
  const updatedGlyphs = [
    ...props.glyphs,
    {
      codePoint,
      hexValue,
    },
  ]

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
  if (codePoint === null) return
  const updatedGlyphs = props.glyphs.map((g) =>
    normalizeCodePoint(g.codePoint) ===
    normalizeCodePoint(newGlyph.value.codePoint)
      ? { ...g, codePoint, hexValue }
      : g,
  )

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
      if (isExpanded.value) isExpanded.value = false
      compactToolsOpen.value = true
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
  const query = searchQuery.value.trim().toLowerCase()
  const source = isExpanded.value ? catalogGlyphs.value : props.glyphs
  return source.filter((glyph) => {
    const codePoint = formatGlyphCodePoint(glyph.codePoint)
    if (
      isExpanded.value &&
      sourceFilter.value === 'modified' &&
      !modifiedSet.value.has(codePoint)
    ) {
      return false
    }
    if (
      isExpanded.value &&
      unicodePlane.value !== 'all' &&
      Math.floor(Number.parseInt(codePoint, 16) / 0x10000) !==
        Number.parseInt(unicodePlane.value, 10)
    ) {
      return false
    }
    const selectedBlock = selectedUnicodeBlock.value
    const value = Number.parseInt(codePoint, 16)
    if (
      isExpanded.value &&
      selectedBlock &&
      (value < selectedBlock.start || value > selectedBlock.end)
    ) {
      return false
    }
    if (!query) return true
    const searchableHex =
      glyph.hexValue || catalogHexValues.value[codePoint] || ''
    const character = String.fromCodePoint(
      parseInt(glyph.codePoint, 16),
    ).toLowerCase()
    return (
      glyph.codePoint.toLowerCase().includes(query) ||
      searchableHex.toLowerCase().includes(query) ||
      character.includes(query) ||
      unicodeNameMatches.value.has(glyph.codePoint) ||
      catalogHexMatches.value.has(glyph.codePoint)
    )
  })
})

watch([searchQuery, isExpanded], async ([query, expanded]) => {
  const request = ++hexLookupRequest
  catalogHexMatches.value = new Set()
  const normalizedQuery = query.trim().toUpperCase()
  if (
    !expanded ||
    normalizedQuery.length <= 6 ||
    !/^[0-9A-F]+$/.test(normalizedQuery)
  ) {
    return
  }

  try {
    const manifest = await unifontLoader.loadManifest()
    const matches = new Set<string>()
    const batchSize = 8
    for (let start = 0; start < manifest.chunkCount; start += batchSize) {
      if (request !== hexLookupRequest) return
      const chunks = await Promise.all(
        Array.from(
          { length: Math.min(batchSize, manifest.chunkCount - start) },
          (_, offset) =>
            unifontLoader.loadChunk(
              (start + offset).toString(16).toUpperCase().padStart(3, '0'),
            ),
        ),
      )
      for (const chunk of chunks) {
        for (const [decimal, hexValue] of Object.entries(chunk)) {
          if (hexValue.includes(normalizedQuery)) {
            matches.add(
              formatGlyphCodePoint(Number.parseInt(decimal, 10).toString(16)),
            )
          }
        }
      }
      if (start + batchSize < manifest.chunkCount) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    }
    if (request === hexLookupRequest) catalogHexMatches.value = matches
  } catch (error) {
    console.error('Unable to search the Unifont bitmap catalog.', error)
  }
})

watch([searchQuery, isExpanded, catalogGlyphs], async ([query]) => {
  const request = ++nameLookupRequest
  unicodeNameMatches.value = new Set()
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery.length < 2 || !/[g-z\s-]/i.test(normalizedQuery)) return
  try {
    const module = await import('unicode-name')
    const lookup = module.unicodeName ?? module.default?.unicodeName
    if (!lookup) return
    const source = isExpanded.value ? catalogGlyphs.value : props.glyphs
    const matches = new Set<string>()
    for (let index = 0; index < source.length; index += 500) {
      if (request !== nameLookupRequest) return
      source.slice(index, index + 500).forEach((glyph) => {
        const name =
          lookup(String.fromCodePoint(parseInt(glyph.codePoint, 16))) || ''
        if (name.toLowerCase().includes(normalizedQuery)) {
          matches.add(glyph.codePoint)
        }
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }
    if (request === nameLookupRequest) unicodeNameMatches.value = matches
  } catch (error) {
    console.error($t('glyph_manager.error.loading_unicode_names'), error)
    notify({
      tone: 'warning',
      message: $t('glyph_manager.error.loading_unicode_names'),
    })
  }
})

const removeGlyph = (codePoint: string): void => {
  const updatedGlyphs = props.glyphs.filter(
    (glyph) => glyph.codePoint !== codePoint,
  )
  saveGlyphsToStorage(updatedGlyphs)
}

const editGlyph = (glyph: Glyph): void => {
  newGlyph.value = { ...glyph }
  editMode.value = true
  compactToolsOpen.value = true
}

const resolveCatalogGlyph = async (glyph: Glyph): Promise<Glyph | null> => {
  if (glyph.hexValue) return glyph
  const codePoint = formatGlyphCodePoint(glyph.codePoint)
  const cachedHexValue = catalogHexValues.value[codePoint]
  if (cachedHexValue) return { codePoint, hexValue: cachedHexValue }
  try {
    const hexValue = await unifontLoader.getGlyph(
      Number.parseInt(codePoint, 16),
    )
    return hexValue ? { codePoint, hexValue: hexValue.toUpperCase() } : null
  } catch {
    return null
  }
}

const handleEditInGrid = async (glyph: Glyph): Promise<void> => {
  const resolved = await resolveCatalogGlyph(glyph)
  if (resolved) emit('edit-in-grid', resolved.hexValue, resolved)
}

const handleLibraryOpen = async (glyph: Glyph): Promise<void> => {
  const resolved = await resolveCatalogGlyph(glyph)
  if (!resolved) return
  const additions = await addGlyphsToManager([resolved])
  if (
    !managedCodePointSet.value.has(formatGlyphCodePoint(resolved.codePoint)) &&
    additions.length === 0
  ) {
    return
  }
  await handleEditInGrid(resolved)
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

const resolveFontExportGlyphs = async (): Promise<Glyph[]> => {
  if (fontExportScope.value === 'modified') {
    const baselines = await loadGlyphBaselines(props.glyphs, false)
    unifontBaselineHex.value = baselines
    return props.glyphs.filter((glyph) => {
      const codePoint = formatGlyphCodePoint(glyph.codePoint)
      if (!(codePoint in baselines)) return false
      const original = baselines[codePoint]
      return original === null || original !== glyph.hexValue.toUpperCase()
    })
  }
  const officialGlyphs = await unifontLoader.loadGlyphsInRange(0, 0xffff)
  const overrides = new Map(
    props.glyphs
      .filter((glyph) => Number.parseInt(glyph.codePoint, 16) <= 0xffff)
      .map((glyph) => [formatGlyphCodePoint(glyph.codePoint), glyph]),
  )
  const merged = officialGlyphs.map((glyph) => {
    const codePoint = formatGlyphCodePoint(glyph.codePoint)
    const override = overrides.get(codePoint)
    if (!override) return glyph
    overrides.delete(codePoint)
    return { ...override, codePoint }
  })
  return sortGlyphsByCodePoint([...merged, ...overrides.values()])
}

const fontExportFilename = (
  format: FontExportFormat | 'woff2' | 'bdf' | 'psf',
  metadata: FontExportMetadata,
): string => {
  const baseName =
    metadata.postScriptName.replaceAll(/[^A-Za-z0-9_-]/g, '') ||
    'UniCucumberPixel'
  if (fontExportScope.value === 'full') {
    const version =
      metadata.version
        .replace(/^version\s*/i, '')
        .replaceAll(/[^A-Za-z0-9._-]/g, '-') || unifontVersion
    return `${baseName}-${version}.${format}`
  }
  return `${baseName}-modified-${Date.now()}.${format}`
}

const exportFont = async (
  format: FontExportFormat | 'woff2' | 'bdf' | 'psf',
): Promise<void> => {
  if (fontExportBusy.value) return
  fontExportBusy.value = true
  try {
    const glyphs = await resolveFontExportGlyphs()
    const metadata = { ...activeFontMetadata.value }
    await nextTick()
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    const content = await (format === 'woff2'
      ? createWoff2Font(glyphs, metadata)
      : format === 'bdf'
        ? createBdfFont(glyphs, metadata)
        : format === 'psf'
          ? createPsfFont(glyphs)
          : createPixelFont(glyphs, format, metadata))
    const mimeType =
      format === 'woff2'
        ? 'font/woff2'
        : format === 'woff'
          ? 'font/woff'
          : format === 'otf'
            ? 'font/otf'
            : format === 'ttf'
              ? 'font/ttf'
              : format === 'bdf'
                ? 'application/x-font-bdf'
                : 'application/x-font-psf'
    const blobContent =
      typeof content === 'string' ? content : content.slice().buffer
    downloadBlob(
      new Blob([blobContent], { type: mimeType }),
      fontExportFilename(format, metadata),
    )
    notify({
      tone: 'success',
      message: $t('glyph_manager.font_exported', {
        format: format.toUpperCase(),
      }),
    })
  } catch (error) {
    console.error(`Unable to export ${format} font.`, error)
    notify({ tone: 'error', message: $t('glyph_manager.export_failed') })
  } finally {
    fontExportBusy.value = false
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

const importFromUnifont = async (): Promise<void> => {
  if (!newGlyph.value.codePoint) return

  const normalizedCodePoint = normalizeCodePoint(newGlyph.value.codePoint)
  const codePoint = parseInt(normalizedCodePoint, 16)

  try {
    const hexValue = await unifontLoader.getGlyph(codePoint)
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

watch(
  () => newGlyph.value.codePoint,
  (value) => {
    window.clearTimeout(unifontPrefetchTimer)
    const normalized = normalizeCodePoint(value)
    if (!/^[0-9A-F]{1,6}$/.test(normalized)) return
    const codePoint = Number.parseInt(normalized, 16)
    if (codePoint > 0x10ffff) return
    unifontPrefetchTimer = window.setTimeout(() => {
      void unifontLoader.prefetchCodePoint(codePoint)
    }, 250)
  },
  { flush: 'post' },
)

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
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false
      },
      onCancel: () => {
        const finalGlyphs = [...props.glyphs, ...newGlyphs]
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false
      },
    }
  } else if (newGlyphs.length > 0) {
    const updatedGlyphs = [...props.glyphs, ...newGlyphs]
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
  if (img.height === 16 && [4, 8, 12, 16, 20].includes(img.width)) {
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
  const useCodePoint = normalizeCodePointHex(normalizedCodePoint) ?? ''

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
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false

        handleManualInputGlyphs(manualInputGlyphs)
      },
      onCancel: () => {
        const finalGlyphs = [...props.glyphs, ...validGlyphs]
        saveGlyphsToStorage(finalGlyphs)
        dialog.value.show = false

        handleManualInputGlyphs(manualInputGlyphs)
      },
    }
  } else if (validGlyphs.length > 0) {
    const updatedGlyphs = [...props.glyphs, ...validGlyphs]
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
  const codePoint = normalizeCodePointHex(normalizedCodePoint) ?? ''
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
  narrowViewportQuery = window.matchMedia('(max-width: 719px)')
  compactToolsOpen.value = !narrowViewportQuery.matches
  narrowViewportQuery.addEventListener('change', handleNarrowViewportChange)
})

onBeforeUnmount(() => {
  window.clearTimeout(unifontPrefetchTimer)
  narrowViewportQuery?.removeEventListener('change', handleNarrowViewportChange)
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
  gap: var(--space-3);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--background-light);
  container-type: inline-size;
}

.glyph-manager.is-expanded {
  width: 100%;
  height: 100dvh;
  padding: 0;
  gap: 0;
  isolation: isolate;
  overflow: hidden;
  background: var(--background-color);
  transform-origin: left top;
  animation: glyph-library-workspace-enter 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.glyph-manager.is-expanded > :deep(.library-toolbar) {
  animation: glyph-library-toolbar-enter 240ms 30ms
    cubic-bezier(0.22, 1, 0.36, 1) both;
}

.glyph-manager.is-expanded > :deep(.glyph-library-shell),
.glyph-manager.is-expanded > .glyph-library-status {
  animation: glyph-library-content-enter 300ms 60ms
    cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes glyph-library-workspace-enter {
  from {
    opacity: 0.72;
    transform: translateX(-0.85rem) scale(0.985);
  }
}

@keyframes glyph-library-toolbar-enter {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
}

@keyframes glyph-library-content-enter {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

.glyph-library-status {
  min-height: 12rem;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  color: var(--text-secondary);
  text-align: center;
}

.glyph-library-status.is-error {
  flex-direction: column;
  color: var(--danger-color);
}

.glyph-library-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border-color);
  border-block-start-color: var(--primary-color);
  border-radius: 50%;
  animation: glyph-library-spin 0.8s linear infinite;
}

@keyframes glyph-library-spin {
  to {
    transform: rotate(1turn);
  }
}

.glyph-manager-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: var(--space-2);
  padding-inline-end: 2.85rem;
}

.glyph-manager-heading__identity,
.glyph-manager-heading__actions {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.glyph-manager-heading__identity {
  flex: 1 1 auto;
  overflow: hidden;
}

.glyph-manager-heading__actions {
  flex: 0 0 auto;
}

.compact-count {
  flex: none;
  min-width: 1.5rem;
  padding: 0.12rem 0.38rem;
  border-radius: 999px;
  background: var(--background-color);
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.7rem;
  text-align: center;
}

.compact-tools-toggle {
  min-height: var(--control-height-compact);
  padding-inline: 0.55rem;
  font-size: 0.75rem;
}

.title {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The sidebar can be narrowed independently of the viewport. At its compact
 * width, keep the primary controls on one stable row by reducing gaps and
 * truncating the title before hiding the tools action's visible guidance. */
@container (max-width: 28rem) {
  .glyph-manager-heading {
    gap: var(--space-1);
  }

  .glyph-manager-heading__identity,
  .glyph-manager-heading__actions {
    gap: var(--space-1);
  }

  .title {
    font-size: 1.25rem;
  }
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
  gap: var(--space-3);
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
  .glyph-manager.is-expanded,
  .glyph-manager.is-expanded > :deep(.library-toolbar),
  .glyph-manager.is-expanded > :deep(.glyph-library-shell),
  .glyph-manager.is-expanded > .glyph-library-status,
  .is-expanded .glyph-manager-inspector {
    animation: none;
  }
}
</style>
