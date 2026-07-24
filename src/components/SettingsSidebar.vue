<template>
  <Teleport to="body">
    <Transition name="settings-overlay">
      <div
        v-if="modelValue"
        class="settings-overlay"
        aria-hidden="true"
        @click="closeSidebar"
      ></div>
    </Transition>

    <Transition name="settings-drawer">
      <aside
        v-if="modelValue"
        ref="sidebarRef"
        class="settings-sidebar"
        role="dialog"
        :aria-modal="isModalMode ? 'true' : undefined"
        aria-labelledby="settings-sidebar-title"
        @click.stop
      >
        <header class="settings-header">
          <h2 id="settings-sidebar-title">{{ $t('settings.title') }}</h2>
          <button
            ref="closeButtonRef"
            class="ui-icon-button settings-close"
            type="button"
            :aria-label="$t('settings.close_sidebar')"
            @click="closeSidebar"
          >
            <i-material-symbols-close class="settings-icon" />
          </button>
        </header>

        <div class="settings-content">
          <fieldset
            class="settings-section"
            aria-describedby="appearance-description"
          >
            <legend class="settings-section-title">
              {{ $t('settings.sections.general') }}
            </legend>
            <span class="settings-field-label">{{
              $t('settings.appearance.label')
            }}</span>
            <p id="appearance-description" class="settings-description">
              {{ $t('settings.appearance.follow_system') }}
            </p>
            <div class="appearance-segment">
              <label class="appearance-choice">
                <input
                  type="radio"
                  name="appearance"
                  value="auto"
                  :checked="preference === 'auto'"
                  @change="setPreference('auto')"
                />
                <span class="appearance-option">
                  <i-material-symbols-brightness-auto class="appearance-icon" />
                  <span>{{ $t('settings.appearance.auto') }}</span>
                </span>
              </label>
              <label class="appearance-choice">
                <input
                  type="radio"
                  name="appearance"
                  value="light"
                  :checked="preference === 'light'"
                  @change="setPreference('light')"
                />
                <span class="appearance-option">
                  <i-material-symbols-light-mode class="appearance-icon" />
                  <span>{{ $t('settings.appearance.light') }}</span>
                </span>
              </label>
              <label class="appearance-choice">
                <input
                  type="radio"
                  name="appearance"
                  value="dark"
                  :checked="preference === 'dark'"
                  @change="setPreference('dark')"
                />
                <span class="appearance-option">
                  <i-material-symbols-dark-mode class="appearance-icon" />
                  <span>{{ $t('settings.appearance.dark') }}</span>
                </span>
              </label>
            </div>

            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.language.label')
              }}</span>
              <CustomSelect
                :model-value="locale"
                :ariaLabel="$t('settings.language.label')"
                :options="languageOptions"
                @update:model-value="updateLanguage"
              />
            </div>
          </fieldset>

          <section
            class="settings-section"
            aria-labelledby="settings-drawing-title"
          >
            <h3 id="settings-drawing-title" class="settings-section-title">
              {{ $t('settings.sections.canvas') }}
            </h3>

            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.glyph_width.label')
              }}</span>
              <CustomSelect
                :model-value="settings.glyphWidth"
                :ariaLabel="$t('settings.glyph_width.label')"
                :options="glyphWidthOptions"
                @update:model-value="updateGlyphWidth"
              />
            </div>

            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.draw_mode.label')
              }}</span>
              <CustomSelect
                :model-value="settings.drawMode"
                :ariaLabel="$t('settings.draw_mode.label')"
                :options="drawModeOptions"
                @update:model-value="updateDrawMode"
              />
            </div>

            <label class="settings-check-row" for="showBorder">
              <span class="settings-label">
                {{ $t('settings.show_border') }}
              </span>
              <input
                id="showBorder"
                type="checkbox"
                :checked="settings.showBorder"
                @change="updateBoolean('showBorder', $event)"
              />
            </label>

            <label class="settings-check-row" for="enableSelection">
              <span class="settings-label">{{
                $t('settings.enable_selection')
              }}</span>
              <input
                id="enableSelection"
                type="checkbox"
                :checked="settings.enableSelection"
                @change="updateBoolean('enableSelection', $event)"
              />
            </label>

            <label class="settings-check-row" for="alwaysShowMouseCursor">
              <span class="settings-label">
                {{ $t('settings.always_show_mouse_cursor') }}
              </span>
              <input
                id="alwaysShowMouseCursor"
                type="checkbox"
                :checked="settings.alwaysShowMouseCursor"
                @change="updateBoolean('alwaysShowMouseCursor', $event)"
              />
            </label>
          </section>

          <section
            class="settings-section"
            aria-labelledby="settings-workflow-title"
          >
            <h3 id="settings-workflow-title" class="settings-section-title">
              {{ $t('settings.sections.workflow') }}
            </h3>
            <label class="settings-check-row" for="autoSaveEnabled">
              <span class="settings-label">{{
                $t('settings.auto_save_enabled')
              }}</span>
              <input
                id="autoSaveEnabled"
                type="checkbox"
                :checked="settings.autoSaveEnabled"
                @change="updateBoolean('autoSaveEnabled', $event)"
              />
            </label>
            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.auto_save_interval')
              }}</span>
              <CustomSelect
                :model-value="settings.autoSaveInterval"
                :ariaLabel="$t('settings.auto_save_interval')"
                :disabled="!settings.autoSaveEnabled"
                :options="autoSaveIntervalOptions"
                @update:model-value="updateAutoSaveInterval"
              />
            </div>
            <p class="settings-hint">{{ $t('settings.auto_save_hint') }}</p>
          </section>

          <section
            class="settings-section"
            aria-labelledby="settings-import-export-title"
          >
            <h3
              id="settings-import-export-title"
              class="settings-section-title"
            >
              {{ $t('settings.sections.import_export') }}
            </h3>

            <span class="settings-field-label">{{
              $t('settings.export_defaults')
            }}</span>
            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.export_scale')
              }}</span>
              <CustomSelect
                :model-value="settings.exportScale"
                :ariaLabel="$t('settings.export_scale')"
                :options="exportScaleOptions"
                @update:model-value="updateExportScale"
              />
            </div>
            <label class="settings-check-row" for="exportTransparent">
              <span class="settings-label">{{
                $t('settings.export_transparent')
              }}</span>
              <input
                id="exportTransparent"
                type="checkbox"
                :checked="settings.exportTransparent"
                @change="updateBoolean('exportTransparent', $event)"
              />
            </label>

            <span class="settings-field-label settings-field-label--spaced">{{
              $t('settings.image_import_defaults')
            }}</span>
            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.image_import_mode')
              }}</span>
              <CustomSelect
                :model-value="settings.imageImportMode"
                :ariaLabel="$t('settings.image_import_mode')"
                :options="imageImportModeOptions"
                @update:model-value="updateImageImportMode"
              />
            </div>
            <div class="settings-field settings-field--inline">
              <label class="settings-label" for="imageImportThreshold">{{
                $t('settings.image_import_threshold')
              }}</label>
              <input
                id="imageImportThreshold"
                class="settings-number-input"
                type="number"
                min="0"
                max="255"
                step="1"
                :value="settings.imageImportThreshold"
                @change="updateImageImportThreshold"
              />
            </div>
            <label
              class="settings-check-row"
              for="imageImportTransparentAsWhite"
            >
              <span class="settings-label">{{
                $t('settings.image_import_transparent_white')
              }}</span>
              <input
                id="imageImportTransparentAsWhite"
                type="checkbox"
                :checked="settings.imageImportTransparentAsWhite"
                @change="updateBoolean('imageImportTransparentAsWhite', $event)"
              />
            </label>
          </section>

          <section
            class="settings-section"
            aria-labelledby="settings-glyph-title"
          >
            <h3 id="settings-glyph-title" class="settings-section-title">
              {{ $t('settings.sections.glyph_preview') }}
            </h3>

            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.glyph_preview.label')
              }}</span>
              <CustomSelect
                :model-value="settings.glyphPreviewMode"
                :ariaLabel="$t('settings.glyph_preview.label')"
                :options="glyphPreviewModeOptions"
                @update:model-value="updatePreviewMode"
              />
            </div>

            <div class="settings-field settings-field--inline">
              <span class="settings-label">{{
                $t('settings.glyph_library_density')
              }}</span>
              <CustomSelect
                :model-value="settings.glyphLibraryDensity"
                :ariaLabel="$t('settings.glyph_library_density')"
                :options="glyphLibraryDensityOptions"
                @update:model-value="updateGlyphLibraryDensity"
              />
            </div>

            <div class="settings-field">
              <span id="browser-font-label" class="settings-field-label">
                {{ $t('settings.browser_preview_font') }}
              </span>
              <button
                class="ui-button font-button"
                type="button"
                aria-labelledby="browser-font-label"
                :aria-expanded="showFontEdit"
                aria-controls="font-editor"
                :title="settings.browserPreviewFont"
                @click="toggleFontEdit"
              >
                <span>{{ settings.browserPreviewFont }}</span>
                <i-material-symbols-edit class="settings-icon" />
              </button>

              <div v-if="showFontEdit" id="font-editor" class="font-editor">
                <label for="fontInput" class="visually-hidden">
                  {{ $t('settings.font_edit.title') }}
                </label>
                <textarea
                  id="fontInput"
                  ref="fontInputRef"
                  v-model="tempFont"
                  class="font-input"
                  rows="5"
                ></textarea>
                <div class="font-edit-actions">
                  <button
                    class="ui-button ui-button--primary"
                    type="button"
                    :disabled="tempFont.trim().length === 0"
                    @click="saveFontEdit"
                  >
                    {{ $t('settings.font_edit.save') }}
                  </button>
                  <button
                    class="ui-button ui-button--quiet"
                    type="button"
                    @click="cancelFontEdit"
                  >
                    {{ $t('settings.font_edit.cancel') }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            class="settings-section"
            aria-labelledby="settings-behaviour-title"
          >
            <h3 id="settings-behaviour-title" class="settings-section-title">
              {{ $t('settings.sections.safety') }}
            </h3>

            <label class="settings-check-row" for="confirmClear">
              <span class="settings-label">
                {{ $t('settings.confirm_clear') }}
              </span>
              <input
                id="confirmClear"
                type="checkbox"
                :checked="settings.confirmClear"
                @change="updateBoolean('confirmClear', $event)"
              />
            </label>
          </section>

          <footer class="settings-footer">
            <button
              class="ui-button ui-button--quiet reset-button"
              type="button"
              @click="showResetConfirm"
            >
              <i-material-symbols-restart-alt class="settings-icon" />
              {{ $t('settings.reset') }}
            </button>
          </footer>
        </div>
      </aside>
    </Transition>
  </Teleport>

  <DialogBox
    :show="showResetDialog"
    :title="$t('dialog.settings_reset.title')"
    :message="$t('dialog.settings_reset.message')"
    :confirm-text="$t('dialog.settings_reset.confirm')"
    @confirm="confirmReset"
    @cancel="showResetDialog = false"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import CustomSelect, {
  type CustomSelectOption,
} from '@/components/CustomSelect.vue'
import { useSettings } from '@/composables/useSettings'
import { useTheme } from '@/composables/useTheme'
import type { EditorSettings } from '@/types/glyph'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'
import { LOCALE_PREFERENCE_KEY, type SupportedLocale } from '@/utils/locale'

import DialogBox from './DialogBox.vue'

const props = defineProps<{
  modelValue: boolean
  settings: EditorSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:settings': [value: EditorSettings]
}>()

const { defaultSettings } = useSettings()
const { preference, setPreference } = useTheme()
const { t: $t, locale } = useI18n()

const sidebarRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const fontInputRef = ref<HTMLTextAreaElement | null>(null)
const isModalMode = ref(false)
const showFontEdit = ref(false)
const tempFont = ref('')
const showResetDialog = ref(false)
const drawModeOptions = computed<CustomSelectOption[]>(() => [
  {
    value: 'doubleButtonDraw',
    label: $t('settings.draw_mode.double_button'),
  },
  {
    value: 'singleButtonDraw',
    label: $t('settings.draw_mode.single_button'),
  },
])
const glyphWidthOptions = computed<CustomSelectOption[]>(() => [
  { value: 8, label: $t('settings.glyph_width.8px') },
  { value: 16, label: $t('settings.glyph_width.16px') },
])
const glyphPreviewModeOptions = computed<CustomSelectOption[]>(() => [
  { value: 'pixelOnly', label: $t('settings.glyph_preview.pixel_only') },
  { value: 'browserOnly', label: $t('settings.glyph_preview.browser_only') },
  { value: 'both', label: $t('settings.glyph_preview.both') },
])
const glyphLibraryDensityOptions = computed<CustomSelectOption[]>(() => [
  { value: 'compact', label: $t('glyph_manager.library.density.compact') },
  {
    value: 'comfortable',
    label: $t('glyph_manager.library.density.comfortable'),
  },
  { value: 'large', label: $t('glyph_manager.library.density.large') },
])
const exportScaleOptions: CustomSelectOption[] = [1, 2, 4, 8, 16].map(
  (value) => ({ value, label: `${value}×` }),
)
const imageImportModeOptions = computed<CustomSelectOption[]>(() => [
  { value: 'fit', label: $t('image_import.fit') },
  { value: 'crop', label: $t('image_import.crop') },
])
const autoSaveIntervalOptions = computed<CustomSelectOption[]>(() => [
  { value: 500, label: $t('settings.auto_save_intervals.500ms') },
  { value: 1000, label: $t('settings.auto_save_intervals.1s') },
  { value: 3000, label: $t('settings.auto_save_intervals.3s') },
  { value: 5000, label: $t('settings.auto_save_intervals.5s') },
  { value: 10000, label: $t('settings.auto_save_intervals.10s') },
])
const languageOptions: CustomSelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
]

