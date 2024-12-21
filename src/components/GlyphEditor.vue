<template>
  <div class="container">
    <EditorHeader @openSettings="showSettings = true" />
    <SettingsModal v-model:show="showSettings" v-model:drawMode="drawMode" v-model:cursorEffect="cursorEffect"
      @save="saveSettings" />
    <GlyphGrid :gridData="gridData" :drawMode="drawMode" :drawValue="drawValue" :cursorEffect="cursorEffect"
      @update:cell="updateCell" />
    <ToolButtons v-model:modelValue="drawValue" />
    <HexCodeInput v-model:hexCode="hexCode" @update:grid="updateGridFromHex" />
    <DownloadButtons :gridData="gridData" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import EditorHeader from './EditorHeader.vue';
import SettingsModal from './SettingsModal.vue';
import GlyphGrid from './GlyphGrid.vue';
import ToolButtons from './ToolButtons.vue';
import HexCodeInput from './HexCodeInput.vue';
import DownloadButtons from './DownloadButtons.vue';
import { useSettings } from '@/composables/useSettings';
import { useGridData } from '@/composables/useGridData';
import { useHexCode } from '@/composables/useHexCode';

const { drawMode, cursorEffect, showSettings, saveSettings } = useSettings();
const { gridData, updateCell, resetGrid } = useGridData();
const { hexCode, updateHexCode, updateGridFromHex } = useHexCode(gridData, resetGrid);
const drawValue = ref(1);

const preventDefault = (e) => e.preventDefault();

onMounted(() => {
  updateHexCode();
  document.addEventListener("contextmenu", preventDefault);
});

onBeforeUnmount(() => {
  document.removeEventListener("contextmenu", preventDefault);
});
</script>
