<template>
  <div class="header">
    <img src="/icon.png" alt="UniCucumber" class="logo" />
    <h1 class="title"><span style="color: #000">Uni</span>Cucumber</h1>
  </div>
  <div class="modal-buttons">
    <button @click="$emit('openSettings')" class="modal-button">
      <span class="material-symbols-outlined bold">settings</span>
    </button>
    <a href="https://github.com/SkyEye-FAST/unicucumber" class="github-link">
      <img src="/github-icon.svg" alt="GitHub" class="github-icon" />
    </a>
  </div>
</template>

<script setup>
defineEmits(['openSettings']);
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
  font-family: "Noto Sans", sans-serif;
  font-size: 2em;
  color: var(--primary-color);
  margin-bottom: 5px;
}

.modal-buttons {
  display: flex;
  margin-bottom: 5px;
  align-items: center;
  flex-direction: row;
}

.modal-button {
  color: var(--primary-darker);
  background-color: inherit;
  font-size: 1.8em;
  padding: 5px;
  margin: 0 10px;
  cursor: pointer;
  border: none;
  transition: color 0.3s ease;
}

.github-link {
  transform: translateY(0.1em);
}

.github-icon {
  width: 1.4em;
  padding: 5px;
  margin: 0 10px;
}

@-moz-document url-prefix() {
  .github-icon {
    vertical-align: middle;
  }
}
</style>
