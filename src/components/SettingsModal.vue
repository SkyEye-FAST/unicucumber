<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="overlay"
      @click="$emit('update:modelValue', false)"
    ></div>
    <div
      v-if="modelValue"
      ref="modalRef"
      class="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      tabindex="-1"
      @keydown="handleKeydown"
    >
      <h2 id="settings-modal-title" class="modal-title">
        {{ $t('settings.title') }}
      </h2>

      <div class="setting-option">
        <label for="drawMode">{{ $t('settings.draw_mode.label') }}</label>
        <select
          id="drawMode"
          :value="settings.drawMode"
          @change="
            $emit('update:settings', {
              ...settings,
              drawMode: ($event.target as HTMLSelectElement).value,
            })
          "
        >
          <option value="doubleButtonDraw">
            {{ $t('settings.draw_mode.double_button') }}
          </option>
          <option value="singleButtonDraw">
            {{ $t('settings.draw_mode.single_button') }}
          </option>
        </select>
      </div>

      <!-- cursorEffect removed; replaced by alwaysShowMouseCursor -->

      <div class="setting-option">
        <label for="alwaysShowMouseCursor">{{
          $t('settings.always_show_mouse_cursor')
        }}</label>
        <div class="checkbox-wrapper">
          <input
            id="alwaysShowMouseCursor"
            type="checkbox"
            :checked="settings.alwaysShowMouseCursor"
            @change="
              $emit('update:settings', {
                ...settings,
                alwaysShowMouseCursor: ($event.target as HTMLInputElement)
                  .checked,
              })
            "
          />
        </div>
      </div>

      <div class="setting-option">
        <label for="glyphWidth">{{ $t('settings.glyph_width.label') }}</label>
        <select
          id="glyphWidth"
          :value="settings.glyphWidth"
          @change="
            $emit('update:settings', {
              ...settings,
              glyphWidth: parseInt(($event.target as HTMLSelectElement).value),
            })
          "
        >
          <option :value="8">{{ $t('settings.glyph_width.8px') }}</option>
          <option :value="16">{{ $t('settings.glyph_width.16px') }}</option>
        </select>
      </div>

      <div class="setting-option">
        <label for="glyphPreviewMode">{{
          $t('settings.glyph_preview.label')
        }}</label>
        <select
          id="glyphPreviewMode"
          :value="settings.glyphPreviewMode"
          @change="
            $emit('update:settings', {
              ...settings,
              glyphPreviewMode: ($event.target as HTMLSelectElement).value,
            })
          "
        >
          <option value="pixelOnly">
            {{ $t('settings.glyph_preview.pixel_only') }}
          </option>
          <option value="browserOnly">
            {{ $t('settings.glyph_preview.browser_only') }}
          </option>
          <option value="both">{{ $t('settings.glyph_preview.both') }}</option>
        </select>
      </div>

      <div class="setting-option">
        <div id="browserFont">{{ $t('settings.browser_preview_font') }}</div>
        <button class="font-button" type="button" @click="openFontEdit">
          {{ settings.browserPreviewFont }}
        </button>
      </div>

      <div class="setting-option">
        <label for="showBorder">{{ $t('settings.show_border') }}</label>
        <div class="checkbox-wrapper">
          <input
            id="showBorder"
            type="checkbox"
            :checked="settings.showBorder"
            @change="
              $emit('update:settings', {
                ...settings,
                showBorder: ($event.target as HTMLInputElement).checked,
              })
            "
          />
        </div>
      </div>

      <div class="setting-option">
        <label for="confirmClear">{{ $t('settings.confirm_clear') }} </label>
        <input
          id="confirmClear"
          type="checkbox"
          :checked="settings.confirmClear"
          @change="
            $emit('update:settings', {
              ...settings,
              confirmClear: ($event.target as HTMLInputElement).checked,
            })
          "
        />
      </div>

      <div class="button-group">
        <button class="reset-button" type="button" @click="showResetConfirm">
          {{ $t('settings.reset') }}
        </button>
        <button
          class="close-button"
          type="button"
          @click="$emit('update:modelValue', false)"
        >
          {{ $t('settings.close') }}
        </button>
      </div>

      <div v-if="showFontEdit" class="font-edit-modal">
        <div class="font-edit-content">
          <h3>{{ $t('settings.font_edit.title') }}</h3>
          <textarea
            v-model="tempFont"
            class="font-input"
            rows="3"
            @keyup.enter.prevent="saveFontEdit"
          ></textarea>
          <div class="font-edit-buttons">
            <button class="save-button" type="button" @click="saveFontEdit">
              {{ $t('settings.font_edit.save') }}
            </button>
            <button
              class="cancel-button"
              type="button"
              @click="showFontEdit = false"
            >
              {{ $t('settings.font_edit.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
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
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { useSettings } from '../composables/useSettings'
import { acquireOverlayLock, releaseOverlayLock } from '../utils/overlayStack'
import DialogBox from './DialogBox.vue'

const { defaultSettings } = useSettings()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: Object,
    required: true,
  },
  hexValue: {
    type: String,
    default: '',
  },
  width: {
    type: Number,
    default: 16,
  },
  displayMode: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue', 'update:settings'])
const modalRef = ref<HTMLElement | null>(null)
let registered = false
let previouslyFocused: HTMLElement | null = null

const closeModal = (): void => emit('update:modelValue', false)

watch(
  () => props.modelValue,
  (open) => {
    if (open && !registered) {
      registered = true
      previouslyFocused = document.activeElement as HTMLElement | null
      acquireOverlayLock()
      void nextTick(() => {
        ;(
          modalRef.value?.querySelector<HTMLElement>(
            'select, input, textarea, button, [tabindex]:not([tabindex="-1"])',
          ) ?? modalRef.value
        )?.focus()
      })
    } else if (!open && registered) {
      registered = false
      releaseOverlayLock()
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (registered) releaseOverlayLock()
})

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (showFontEdit.value) showFontEdit.value = false
    else closeModal()
    return
  }
  if (event.key !== 'Tab' || !modalRef.value) return
  const focusable = Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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

const showFontEdit = ref(false)
const tempFont = ref('')

const openFontEdit = () => {
  tempFont.value = props.settings.browserPreviewFont
  showFontEdit.value = true
}

const saveFontEdit = () => {
  emit('update:settings', {
    ...props.settings,
    browserPreviewFont: tempFont.value,
  })
  showFontEdit.value = false
}

const showResetDialog = ref(false)

const showResetConfirm = () => {
  showResetDialog.value = true
}

const confirmReset = () => {
  emit('update:settings', { ...defaultSettings })
  showResetDialog.value = false
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--modal-overlay);
  z-index: 998;
}

.settings-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--background-light);
  padding: 5px 30px 25px;
  border-radius: 10px;
  box-shadow: 0 8px 16px var(--modal-shadow);
  z-index: 999;
  width: min(
    25em,
    calc(
      100vw - max(1.5rem, env(safe-area-inset-left)) -
        max(1.5rem, env(safe-area-inset-right))
    )
  );
  max-height: calc(
    100dvh - max(1.5rem, env(safe-area-inset-top)) -
      max(1.5rem, env(safe-area-inset-bottom))
  );
  overflow: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.modal-title {
  font-size: 1.8em;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 20px;
  text-align: center;
}

