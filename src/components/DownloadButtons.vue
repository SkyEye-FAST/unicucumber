<template>
  <div class="download-buttons">
    <button v-for="format in downloadFormats" :key="format" @click="() => downloadFile(format)" class="download-button">
      <span class="material-symbols-outlined">download</span><br>
      <span style="font-size: smaller;">{{ format }}</span>
    </button>
  </div>
</template>

<script setup>
import {
  createCanvasFromGrid,
  convertToBMP,
  createSVGFromGrid
} from '../utils/exportUtils';

const props = defineProps({
  gridData: {
    type: Array,
    required: true
  }
});

const downloadFormats = ['PNG', 'BMP', 'SVG'];

const downloadFile = async (format) => {
  let blob;
  let filename;

  switch (format) {
    case 'PNG': {
      const canvas = createCanvasFromGrid(props.gridData);
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      filename = 'glyph.png';
      break;
    }
    case 'BMP': {
      const canvas = createCanvasFromGrid(props.gridData);
      const context = canvas.getContext('2d');
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      blob = await convertToBMP(imageData);
      filename = 'glyph.bmp';
      break;
    }
    case 'SVG': {
      const svg = createSVGFromGrid(props.gridData);
      blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      filename = 'glyph.svg';
      break;
    }
  }

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
.download-buttons {
  display: flex;
  margin: 30px 0 15px 0;
}

.download-button {
  font-family: 'Noto Sans', sans-serif;
  font-size: 1.2em;
  font-weight: 600;
  margin: 0 16px;
  padding: 5px 0;
  border: transparent 2px solid;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  width: 5em;
  transition: background-color 0.3s ease;
}

.download-button:hover {
  background-color: var(--primary-dark);
}

@media (orientation: portrait) and (max-width: 768px) {
  .download-button {
    font-size: 1.2em;
    margin: 0 10px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .download-button {
    font-size: 1.8em;
    width: 4.5em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .download-button {
    font-size: 2.2em;
    width: 5em;
  }
}
</style>
