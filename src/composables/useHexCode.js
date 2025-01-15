import { ref, watch } from 'vue'
import { gridToHex } from '@/utils/hexUtils'

export function useHexCode(gridData, resetGrid) {
  const hexCode = ref('0'.repeat(64))

  const updateHexCode = () => {
    if (!gridData.value || !gridData.value.length) return
    hexCode.value = gridToHex(gridData.value)
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

    const width = hexCode.value.length <= 32 ? 8 : 16
    const height = 16

    const binary = hexCode.value
      .split('')
      .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
      .join('')

    resetGrid(width)

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const index = i * width + j
        if (index < binary.length) {
          gridData.value[i][j] = parseInt(binary[index], 10)
        }
      }
    }
  }

  watch(
    gridData,
    () => {
      updateHexCode()
    },
    { deep: true, immediate: true },
  )

  return {
    hexCode,
    updateHexCode,
    updateGridFromHex,
  }
}
