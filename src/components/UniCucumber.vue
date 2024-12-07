<template>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="/icon.png" alt="UniCucumber" class="logo" />
      <h1 class="title"><span style="color: #000">Uni</span>Cucumber</h1>
    </div>

    <!-- Modal buttons -->
    <div class="modal-buttons">
      <button @click="toggleSettings(true)" class="modal-button">
        <span class="material-symbols-outlined bold">settings</span>
      </button>
      <a href="https://github.com/SkyEye-FAST/unicucumber" class="github-link">
        <img src="/github-icon.svg" alt="GitHub" class="github-icon" />
      </a>
    </div>

    <!-- Overlay for settings -->
    <div v-if="showSettings" class="overlay" @click="toggleSettings(false)"></div>

    <!-- Settings modal -->
    <div v-if="showSettings" class="settings-modal">
      <h2 class="modal-title">{{ $t('settings.title') }}</h2>
      <div class="setting-option">
        <label for="drawMode">{{ $t('settings.draw_mode.label') }}</label>
        <select id="drawMode" v-model="drawMode" @change="saveSettings">
          <option value="doubleButtonDraw">{{ $t('settings.draw_mode.double_button') }}</option>
          <option value="singleButtonDraw">{{ $t('settings.draw_mode.single_button') }}</option>
        </select>
      </div>
      <div class="setting-option">
        <label for="cursorEffect">{{ $t('settings.cursor_effect') }}</label>
        <input type="checkbox" id="cursorEffect" v-model="cursorEffect" @change="saveSettings" />
      </div>
      <button @click="toggleSettings(false)" class="close-button">{{ $t('settings.close') }}</button>
    </div>

    <!-- Glyph drawing area -->
    <div class="grid-container">
      <div class="header-row">
        <div class="corner-cell"></div>
        <div v-for="colIndex in 16" :key="`col-${colIndex}`" class="header-cell"
          :style="{ color: colIndex % 2 ? '#000' : '#f4005f' }">
          {{ (colIndex - 1).toString(16).toUpperCase() }}
        </div>
      </div>
      <div v-for="(row, rowIndex) in gridData" :key="`row-${rowIndex}`" class="grid-row">
        <div class="header-cell" :style="{ color: rowIndex % 2 ? '#f4005f' : '#000' }">
          {{ rowIndex.toString(16).toUpperCase() }}
        </div>
        <div v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`"
          :class="['cell', { filled: cell === 1 }]" :style="getCellStyle(rowIndex, cellIndex)"
          @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)" @mouseover="handleHover(rowIndex, cellIndex)"
          @mouseleave="clearHover" @mouseup="stopDrawing" @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"></div>
      </div>
    </div>

    <!-- Tool buttons -->
    <div class="tool-buttons">
      <button @click="setDrawValue(1)" :class="{ active: drawValue === 1 }" class="tool-button">
        <span class="material-symbols-outlined">draw</span>
      </button>
      <button @click="setDrawValue(0)" :class="{ active: drawValue === 0 }" class="tool-button">
        <span class="material-symbols-outlined">ink_eraser</span>
      </button>
    </div>

    <!-- Hex code container -->
    <div class="hex-code-container">
      <input v-model="hexCode" @input="updateGridFromHex" id="hexInput" class="hex-input" maxlength="64"
        placeholder="Enter .hex format string (32 or 64 characters)" />
      <button @click="copyHex" class="copy-button">
        <span class="material-symbols-outlined">{{ copyIcon }}</span>
      </button>
    </div>

    <!-- Download buttons -->
    <div class="download-buttons">
      <button @click="downloadAsPNG" class="download-button">
        <span class="material-symbols-outlined">download</span><br>
        <span style="font-size: smaller;">PNG</span>
      </button>
      <button @click="downloadAsBMP" class="download-button">
        <span class="material-symbols-outlined">download</span><br>
        <span style="font-size: smaller;">BMP</span>
      </button>
      <button @click="downloadAsSVG" class="download-button">
        <span class="material-symbols-outlined">download</span><br>
        <span style="font-size: smaller;">SVG</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const gridData = ref(Array.from({ length: 16 }, () => Array(16).fill(0)));
const hexCode = ref("");
const copyIcon = ref("content_copy");
const isDrawing = ref(false);
const drawValue = ref(1);
const hoverCell = ref({ row: -1, col: -1 });
const showSettings = ref(false);
const drawMode = ref(localStorage.getItem("drawMode") || "singleButtonDraw");
const cursorEffect = ref(JSON.parse(localStorage.getItem("cursorEffect")) ?? true);

const startDrawing = (rowIndex, cellIndex, event) => {
  isDrawing.value = true;
  if (drawMode.value === "doubleButtonDraw") {
    drawValue.value = event.button === 2 ? 0 : 1;
  }
  updateCell(rowIndex, cellIndex, drawValue.value);
};

const stopDrawing = () => {
  isDrawing.value = false;
};

const handleHover = (rowIndex, cellIndex) => {
  if (isDrawing.value) {
    updateCell(rowIndex, cellIndex, drawValue.value);
  } else {
    hoverCell.value = { row: rowIndex, col: cellIndex };
  }
};

const clearHover = () => {
  hoverCell.value = { row: -1, col: -1 };
};

const updateCell = (rowIndex, cellIndex, value) => {
  gridData.value[rowIndex][cellIndex] = value;
  updateHexCode();
};

const getCellStyle = (rowIndex, cellIndex) => {
  return cursorEffect.value && hoverCell.value.row === rowIndex && hoverCell.value.col === cellIndex
    ? { backgroundColor: drawValue.value === 1 ? 'black' : 'white' }
    : {};
};

const getCellIndex = (target) => {
  const cellIndex = Array.from(target.parentNode.children).indexOf(target) - 1;
  const rowIndex = Array.from(target.parentNode.parentNode.children).indexOf(target.parentNode) - 1;
  return { rowIndex, cellIndex };
};

const handleTouchStart = (event) => {
  const touch = event.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target && target.classList.contains("cell")) {
    const { rowIndex, cellIndex } = getCellIndex(target);
    startDrawing(rowIndex, cellIndex, event);
  }
};

const handleTouchMove = (event) => {
  const touch = event.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target && target.classList.contains("cell")) {
    const { rowIndex, cellIndex } = getCellIndex(target);
    if (rowIndex >= 0 && cellIndex >= 0) {
      updateCell(rowIndex, cellIndex, drawValue.value);
    }
  }
};

const setDrawValue = (value) => {
  drawValue.value = value;
};

const toggleSettings = (state) => {
  showSettings.value = state;
};

const saveSettings = () => {
  localStorage.setItem("drawMode", drawMode.value);
  localStorage.setItem("cursorEffect", JSON.stringify(cursorEffect.value));
};

const updateHexCode = () => {
  let binaryString = gridData.value.flat().map(cell => (cell === 1 ? "1" : "0")).join("");
  hexCode.value = binaryToHex(binaryString);
};

const hexToBinary = (hexString) => {
  return hexString.split("").map(char => parseInt(char, 16).toString(2).padStart(4, '0')).join("");
};

const binaryToHex = (binaryString) => {
  return Array.from({ length: Math.ceil(binaryString.length / 4) }, (_, i) => {
    let nibble = binaryString.slice(i * 4, i * 4 + 4);
    return parseInt(nibble, 2).toString(16).toUpperCase();
  }).join("");
};

const updateGridFromHex = () => {
  if (!/^[0-9A-F]{32,64}$/i.test(hexCode.value)) {
    resetGrid();
    return;
  }
  let binaryString = hexToBinary(hexCode.value);
  binaryString.split("").forEach((bit, index) => {
    const row = Math.floor(index / 16);
    const col = index % 16;
    gridData.value[row][col] = parseInt(bit, 10);
  });
};

const resetGrid = () => {
  gridData.value = Array.from({ length: 16 }, () => Array(16).fill(0));
};

const copyHex = async () => {
  await navigator.clipboard.writeText(hexCode.value);
  copyIcon.value = 'check';
  setTimeout(() => { copyIcon.value = 'content_copy'; }, 1500);
};

const downloadAsPNG = async () => {
  const canvas = createCanvasFromGrid();
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'glyph.png';
  link.click();
};

const downloadAsBMP = async () => {
  const canvas = createCanvasFromGrid();
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const bmpBlob = await convertToBMP(imageData);
  triggerDownload(bmpBlob, 'glyph.bmp');
};

const downloadAsSVG = () => {
  const svg = createSVGFromGrid();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(svgBlob, 'glyph.svg');
};

const triggerDownload = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const createCanvasFromGrid = () => {
  const canvas = document.createElement('canvas');
  canvas.width = gridData.value[0].length;
  canvas.height = gridData.value.length;
  const context = canvas.getContext('2d');
  gridData.value.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      context.fillStyle = cell === 1 ? '#000' : '#FFF';
      context.fillRect(colIndex, rowIndex, 1, 1);
    });
  });
  return canvas;
};

const convertToBMP = (imageData) => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  context.putImageData(imageData, 0, 0);
  return new Promise(resolve => {
    canvas.toBlob(resolve, 'image/bmp');
  });
};

const createSVGFromGrid = () => {
  const cellSize = 1;
  const width = gridData.value[0].length;
  const height = gridData.value.length;
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  gridData.value.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        svgContent += `<rect x="${colIndex}" y="${rowIndex}" width="${cellSize}" height="${cellSize}" fill="black" />`;
      }
    });
  });
  return svgContent + '</svg>';
};

onMounted(() => {
  updateHexCode();
  document.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("mouseup", stopDrawing);
  window.addEventListener("touchend", stopDrawing);
});

onBeforeUnmount(() => {
  window.removeEventListener("mouseup", stopDrawing);
  window.removeEventListener("touchend", stopDrawing);
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Fira Code", monospace;
  background-color: #f2f2f2;
  padding: 20px;
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
  font-family: "Noto Sans", sans-serif;
  font-size: 2em;
  color: #4ea72e;
  margin-bottom: 5px;
}

.modal-buttons {
  display: flex;
  margin-bottom: 5px;
  align-items: center;
  flex-direction: row;
}

.modal-button {
  color: #196b24;
  background-color: inherit;
  font-size: 1.8em;
  padding: 5px;
  margin: 0 10px;
  cursor: pointer;
  border: none;
  transition: color 0.3s ease;
}

.github-link {
  transform: translateY(0.1em)
}

@-moz-document url-prefix() {
  .github-icon {
    vertical-align: middle;
  }
}

.github-icon {
  width: 1.4em;
  padding: 5px;
  margin: 0 10px;
}

.grid-container {
  display: grid;
  grid-template-columns: var(--cell-size) repeat(16, var(--cell-size));
  gap: 0;
  padding-right: calc(var(--cell-size) * 0.5);
}

.header-row {
  display: contents;
}

.grid-row {
  display: contents;
}

.corner-cell {
  width: var(--cell-size);
  height: var(--cell-size);
}

.header-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  font-family: "Fira Code", monospace;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background-color: #fff;
  border: 0.5px solid #196b24;
  cursor: pointer;
}

.cell.filled {
  background-color: black;
}

.tool-buttons {
  display: flex;
  margin: 30px 0 15px 0;
}

.tool-button {
  font-size: 1.5em;
  padding: 5px 10px;
  border: transparent 2px solid;
  background-color: #ddd;
  cursor: pointer;
  width: 8em;
}

.tool-button.active {
  background: #4ea72e;
  color: #fff;
}

.tool-button:hover {
  border: #0c4461 2px solid;
}

.hex-code-container {
  width: 25em;
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.hex-input {
  width: 100%;
  padding: 8px;
  font-family: "Fira Code", monospace;
  font-size: 1em;
  border: 2px solid #000;
}

.copy-button {
  margin-left: 5px;
  padding: 6px 15px;
  font-family: "Fira Code", monospace;
  font-size: 0.9em;
  background-color: #4ea72e;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.copy-button:hover {
  background-color: #3d8b25;
}

.download-buttons {
  display: flex;
  margin: 30px 0 15px 0;
}

.download-button {
  font-family: 'Noto Sans', sans-serif;
  font-size: 1.2em;
  margin: 0 16px;
  padding: 5px 0;
  border: transparent 2px solid;
  background-color: #4ea72e;
  color: #fff;
  cursor: pointer;
  width: 5em;
  transition: background-color 0.3s ease;
}

.download-button:hover {
  background-color: #3d8b25;
}

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
  color: #333;
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
  color: #444;
}

#drawMode,
#cursorEffect {
  padding: 5px;
  font-size: 1em;
  border: 1px solid #ddd;
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
  .hex-code-container {
    width: 20em;
  }

  .tool-button {
    width: 7em;
  }

  .cell {
    border-width: 0.2px;
  }

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

  #drawMode {
    font-size: 1.1em;
    padding: 10px 0;
  }

  #cursorEffect {
    zoom: 150%;
  }

  .download-button {
    font-size: 1.2em;
    margin: 0 10px;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .material-symbols-outlined {
    font-size: larger;
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

  .header-cell {
    font-size: 1.5em;
  }

  .cell {
    border-width: 0.3px;
  }

  .hex-code-container {
    width: 35em;
  }

  .tool-button {
    font-size: 2em;
    width: 8em;
  }

  .modal-button {
    padding: 5px 10px;
    font-size: 2em;
  }

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

  #drawMode {
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

  .hex-input {
    padding: 10px 0;
    font-size: 1.5em;
  }

  .copy-button {
    padding: 10px 20px;
    font-size: 1.5em;
  }

  .download-button {
    font-size: 1.8em;
    width: 4.5em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .material-symbols-outlined {
    font-size: larger;
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

  .header-cell {
    font-size: 2em;
  }

  .hex-code-container {
    width: 50em;
  }

  .tool-button {
    font-size: 3em;
    width: 8em;
  }

  .modal-button {
    font-size: 3em;
    padding: 10px 15px;
  }

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

  #drawMode {
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

  .hex-input {
    padding: 10px 0;
    font-size: 2em;
  }

  .copy-button {
    padding: 10px 35px;
    font-size: 2em;
  }

  .download-button {
    font-size: 2.2em;
    width: 5em;
  }
}
</style>