let modalQuery: MediaQueryList | null = null
let overlayLocked = false
let openSession = false
let previouslyFocused: HTMLElement | null = null

const closeSidebar = (): void => emit('update:modelValue', false)

const updateSettings = (patch: Partial<EditorSettings>): void => {
  emit('update:settings', { ...props.settings, ...patch })
}

const updateDrawMode = (value: string | number): void => {
  updateSettings({
    drawMode: value as EditorSettings['drawMode'],
  })
}

const updateGlyphWidth = (value: string | number): void => {
  updateSettings({
    glyphWidth: Number(value) as EditorSettings['glyphWidth'],
  })
}

const updatePreviewMode = (value: string | number): void => {
  updateSettings({
    glyphPreviewMode: value as EditorSettings['glyphPreviewMode'],
  })
}

const updateGlyphLibraryDensity = (value: string | number): void => {
  updateSettings({
    glyphLibraryDensity: value as EditorSettings['glyphLibraryDensity'],
  })
}

const updateExportScale = (value: string | number): void => {
  updateSettings({
    exportScale: Number(value) as EditorSettings['exportScale'],
  })
}

const updateImageImportMode = (value: string | number): void => {
  updateSettings({
    imageImportMode: value as EditorSettings['imageImportMode'],
  })
}

const updateImageImportThreshold = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    input.value = String(props.settings.imageImportThreshold)
    return
  }
  updateSettings({ imageImportThreshold: value })
}

