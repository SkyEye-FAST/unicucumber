import { ref, watch, type Ref } from 'vue'
import { gridToHex } from '@/utils/hexUtils'

interface GridData {
  value: number[][]
}

interface ResetGridFunction {
  (width?: number): void
}

interface UseHexCodeReturn {
  hexCode: Ref<string>
  updateHexCode: () => void
  updateGridFromHex: () => void
}

export function useHexCode(
  gridData: GridData,
  resetGrid: ResetGridFunction,
): UseHexCodeReturn {
  const hexCode = ref('0'.repeat(64))

  const updateHexCode = (): void => {
    if (!gridData.value || !gridData.value.length) return
    hexCode.value = gridToHex(gridData.value)
  }

  const updateGridFromHex = (): void => {
    if (
      !/^[0-9A-Fa-f]{32}$/i.test(hexCode.value) &&
      !/^[0-9A-Fa-f]{64}$/i.test(hexCode.value)
    ) {
      console.warn('Invalid hex code format, must be 32 or 64 characters')
      resetGrid()
      return
    }

    const width: number = hexCode.value.length <= 32 ? 8 : 16
    const height: number = 16

    const binary: string = hexCode.value
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
