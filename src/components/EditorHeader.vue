<template>
  <header class="editor-header">
    <div class="header">
      <img src="@/assets/icon.png" alt="UniCucumber" class="logo" />
      <h1 class="title"><span style="color: #000">Uni</span>Cucumber</h1>
    </div>
    <div class="modal-buttons">
      <button
        class="modal-button"
        :aria-label="$t('header.open_settings')"
        @click="$emit('openSettings')"
      >
        <i-material-symbols-settings class="icon" />
      </button>
      <button
        class="modal-button"
        :aria-label="$t('header.open_glyph_manager')"
        @click="$emit('toggleSidebar')"
      >
        <i-material-symbols-glyphs class="icon" />
      </button>
      <button
        class="modal-button"
        :aria-label="$t('header.toggle_theme')"
        @click="toggleTheme"
      >
        <i-material-symbols-light-mode v-if="isDark" class="icon" />
        <i-material-symbols-dark-mode v-else class="icon" />
      </button>
      <a
        class="modal-button"
        href="https://github.com/SkyEye-FAST/unicucumber"
        :aria-label="$t('header.github')"
      >
        <i-fa6-brands-github class="icon" style="transform: translateY(-3px)" />
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme, initTheme } = useTheme()
const { t: $t } = useI18n()
defineEmits(['openSettings', 'toggleSidebar'])

onMounted(() => {
  initTheme()
})
</script>

<style scoped>
.editor-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  display: flex;
  align-items: center;
}

.logo {
  width: 2.5em;
  height: 2.5em;
  margin-right: 10px;
  margin-top: 20px;
}

.title {
  font-family: 'Noto Sans', sans-serif;
  font-size: 2em;
  color: var(--primary-color);
  margin-bottom: 5px;
}

.modal-buttons {
  background-color: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 4px var(--modal-shadow);
  display: flex;
  margin: 5px;
  align-items: center;
  flex-direction: row;
}

.modal-button {
  color: var(--text-secondary);
  background-color: inherit;
  font-size: 1.5em;
  padding: 5px;
  margin: 0 10px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
}

.modal-button:hover {
  color: var(--primary-color);
}

@media (max-width: 720px), (pointer: coarse) {
  .header {
    height: 2.6rem;
  }

  .logo {
    width: 2rem;
    height: 2rem;
    margin-top: 0;
    margin-right: 0.45rem;
  }

  .title {
    margin: 0;
    font-size: 1.65rem;
    line-height: 1;
  }

  .modal-buttons {
    margin: 0.1rem 0 0.25rem;
  }

  .modal-button {
    min-width: 44px;
    min-height: 44px;
    margin: 0 0.15rem;
    padding: 0.3rem;
    font-size: 1.3rem;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .modal-button {
    padding: 5px 10px;
    font-size: 2em;
  }

  .title {
    font-size: 3em;
  }

  .logo {
    width: 3.5em;
    height: 3.5em;
    margin-top: 30px;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .modal-button {
    font-size: 3em;
    padding: 10px 15px;
  }

  .title {
    font-size: 4em;
  }

  .logo {
    width: 5em;
    height: 5em;
    margin-top: 40px;
  }
}
</style>
