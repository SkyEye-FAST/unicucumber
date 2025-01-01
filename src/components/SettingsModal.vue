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
      <label for="browserFont">{{ $t('settings.browser_preview_font') }}</label>
      <input
        type="text"
        id="browserFont"
        class="font-input"
        :value="settings.browserPreviewFont"
        @change="
          $emit('update:settings', {
            ...settings,
            browserFont: $event.target.value,
          })
        "
      />
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

    <button @click="$emit('update:modelValue', false)" class="close-button">
      {{ $t('settings.close') }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: Object,
    required: true,
  },
})

defineEmits(['update:modelValue', 'update:settings'])
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
  background: white;
  padding: 5px 30px 25px;
  border-radius: 10px;
  box-shadow: 0 8px 16px var(--shadow-color);
  z-index: 999;
  width: 20em;
  display: flex;
  flex-direction: column;
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

.setting-option label {
  font-size: 1em;
  color: var(--text-secondary);
}

.setting-option select {
  padding: 5px;
  font-size: 1em;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  width: 60%;
}

.font-input {
  font-family: var(--monospace-font);
  width: 60%;
  padding: 5px;
  font-size: 1em;
  border: 1px solid var(--border-color);
  border-radius: 5px;
}

.close-button {
  margin: 20px auto 0;
  width: 60%;
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

.close-button:hover {
  background-color: var(--danger-hover);
}

@media (orientation: portrait) and (max-width: 768px) {
  .setting-option {
    margin: 10px;
  }

  .setting-option label {
    font-size: 1.1em;
    margin-left: 5px;
  }

  .setting-option select {
    font-size: 1.1em;
    padding: 10px 0;
    margin-right: 10px;
  }

  .setting-option input[type='checkbox'] {
    transform: scale(1.5);
    transform-origin: 0 0;
    margin-right: 1.5em;
    margin-bottom: 10px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .settings-modal {
    width: 40em;
  }

  .modal-title {
    font-size: 2.5em;
  }

  .setting-option label {
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
    margin-right: 8em;
    margin-bottom: 1.5em;
  }

  .close-button {
    font-size: 1.8em;
    padding: 15px 0;
    margin-bottom: 30px;
  }

  .font-input {
    font-size: 1.8em;
    padding: 15px;
    margin-right: 20px;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .settings-modal {
    width: 45em;
  }

  .modal-title {
    font-size: 3em;
  }

  .setting-option label {
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
    margin-right: 10px;
  }

  .close-button {
    font-size: 2em;
    padding: 15px 0;
    margin-bottom: 40px;
  }

  .font-input {
    font-size: 2.2em;
    padding: 20px;
    margin-right: 20px;
  }
}
</style>
