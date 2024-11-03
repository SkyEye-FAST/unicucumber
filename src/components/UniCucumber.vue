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
    </div>

    <!-- Gray background overlay -->
    <div v-if="showSettings" class="overlay" @click="toggleSettings(false)"></div>
    <!-- Settings -->
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
          :style="{ color: colIndex % 2 === 1 ? '#000' : '#f4005f' }">
          {{ (colIndex - 1).toString(16).toUpperCase() }}
        </div>
      </div>
      <div v-for="(row, rowIndex) in gridData" :key="`row-${rowIndex}`" class="grid-row">
        <div class="header-cell" :style="{ color: rowIndex % 2 === 0 ? '#000' : '#f4005f' }">
          {{ rowIndex.toString(16).toUpperCase() }}
        </div>
        <div v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`"
          :class="['cell', { filled: cell === 1 }]" :style="getCellStyle(rowIndex, cellIndex)"
          @mousedown.prevent="startDrawing(rowIndex, cellIndex, $event)" @mouseover="handleHover(rowIndex, cellIndex)"
          @mouseleave="clearHover" @mouseup="stopDrawing" @touchstart.prevent="startDrawing(rowIndex, cellIndex)"
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
      <input v-model="hexCode" @input="updateGridFromHex" class="hex-input" maxlength="64"
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

<script>
export default {
  data() {
    return {
      gridData: Array.from({ length: 16 }, () => Array(16).fill(0)),
      hexCode: "",
      copyIcon: 'content_copy',
      isDrawing: false,
      drawValue: 1,
      hoverCell: { row: -1, col: -1 },
      showSettings: false,
      drawMode: localStorage.getItem("drawMode") || "singleButtonDraw",
      cursorEffect: JSON.parse(localStorage.getItem("cursorEffect")) ?? true,
    };
  },
  methods: {
    startDrawing(rowIndex, cellIndex, event) {
      this.isDrawing = true;
      if (this.drawMode === "doubleButtonDraw") {
        this.drawValue = event.button === 2 ? 0 : 1;
      }
      this.updateCell(rowIndex, cellIndex, this.drawValue);
    },
    drawCell(rowIndex, cellIndex) {
      if (this.isDrawing) {
        this.updateCell(rowIndex, cellIndex, this.drawValue);
      }
    },
    handleHover(rowIndex, cellIndex) {
      if (this.isDrawing) {
        this.updateCell(rowIndex, cellIndex, this.drawValue);
      } else {
        this.hoverCell = { row: rowIndex, col: cellIndex };
      }
    },
    clearHover() {
      this.hoverCell = { row: -1, col: -1 };
    },
    getCellStyle(rowIndex, cellIndex) {
      if (this.cursorEffect && this.hoverCell.row === rowIndex && this.hoverCell.col === cellIndex) {
        return { backgroundColor: this.drawValue === 1 ? 'black' : 'white' };
      }
      return {};
    },
    stopDrawing() {
      this.isDrawing = false;
    },
    updateCell(rowIndex, cellIndex, value) {
      this.gridData[rowIndex][cellIndex] = value;
      this.updateHexCode();
    },
    handleTouchMove(event) {
      const touch = event.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains("cell")) {
        const { rowIndex, cellIndex } = this.getCellIndex(target);
        if (rowIndex !== -1 && cellIndex !== -1) {
          this.updateCell(rowIndex, cellIndex, this.drawValue);
        }
      }
    },
    getCellIndex(target) {
      const cellIndex = Array.from(target.parentNode.children).indexOf(target) - 1;
      const rowIndex = Array.from(target.parentNode.parentNode.children).indexOf(target.parentNode) - 1;
      return rowIndex >= 0 && cellIndex >= 0 && rowIndex < 16 && cellIndex < 16
        ? { rowIndex, cellIndex }
        : { rowIndex: -1, cellIndex: -1 };
    },
    toggleSettings(state) {
      this.showSettings = state;
    },
    saveSettings() {
      localStorage.setItem("drawMode", this.drawMode);
      localStorage.setItem("cursorEffect", JSON.stringify(this.cursorEffect));
    },
    setDrawValue(value) {
      this.drawValue = value;
    },
    updateHexCode() {
      let binaryString = this.gridData
        .flat()
        .map((cell) => (cell === 1 ? "1" : "0"))
        .join("");
      this.hexCode = this.binaryToHex(binaryString);
    },
    binaryToHex(binaryString) {
      let hexString = "";
      for (let i = 0; i < binaryString.length; i += 4) {
        let nibble = binaryString.slice(i, i + 4);
        hexString += parseInt(nibble, 2).toString(16).toUpperCase();
      }
      return hexString;
    },
    updateGridFromHex() {
      if (!/^[0-9A-F]{32,64}$/i.test(this.hexCode)) {
        this.resetGrid();
        return;
      }
      let binaryString = this.hexToBinary(this.hexCode);
      binaryString.split("").forEach((bit, index) => {
        const row = Math.floor(index / 16);
        const col = index % 16;
        this.gridData[row][col] = parseInt(bit, 10);
      });
    },
    resetGrid() {
      this.gridData = Array.from({ length: 16 }, () => Array(16).fill(0));
    },
    copyHex() {
      navigator.clipboard.writeText(this.hexCode).then(() => {
        this.copyIcon = 'check';
        setTimeout(() => {
          this.copyIcon = 'content_copy';
        }, 1500);
      });
    },
  },
  mounted() {
    this.updateHexCode();
    this.$el.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("mouseup", this.stopDrawing);
  },
  beforeUnmount() {
    window.removeEventListener("mouseup", this.stopDrawing);
  },
};
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
}

.modal-button {
  color: #196b24;
  font-size: 1.8em;
  padding: 5px 10px;
  cursor: pointer;
  width: 8em;
  border: none;
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
