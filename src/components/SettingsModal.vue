<template>
  <div v-if="show" class="overlay" @click="$emit('update:show', false)"></div>
  <div v-if="show" class="settings-modal">
    <h2 class="modal-title">{{ $t('settings.title') }}</h2>
    <div class="setting-option">
      <label for="drawMode">{{ $t('settings.draw_mode.label') }}</label>
      <select id="drawMode" :value="drawMode" @change="$emit('update:drawMode', $event.target.value)">
        <option value="doubleButtonDraw">{{ $t('settings.draw_mode.double_button') }}</option>
        <option value="singleButtonDraw">{{ $t('settings.draw_mode.single_button') }}</option>
      </select>
    </div>
    <div class="setting-option">
      <label for="cursorEffect">{{ $t('settings.cursor_effect') }}</label>
      <input type="checkbox" id="cursorEffect" :checked="cursorEffect"
        @change="$emit('update:cursorEffect', $event.target.checked)" />
    </div>
    <div class="setting-option">
      <label for="glyphWidth">字形宽度</label>
      <select id="glyphWidth" :value="glyphWidth" @change="$emit('update:glyphWidth', parseInt($event.target.value))">
        <option value="8">8 像素</option>
        <option value="16">16 像素</option>
      </select>
    </div>
    <button @click="$emit('update:show', false)" class="close-button">
      {{ $t('settings.close') }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  drawMode: {
    type: String,
    default: 'doubleButtonDraw'
  },
  cursorEffect: {
    type: Boolean,
    default: false
  },
  glyphWidth: {
    type: Number,
    default: 16
  }
});

defineEmits(['update:show', 'update:drawMode', 'update:cursorEffect', 'update:glyphWidth', 'save']);
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.settings-modal {
  font-family: "Noto Sans", sans-serif;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 5px 30px 25px;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
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

#drawMode,
#cursorEffect,
#glyphWidth {
  padding: 5px;
  font-size: 1em;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  width: 60%;
}

.close-button {
  margin: 20px auto 0;
  width: 60%;
  padding: 10px 0;
  font-size: 1.1em;
  font-weight: bold;
  color: #fff;
  background-color: #ff5449;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.close-button:hover {
  background-color: #ff6b66;
}

@media (orientation: portrait) and (max-width: 768px) {
  .settings-modal {
    padding: 10px 20px 20px;
  }

  .setting-option {
    margin: 10px;
  }

  .setting-option label {
    font-size: 1.1em;
    margin-left: 5px;
  }

  #drawMode,
  #glyphWidth {
    font-size: 1.1em;
    padding: 10px 0;
  }

  #cursorEffect {
    zoom: 150%;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .settings-modal {
    width: 40em;
  }

  .setting-option {
    margin: 20px 25px 20px;
  }

  .modal-title {
    font-size: 3em;
  }

  .setting-option label {
    font-size: 2em;
    margin-left: 30px;
  }

  #drawMode,
  #glyphWidth {
    font-size: 2em;
    padding: 10px 0;
  }

  #cursorEffect {
    zoom: 250%;
  }

  .close-button {
    font-size: 2em;
    padding: 15px 0;
    margin-bottom: 30px;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .settings-modal {
    width: 45em;
  }

  .setting-option {
    margin: 20px 20px 20px;
  }

  .modal-title {
    font-size: 3.5em;
  }

  .setting-option label {
    font-size: 2.2em;
    margin-left: 30px;
  }

  #drawMode,
  #glyphWidth {
    font-size: 2.2em;
    padding: 10px 0;
  }

  #cursorEffect {
    zoom: 300%;
  }

  .close-button {
    font-size: 2.5em;
    padding: 15px 0;
    margin-bottom: 40px;
  }
}
</style>