const updateAutoSaveInterval = (value: string | number): void => {
  updateSettings({
    autoSaveInterval: Number(value) as EditorSettings['autoSaveInterval'],
  })
}

const updateLanguage = (value: string | number): void => {
  const nextLocale = value as SupportedLocale
  locale.value = nextLocale
  try {
    window.localStorage.setItem(LOCALE_PREFERENCE_KEY, nextLocale)
  } catch {
    // The selection remains active for this session when storage is unavailable.
  }
}

const updateBoolean = (
  key:
    | 'alwaysShowMouseCursor'
    | 'showBorder'
    | 'confirmClear'
    | 'enableSelection'
    | 'exportTransparent'
    | 'imageImportTransparentAsWhite'
    | 'autoSaveEnabled',
  event: Event,
): void => {
  updateSettings({ [key]: (event.target as HTMLInputElement).checked })
}

const toggleFontEdit = (): void => {
  if (showFontEdit.value) {
    cancelFontEdit()
    return
  }
  tempFont.value = props.settings.browserPreviewFont
  showFontEdit.value = true
  void nextTick(() => fontInputRef.value?.focus())
}

const cancelFontEdit = (): void => {
  showFontEdit.value = false
  tempFont.value = ''
}

const saveFontEdit = (): void => {
  const nextFont = tempFont.value.trim()
  if (!nextFont) return
  updateSettings({ browserPreviewFont: nextFont })
  cancelFontEdit()
}

