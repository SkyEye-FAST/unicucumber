<template>
  <header class="editor-header">
    <div class="brand">
      <img src="@/assets/icon.png" alt="UniCucumber" class="logo" />
      <h1 class="title"><span class="title-prefix">Uni</span>Cucumber</h1>
    </div>
    <div class="modal-buttons">
      <button
        class="modal-button ui-icon-button"
        type="button"
        :aria-label="$t('header.open_settings')"
        @click="$emit('openSettings')"
      >
        <i-material-symbols-settings class="icon" />
      </button>
      <button
        class="modal-button ui-icon-button"
        type="button"
        :aria-label="$t('header.open_glyph_manager')"
        @click="$emit('toggleSidebar')"
      >
        <i-material-symbols-glyphs class="icon" />
      </button>
      <button
        class="modal-button ui-icon-button"
        type="button"
        :aria-label="$t('header.toggle_theme')"
        @click="toggleTheme"
      >
        <i-material-symbols-light-mode v-if="isDark" class="icon" />
        <i-material-symbols-dark-mode v-else class="icon" />
      </button>
      <a
        class="modal-button ui-icon-button"
        href="https://github.com/SkyEye-FAST/unicucumber"
        :aria-label="$t('header.github')"
      >
        <i-fa6-brands-github class="icon" />
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
  box-sizing: border-box;
  width: min(100%, var(--workspace-max));
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 3.5rem;
  padding: 0.25rem 0 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.brand {
  display: flex;
  align-items: center;
  min-width: 0;
}

.logo {
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  margin-right: 0.55rem;
}

.title {
  margin: 0;
  font-family: var(--normal-font);
  font-size: clamp(1.45rem, 2.5vw, 1.9rem);
  font-weight: 750;
  line-height: 1;
  color: var(--primary-color);
  letter-spacing: -0.035em;
  white-space: nowrap;
}

.title-prefix {
  color: var(--text-color);
}

.modal-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.modal-button {
  color: var(--text-secondary);
  text-decoration: none;
}

.modal-button .icon {
  display: block;
  flex: none;
  line-height: 1;
}

.modal-button:hover {
  color: var(--primary-color);
}

@media (max-width: 719px) {
  .editor-header {
    min-height: 3rem;
    gap: 0.35rem;
    padding: 0.15rem 0 0.45rem;
  }

  .logo {
    width: 1.75rem;
    height: 1.75rem;
    margin-right: 0.3rem;
  }

  .title {
    font-size: clamp(1.05rem, 5.2vw, 1.35rem);
  }

  .modal-buttons {
    gap: 0.2rem;
  }

  .modal-button {
    width: 2.25rem;
    min-width: 2.25rem;
    min-height: 2.25rem;
  }

  .modal-button .icon {
    font-size: 1.2rem;
  }
}
</style>
