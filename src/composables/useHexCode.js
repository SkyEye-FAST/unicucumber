import { ref, watch } from 'vue'

export function useHexCode(gridData, resetGrid) {
  const hexCode = ref('')

  const updateHexCode = () => {
    const width = gridData.value[0].length

    // 将网格数据转换为二进制字符串
    const binaryString = gridData.value
      .map((row) =>
        row
          .slice(0, width)
          .map((cell) => (cell === 1 ? '1' : '0'))
          .join(''),
      )
      .join('')

    // 按4位分组转换为十六进制
    const hex = []
    for (let i = 0; i < binaryString.length; i += 4) {
      const chunk = binaryString.slice(i, i + 4)
      hex.push(parseInt(chunk.padEnd(4, '0'), 2).toString(16).toUpperCase())
    }

    hexCode.value = hex.join('')
  }

  const updateGridFromHex = () => {
    if (
      !/^[0-9A-Fa-f]{32}$/i.test(hexCode.value) &&
      !/^[0-9A-Fa-f]{64}$/i.test(hexCode.value)
    ) {
      console.warn('Invalid hex code format, must be 32 or 64 characters')
      resetGrid()
      return
    }

    // 根据hex长度设置宽度
    const width = hexCode.value.length <= 32 ? 8 : 16
    const height = 16

    // 转换为二进制
    const binary = hexCode.value
      .split('')
      .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
      .join('')

    // 重置网格大小
    resetGrid(width)

    // 更新网格数据
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = i * width + j
        if (index < binary.length) {
          gridData.value[i][j] = parseInt(binary[index], 10)
        }
      }
    }
  }

  watch(gridData, updateHexCode, { deep: true })

  return {
    hexCode,
    updateHexCode,
    updateGridFromHex,
  }
}
