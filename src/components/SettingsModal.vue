<template>
  <div
    v-if="modelValue"
    class="overlay"
    @click="$emit('update:modelValue', false)"
  ></div>
  <div v-if="modelValue" class="settings-modal">
    <h2 class="modal-title">{{ $t('settings.title') }}</h2>

    <div class="setting-option">
      <label for="drawMode">{{ $t('settings.draw_mode.label') }}</label>
      <select
        id="drawMode"
        :value="settings.drawMode"
        @change="
          $emit('update:settings', {
            ...settings,
            drawMode: $event.target.value,
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

    <div class="setting-option">
      <label for="cursorEffect">{{ $t('settings.cursor_effect') }}</label>
      <div class="checkbox-wrapper">
        <input
          type="checkbox"
          id="cursorEffect"
          :checked="settings.cursorEffect"
          @change="
            $emit('update:settings', {
              ...settings,
              cursorEffect: $event.target.checked,
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
            glyphWidth: parseInt($event.target.value),
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
            glyphPreviewMode: $event.target.value,
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
      <button class="font-button" @click="openFontEdit">
        {{ settings.browserPreviewFont }}
      </button>
    </div>

    <div class="setting-option">
      <label for="showBorder">{{ $t('settings.show_border') }}</label>
      <div class="checkbox-wrapper">
        <input
          type="checkbox"
          id="showBorder"
          :checked="settings.showBorder"
          @change="
            $emit('update:settings', {
              ...settings,
              showBorder: $event.target.checked,
            })
          "
        />
      </div>
    </div>

    <div class="setting-option">
      <label for="confirmClear">{{ $t('settings.confirm_clear') }} </label>
      <input
        type="checkbox"
        id="confirmClear"
        :checked="settings.confirmClear"
        @change="
          $emit('update:settings', {
            ...settings,
            confirmClear: $event.target.checked,
          })
        "
      />
    </div>

    <div class="button-group">
      <button @click="showResetConfirm" class="reset-button">
        {{ $t('settings.reset') }}
      </button>
      <button @click="$emit('update:modelValue', false)" class="close-button">
        {{ $t('settings.close') }}
      </button>
    </div>

    <div v-if="showFontEdit" class="font-edit-modal">
      <div class="font-edit-content">
        <h3>{{ $t('settings.font_edit.title') }}</h3>
        <textarea
          v-model="tempFont"
          class="font-input"
          @keyup.enter.prevent="saveFontEdit"
          rows="3"
        ></textarea>
        <div class="font-edit-buttons">
          <button @click="saveFontEdit" class="save-button">
            {{ $t('settings.font_edit.save') }}
          </button>
          <button @click="showFontEdit = false" class="cancel-button">
            {{ $t('settings.font_edit.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <DialogBox
    :show="showResetDialog"
    :title="$t('dialog.settings_reset.title')"
    :message="$t('dialog.settings_reset.message')"
    :confirmText="$t('dialog.settings_reset.confirm')"
    @confirm="confirmReset"
    @cancel="showResetDialog = false"
  />
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
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
})

const emit = defineEmits(['update:modelValue', 'update:settings'])

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
  width: 20em;
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
  box-shadow: 0 0 0 2px var(--primary-color-transparent);
}

.setting-option input[type='checkbox'] {
  accent-color: var(--primary-color);
}

.close-button {
  margin: 20px auto 0;
  width: 60%;
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

.modal {
  background-color: var(--background-light);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.modal-content {
  background-color: var(--background-color);
}

.settings-group {
  border: 1px solid var(--border-color);
  background-color: var(--background-light);
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

.close-button {
  width: 40%;
  margin: 0;
}

@media (orientation: portrait) and (max-width: 768px) {
  .setting-option {
    margin: 10px;
  }

  .setting-option label,
  #browserFont {
    font-size: 1.1em;
    margin-left: 5px;
  }

  .setting-option select {
    font-size: 1.1em;
    padding: 10px 0;
  }

  .setting-option input[type='checkbox'] {
    transform: scale(1.5);
    transform-origin: 0 0;
    margin-right: 0.5em;
    margin-bottom: 10px;
  }

  .font-edit-content {
    padding: 20px;
    min-width: 280px;
  }

  .font-input {
    font-size: 1.1em;
  }

  .font-button {
    font-size: 1.1em;
    padding: 10px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .settings-modal {
    width: 40em;
  }

  .modal-title {
    font-size: 2.5em;
  }

  .setting-option label,
  #browserFont {
    font-size: 1.8em;
    margin-left: 30px;
  }

  .setting-option select {
    font-size: 1.8em;
    padding: 15px;
    margin-right: 20px;
  }

  .setting-option input[type='checkbox'] {
    transform: scale(2.5);
    transform-origin: 0 0;
    margin-right: 3em;
    margin-bottom: 1.5em;
  }

  .close-button {
    font-size: 1.8em;
    padding: 15px 0;
    margin-bottom: 30px;
  }

  .font-input {
    font-size: 1.8em;
  }

  .font-edit-content {
    min-width: 650px;
    padding: 30px;
  }

  .font-edit-content h3 {
    font-size: 2em;
    margin-bottom: 30px;
  }

  .save-button,
  .cancel-button {
    font-size: 1.5em;
    padding: 12px 25px;
  }

  .font-button {
    font-size: 1.8em;
    padding: 15px;
    margin-right: 20px;
  }

  .reset-button {
    font-size: 1.8em;
    padding: 15px 0;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .settings-modal {
    width: 45em;
  }

  .modal-title {
    font-size: 3em;
  }

  .setting-option label,
  #browserFont {
    font-size: 2.2em;
    margin-left: 30px;
  }

  .setting-option select {
    font-size: 2.2em;
    padding: 20px;
    margin-right: 20px;
  }

  .setting-option input[type='checkbox'] {
    transform: scale(3);
    transform-origin: 0 0;
    margin-right: 40px;
  }

  .close-button {
    font-size: 2em;
    padding: 15px 0;
    margin-bottom: 40px;
  }

  .font-input {
    font-size: 2.2em;
  }

  .font-edit-content {
    min-width: 750px;
    padding: 35px;
  }

  .font-edit-content h3 {
    font-size: 2.4em;
    margin-bottom: 35px;
  }

  .save-button,
  .cancel-button {
    font-size: 1.8em;
    padding: 15px 30px;
  }

  .font-button {
    font-size: 2.2em;
    padding: 20px;
    margin-right: 20px;
  }

  .reset-button {
    font-size: 2em;
    padding: 15px 0;
  }
}
</style>
