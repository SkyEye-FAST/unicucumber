import { ref, watch } from 'vue'
import { hexToBinary, binaryToHex } from '../utils/conversion'

export function useHexCode(gridData, resetGrid) {
  const hexCode = ref('')

  const updateHexCode = () => {
    const binaryString = gridData.value
      .flat()
      .map(cell => (cell === 1 ? '1' : '0'))
      .join('')
    hexCode.value = binaryToHex(binaryString)
  }

  const updateGridFromHex = () => {
    if (!/^[0-9A-F]{32,64}$/i.test(hexCode.value)) {
      resetGrid()
      return
    }
    const binaryString = hexToBinary(hexCode.value)
    binaryString.split('').forEach((bit, index) => {
      const row = Math.floor(index / 16)
      const col = index % 16
      gridData.value[row][col] = parseInt(bit, 10)
    })
  }

  watch(gridData, updateHexCode, { deep: true })

  return {
    hexCode,
    updateHexCode,
    updateGridFromHex,
  }
}