.setting-option {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-option label,
#browserFont {
  font-size: 1em;
  color: var(--text-secondary);
}

.setting-option select {
  padding: 5px;
  font-size: 1em;
  border: 1px solid var(--input-border);
  border-radius: 5px;
  width: 60%;
  background-color: var(--input-background);
  color: var(--text-color);
}

.setting-option select:focus {
  border-color: var(--input-focus-border);
}

.font-input {
  width: 100%;
  height: 20em;
  font-size: 1em;
  font-family: var(--monospace-font);
  border: 1px solid var(--input-border);
  border-radius: 5px;
  background-color: var(--input-background);
  color: var(--text-color);
  margin-bottom: 10px;
}

.font-input:focus {
  border-color: var(--input-focus-border);
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-color);
}

.setting-option input[type='checkbox'] {
  accent-color: var(--primary-color);
}

.close-button {
  margin: 0;
  width: 40%;
  padding: 10px 0;
  font-size: 1.1em;
  font-weight: bold;
  color: white;
  background-color: var(--primary-color);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.close-button:hover {
  background-color: var(--primary-dark);
}

.settings-group h3 {
  color: var(--text-color);
}

.form-group label {
  color: var(--text-secondary);
}

select,
input[type='number'] {
  background-color: var(--background-light);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

select:focus,
input[type='number']:focus {
  border-color: var(--border-hover);
}

.font-button {
  width: 60%;
  padding: 5px;
  font-size: 1em;
  border: 1px solid var(--input-border);
  border-radius: 5px;
  background-color: var(--input-background);
  color: var(--text-color);
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-button:hover {
  border-color: var(--input-focus-border);
}

.font-edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--modal-overlay);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.font-edit-content {
  background: var(--background-light);
  padding: 25px;
  border-radius: 10px;
  min-width: 350px;
  max-width: 90%;
  box-shadow: 0 4px 6px var(--modal-shadow);
  border: 1px solid var(--border-color);
}

.font-edit-content h3 {
  margin: 0 0 20px 0;
  color: var(--text-color);
  font-size: 1.2em;
}

.font-edit-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.save-button,
.cancel-button {
  padding: 8px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.save-button {
  background-color: var(--primary-color);
  color: white;
}

.save-button:hover {
  background-color: var(--primary-dark);
}

.cancel-button {
  background-color: var(--danger-color);
  color: white;
}

.cancel-button:hover {
  background-color: var(--danger-hover);
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.reset-button {
  width: 40%;
  padding: 10px 0;
  font-size: 1.1em;
  font-weight: bold;
  color: white;
  background-color: var(--danger-color);
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.reset-button:hover {
  background-color: var(--danger-hover);
}

@media (max-width: 719px) {
  .settings-modal {
    width: calc(
      100vw - max(1rem, env(safe-area-inset-left)) -
        max(1rem, env(safe-area-inset-right))
    );
    padding: 5px 10px 20px;
  }

  .setting-option {
    margin: 10px;
  }

  .setting-option label,
  #browserFont {
    font-size: 1.1em;
    margin-left: 5px;
  }

  .setting-option select {
    font-size: 1em;
    padding: 5px 0;
  }

  .setting-option input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.5rem;
  }

  .font-edit-content {
    padding: 20px;
    min-width: 280px;
  }

  .font-input {
    font-size: 1.1em;
  }

  .font-button {
    font-size: 1em;
    padding: 5px;
  }
}
</style>
