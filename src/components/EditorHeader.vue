<template>
  <div class="header">
    <img src="/icon.png" alt="UniCucumber" class="logo" />
    <h1 class="title"><span style="color: #000">Uni</span>Cucumber</h1>
  </div>
  <div class="modal-buttons">
    <button @click="$emit('openSettings')" class="modal-button">
      <span class="material-symbols-outlined bold">settings</span>
    </button>
    <button @click="$emit('toggleSidebar')" class="modal-button">
      <span class="material-symbols-outlined bold">glyphs</span>
    </button>
    <button @click="toggleTheme" class="modal-button">
      <span class="material-symbols-outlined bold">{{
        isDark ? 'light_mode' : 'dark_mode'
      }}</span>
    </button>
    <a href="https://github.com/SkyEye-FAST/unicucumber" class="github-link">
      <div class="github-icon"></div>
    </a>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme, initTheme } = useTheme()
defineEmits(['openSettings', 'toggleSidebar'])

onMounted(() => {
  initTheme()
})
</script>

<style scoped>
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
  padding-top: 5px;
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

.github-link {
  margin: 0 10px;
  padding: 5px;
  transform: translateY(-0.2em);
}

.github-icon {
  width: 1.5em;
  height: 1.5em;
  mask: url('/github-icon.svg') center / contain no-repeat;
  background-color: var(--text-secondary);
}

.github-icon:hover {
  background-color: var(--primary-color);
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .modal-button {
    padding: 5px 10px;
    font-size: 2em;
  }

  .github-icon {
    width: 2.1em;
    padding: 5px 10px;
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

  .github-icon {
    width: 3.2em;
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
