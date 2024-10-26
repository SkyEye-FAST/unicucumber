<template>
  <div class="container">
    <h1 class="title">UniCucumber</h1>
    <div class="grid-container">
      <!-- 列标号 -->
      <div class="header-row">
        <div class="corner-cell"></div>
        <div v-for="colIndex in 16" :key="`col-${colIndex}`" class="header-cell"
          :style="{ color: colIndex % 2 === 0 ? '#000' : '#f4005f' }">
          {{ (colIndex - 1).toString(16).toUpperCase() }}
        </div>
      </div>
      <!-- 网格和行标号 -->
      <div v-for="(row, rowIndex) in gridData" :key="`row-${rowIndex}`" class="grid-row">
        <!-- 行标号 -->
        <div class="header-cell" :style="{ color: rowIndex % 2 === 0 ? '#000' : '#f4005f' }">
          {{ rowIndex.toString(16).toUpperCase() }}
        </div>
        <!-- 网格单元格 -->
        <div v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`"
          :class="['cell', { filled: cell === 1 }]" @mousedown.prevent="toggleCell(rowIndex, cellIndex, $event)"
          @mouseover="drawCell(rowIndex, cellIndex)" @mouseup="stopDrawing"></div>
      </div>
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
      drawValue: 1,
    };
  },
  methods: {
    // 切换单元格状态并更新hex
    toggleCell(rowIndex, cellIndex, event) {
      this.drawValue = event.button === 2 ? 0 : 1;
      this.gridData[rowIndex][cellIndex] = this.drawValue;
      this.updateHexCode();
      this.isDrawing = true;
    },
    // 拖动编辑单元格
    drawCell(rowIndex, cellIndex) {
      if (this.isDrawing) {
        this.gridData[rowIndex][cellIndex] = this.drawValue;
        this.updateHexCode();
      }
    },
    stopDrawing() {
      this.isDrawing = false;
    },
    // 更新hex字符串
    updateHexCode() {
      let binaryString = this.gridData
        .flat()
        .map((cell) => (cell === 1 ? "1" : "0"))
        .join("");
      this.hexCode = this.binaryToHex(binaryString);
    },
    // 二进制转换为十六进制
    binaryToHex(binaryString) {
      let hexString = "";
      for (let i = 0; i < binaryString.length; i += 4) {
        let nibble = binaryString.slice(i, i + 4);
        hexString += parseInt(nibble, 2).toString(16).toUpperCase();
      }
      return hexString;
    },
    // 从hex字符串更新网格
    updateGridFromHex() {
      if (
        this.hexCode.length !== 32 &&
        this.hexCode.length !== 64 ||
        /[^0-9A-Fa-f]/.test(this.hexCode)
      ) {
        // 如果长度非法或含有非十六进制字符，显示空白字形
        this.gridData = Array.from({ length: 16 }, () => Array(16).fill(0));
        return;
      }

      // 有效的hex字符串转成二进制并更新网格
      let binaryString = this.hexToBinary(this.hexCode);
      binaryString.split("").forEach((bit, index) => {
        const row = Math.floor(index / 16);
        const col = index % 16;
        this.gridData[row][col] = parseInt(bit, 10);
      });
    },
    // 十六进制转二进制
    hexToBinary(hexString) {
      return hexString
        .split("")
        .map((hex) => parseInt(hex, 16).toString(2).padStart(4, "0"))
        .join("");
    },
    // 复制hex字符串
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
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Fira+Code:wght@400;500&display=swap");

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
  margin-bottom: 20px;
}

.grid-container {
  display: grid;
  grid-template-columns: 20px repeat(16, 20px);
  gap: 0;
}

.header-row {
  display: contents;
}

.grid-row {
  display: contents;
}

.corner-cell {
  width: 20px;
  height: 20px;
}

.header-cell {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-family: "Fira Code", monospace;
}

.cell {
  width: 20px;
  height: 20px;
  background-color: #f2f2f2;
  border: 0.5px solid #196b24;
  cursor: pointer;
}

.cell.filled {
  background-color: black;
}

.hex-code-container {
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.hex-input {
  width: 300px;
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
</style>
