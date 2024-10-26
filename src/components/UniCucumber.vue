<template>
  <div class="container">
    <h1 class="title">UniCucumber</h1>
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
          :class="['cell', { filled: cell === 1 }]" @mousedown.prevent="toggleCell(rowIndex, cellIndex, $event)"
          @touchstart.prevent="toggleCell(rowIndex, cellIndex, { button: drawValue === 1 ? 0 : 2 })"
          @mouseover="drawCell(rowIndex, cellIndex)" @mouseup="stopDrawing" @touchmove.prevent="handleTouchMove"></div>
      </div>
    </div>
    <div class="tool-buttons">
      <button @click="setDrawValue(1)" :class="{ active: drawValue === 1 }" class="tool-button">
        🖊️
      </button>
      <button @click="setDrawValue(0)" :class="{ active: drawValue === 0 }" class="tool-button">
        🧽
      </button>
    </div>
    <div class="hex-code-container">
      <input v-model="hexCode" @input="updateGridFromHex" class="hex-input" maxlength="64"
        placeholder="Enter hex code (32 or 64 characters)" />
      <button @click="copyHex" class="copy-button">Copy</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      gridData: Array.from({ length: 16 }, () => Array(16).fill(0)),
      hexCode: "",
      isDrawing: false,
      drawValue: 1, // 1 = Pen, 0 = Eraser
    };
  },
  methods: {
    toggleCell(rowIndex, cellIndex, event) {
      this.drawValue = event.button === 2 ? 0 : 1;
      this.gridData[rowIndex][cellIndex] = this.drawValue;
      this.updateHexCode();
      this.isDrawing = true;
    },
    drawCell(rowIndex, cellIndex) {
      if (this.isDrawing) {
        this.gridData[rowIndex][cellIndex] = this.drawValue;
        this.updateHexCode();
      }
    },
    stopDrawing() {
      this.isDrawing = false;
    },
    handleTouchMove(event) {
      const touch = event.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains("cell")) {
        const cellIndex = Array.from(target.parentNode.children).indexOf(target) - 1;
        const rowIndex = Array.from(target.parentNode.parentNode.children).indexOf(target.parentNode) - 1;
        if (rowIndex >= 0 && cellIndex >= 0 && rowIndex < 16 && cellIndex < 16) {
          this.gridData[rowIndex][cellIndex] = this.drawValue;
          this.updateHexCode();
        }
      }
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
      if (
        this.hexCode.length !== 32 &&
        this.hexCode.length !== 64 ||
        /[^0-9A-Fa-f]/.test(this.hexCode)
      ) {
        this.gridData = Array.from({ length: 16 }, () => Array(16).fill(0));
        return;
      }

      let binaryString = this.hexToBinary(this.hexCode);
      binaryString.split("").forEach((bit, index) => {
        const row = Math.floor(index / 16);
        const col = index % 16;
        this.gridData[row][col] = parseInt(bit, 10);
      });
    },
    hexToBinary(hexString) {
      return hexString
        .split("")
        .map((hex) => parseInt(hex, 16).toString(2).padStart(4, "0"))
        .join("");
    },
    copyHex() {
      navigator.clipboard.writeText(this.hexCode).then(() => {
        alert("Hex code copied to clipboard!");
      });
    },
  },
  mounted() {
    this.updateHexCode();
    this.$el.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mouseup", this.stopDrawing);
  },
  beforeUnmount() {
    window.removeEventListener("mouseup", this.stopDrawing);
  },
};
</script>

<style scoped>
@import url("https://fonts.font.im/css2?family=Noto+Sans:wght@400;700&family=Fira+Code:wght@400;500&display=swap");

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Fira Code", monospace;
  background-color: #f2f2f2;
  padding: 20px;
}

.title {
  font-family: "Noto Sans", sans-serif;
  font-size: 2em;
  color: #4ea72e;
  margin-bottom: 25px;
}

.grid-container {
  display: grid;
  grid-template-columns: var(--cell-size) repeat(16, var(--cell-size));
  gap: 0;
  padding-right: var(--cell-size);
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
  border: none;
  background: #ddd;
  cursor: pointer;
  width: 5em;
}

.tool-button.active {
  background: #4ea72e;
  color: #fff;
}

.hex-code-container {
  width: 25em;
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.hex-input {
  width: 100%;
  padding: 5px;
  font-family: "Fira Code", monospace;
  font-size: 0.9em;
  border: 2px solid #000;
}

.copy-button {
  margin-left: 5px;
  padding: 5px 10px;
  font-family: "Fira Code", monospace;
  font-size: 0.9em;
  background-color: #4ea72e;
  color: #fff;
  border: none;
  cursor: pointer;
}

.copy-button:hover {
  background-color: #3d8b25;
}

@media (orientation: portrait) and (max-width: 768px) {
  .hex-code-container {
    width: 20em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .title {
    font-size: 2.5em;
  }

  .header-cell {
    font-size: 1.5em;
  }

  .hex-code-container {
    width: 35em;
  }

  .tool-button {
    font-size: 2em;
    width: 8em;
  }

  .hex-input {
    padding: 10px 0;
    font-size: 1.5em;
  }

  .copy-button {
    padding: 10px 20px;
    font-size: 1.5em;
  }
}

@media (orientation: portrait) and (min-width: 1024px){
  .title {
    font-size: 4em;
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

  .hex-input {
    padding: 10px 0;
    font-size: 2.2em;
  }

  .copy-button {
    padding: 15px 25px;
    font-size: 2em;
  }
}
</style>