const getFocusableElements = (): HTMLElement[] => {
  if (!sidebarRef.value) return []
  return Array.from(
    sidebarRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

const handleDocumentKeydown = (event: KeyboardEvent): void => {
  if (!props.modelValue) return
  if (event.key === 'Escape') {
    if (showResetDialog.value) return
    event.preventDefault()
    closeSidebar()
    return
  }
  if (event.key !== 'Tab' || !isModalMode.value) return

  const focusable = getFocusableElements()
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (!sidebarRef.value?.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const syncOverlayLock = (): void => {
  const shouldLock = props.modelValue && isModalMode.value
  if (shouldLock && !overlayLocked) {
    acquireOverlayLock()
    overlayLocked = true
  } else if (!shouldLock && overlayLocked) {
    releaseOverlayLock()
    overlayLocked = false
  }
}

const handleModalQueryChange = (event: MediaQueryListEvent): void => {
  isModalMode.value = event.matches
  syncOverlayLock()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && !openSession) {
      openSession = true
      previouslyFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', handleDocumentKeydown)
      syncOverlayLock()
      void nextTick(() => closeButtonRef.value?.focus())
    } else if (!open && openSession) {
      openSession = false
      document.removeEventListener('keydown', handleDocumentKeydown)
      syncOverlayLock()
      showFontEdit.value = false
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

onMounted(() => {
  modalQuery = window.matchMedia('(max-width: 1023px)')
  isModalMode.value = modalQuery.matches
  modalQuery.addEventListener('change', handleModalQueryChange)
  syncOverlayLock()
})

onBeforeUnmount(() => {
  modalQuery?.removeEventListener('change', handleModalQueryChange)
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (overlayLocked) releaseOverlayLock()
})

const showResetConfirm = (): void => {
  showResetDialog.value = true
}

const confirmReset = (): void => {
  emit('update:settings', { ...defaultSettings })
  setPreference('auto')
  showResetDialog.value = false
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 1090;
  background: color-mix(in srgb, var(--modal-overlay) 58%, transparent);
}

.settings-sidebar {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 1091;
  box-sizing: border-box;
  width: clamp(20rem, 30vw, 24rem);
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border-left: 1px solid var(--border-color);
  background: var(--background-light);
  box-shadow: -0.35rem 0 1.4rem rgba(0, 0, 0, 0.14);
  color: var(--text-color);
}

.settings-header {
  min-height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: max(var(--space-3), env(safe-area-inset-top))
    max(var(--space-4), env(safe-area-inset-right)) var(--space-3)
    var(--space-6);
  border-bottom: 1px solid var(--border-color);
  background: var(--background-light);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.settings-close {
  flex: none;
  color: var(--text-secondary);
}

.settings-icon {
  display: block;
  flex: none;
  font-size: 1.25rem;
}

.settings-content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 var(--space-6) max(var(--space-6), env(safe-area-inset-bottom));
  scrollbar-gutter: stable;
}

.settings-section {
  min-width: 0;
  margin: 0;
  padding: var(--space-4) 0;
  border: 0;
  border-bottom: 1px solid var(--border-color);
}

.settings-section-title {
  display: block;
  margin: 0 0 var(--space-3);
  padding: 0;
  color: var(--text-color);
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.25;
}

.settings-description {
  margin: calc(var(--space-1) * -1) 0 var(--space-3);
  color: var(--text-secondary);
  font-size: 0.825rem;
  line-height: 1.45;
}

.settings-hint {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.4;
}

.settings-field {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.settings-section-title + .settings-field {
  margin-top: 0;
}

.settings-label {
  min-width: 0;
  color: var(--text-color);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.4;
}

.settings-field-label {
  display: block;
  min-width: 0;
  color: var(--text-color);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.4;
}

.settings-field-label--spaced {
  margin-top: var(--space-4);
}

.settings-field--inline {
  grid-template-columns: minmax(0, 1fr) minmax(8.75rem, 10.5rem);
  align-items: center;
  gap: var(--space-3);
}

.settings-field :deep(.custom-select),
.font-input,
.settings-number-input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
}

.settings-field :deep(.custom-select__trigger) {
  min-height: var(--control-height);
}

.settings-number-input {
  min-height: var(--control-height);
  padding: 0.4rem 0.7rem;
  font: inherit;
}

.settings-check-row {
  min-height: 2.35rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-2);
  cursor: pointer;
}

.settings-check-row input[type='checkbox'] {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  margin: 0;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.appearance-segment {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  background: var(--input-background);
}

.appearance-choice {
  position: relative;
  min-width: 0;
  cursor: pointer;
}

.appearance-choice + .appearance-choice {
  border-left: 1px solid var(--input-border);
}

.appearance-choice input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  opacity: 0;
}

.appearance-option {
  min-height: 2.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: var(--space-2) 0.25rem;
  box-sizing: border-box;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.appearance-icon {
  flex: none;
  font-size: 1.15rem;
}

.appearance-choice:hover .appearance-option {
  background: var(--background-hover);
}

.appearance-choice input:checked + .appearance-option {
  box-shadow: inset 0 0 0 2px var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  color: var(--text-color);
  font-weight: 750;
}

.appearance-choice input:checked + .appearance-option .appearance-icon {
  color: var(--primary-color);
}

.appearance-choice input:focus-visible + .appearance-option {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--focus-ring);
  outline-offset: -3px;
}

.font-button {
  width: 100%;
  min-width: 0;
  justify-content: space-between;
  padding-inline: var(--space-3);
  font-weight: 500;
  text-align: left;
}

.font-button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-editor {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-1);
}

.font-input {
  min-height: 7rem;
  resize: vertical;
  padding: var(--space-3);
  font-family: var(--monospace-font);
  font-size: 0.8rem;
  line-height: 1.45;
}

.font-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.settings-footer {
  padding: var(--space-3) 0 0;
}

.reset-button {
  width: 100%;
  justify-content: flex-start;
  border-color: transparent;
  color: var(--text-color);
}

.reset-button .settings-icon {
  color: var(--primary-color);
}

.settings-drawer-enter-active,
.settings-drawer-leave-active,
.settings-overlay-enter-active,
.settings-overlay-leave-active {
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.settings-drawer-enter-from,
.settings-drawer-leave-to {
  transform: translateX(100%);
}

.settings-overlay-enter-from,
.settings-overlay-leave-to {
  opacity: 0;
}

@media (min-width: 1024px) {
  .settings-overlay {
    display: none;
  }
}

@media (min-width: 720px) and (max-width: 1023px) {
  .settings-sidebar {
    width: min(36rem, calc(100vw - 3rem));
  }
}

@media (max-width: 719px) {
  .settings-sidebar {
    width: 100vw;
    border-left: 0;
    box-shadow: none;
  }

  .settings-header {
    min-height: 3.5rem;
    padding-right: max(var(--space-3), env(safe-area-inset-right));
    padding-left: max(var(--space-4), env(safe-area-inset-left));
  }

  .settings-header h2 {
    font-size: 1.2rem;
  }

  .settings-content {
    padding-right: max(var(--space-4), env(safe-area-inset-right));
    padding-left: max(var(--space-4), env(safe-area-inset-left));
  }

  .settings-section {
    padding-block: var(--space-4);
  }

  .settings-field--inline {
    grid-template-columns: minmax(0, 1fr) minmax(8.25rem, 10rem);
  }

  .appearance-option {
    min-height: var(--control-height);
    flex-direction: column;
    gap: 0.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-drawer-enter-active,
  .settings-drawer-leave-active,
  .settings-overlay-enter-active,
  .settings-overlay-leave-active {
    transition: none;
  }
}
</style>
