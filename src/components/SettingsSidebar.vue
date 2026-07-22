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
            class="settings-section appearance-section"
            aria-describedby="appearance-description"
          >
            <legend class="settings-section-title">
              {{ $t('settings.appearance.label') }}
            </legend>
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
          </fieldset>

          <section
            class="settings-section"
            aria-labelledby="settings-drawing-title"
          >
            <h3 id="settings-drawing-title" class="settings-section-title">
              {{ $t('settings.sections.drawing') }}
            </h3>

            <div class="settings-field">
              <span id="drawMode-label" class="settings-label">
                {{ $t('settings.draw_mode.label') }}
              </span>
              <CustomSelect
                :model-value="settings.drawMode"
                :ariaLabel="$t('settings.draw_mode.label')"
                :options="drawModeOptions"
                @update:model-value="updateDrawMode"
              />
            </div>

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
            aria-labelledby="settings-glyph-title"
          >
            <h3 id="settings-glyph-title" class="settings-section-title">
              {{ $t('settings.sections.glyph_preview') }}
            </h3>

            <div class="settings-field">
              <span id="glyphWidth-label" class="settings-label">
                {{ $t('settings.glyph_width.label') }}
              </span>
              <CustomSelect
                :model-value="settings.glyphWidth"
                :ariaLabel="$t('settings.glyph_width.label')"
                :options="glyphWidthOptions"
                @update:model-value="updateGlyphWidth"
              />
            </div>

            <div class="settings-field">
              <span id="glyphPreviewMode-label" class="settings-label">
                {{ $t('settings.glyph_preview.label') }}
              </span>
              <CustomSelect
                :model-value="settings.glyphPreviewMode"
                :ariaLabel="$t('settings.glyph_preview.label')"
                :options="glyphPreviewModeOptions"
                @update:model-value="updatePreviewMode"
              />
            </div>

            <div class="settings-field">
              <span id="browser-font-label" class="settings-label">
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
              {{ $t('settings.sections.behaviour') }}
            </h3>

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
const { t: $t } = useI18n()

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

const updateBoolean = (
  key: 'alwaysShowMouseCursor' | 'showBorder' | 'confirmClear',
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
  padding: var(--space-6) 0;
  border: 0;
  border-bottom: 1px solid var(--border-color);
}

.appearance-section {
  margin-top: var(--space-6);
}

.settings-section-title {
  display: block;
  margin: 0 0 var(--space-4);
  padding: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 750;
  line-height: 1.25;
}

.settings-description {
  margin: calc(var(--space-2) * -1) 0 var(--space-4);
  color: var(--text-secondary);
  font-size: 0.825rem;
  line-height: 1.45;
}

.settings-field {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.settings-section-title + .settings-field {
  margin-top: 0;
}

.settings-label {
  min-width: 0;
  color: var(--text-color);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
}

.settings-field :deep(.custom-select),
.font-input {
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

.settings-check-row {
  min-height: var(--control-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-3);
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
  min-height: 3.4rem;
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
  gap: var(--space-3);
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
  padding: var(--space-4) 0 0;
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
    padding-block: 1.25rem;
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
