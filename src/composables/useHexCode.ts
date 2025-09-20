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
  const getInitialHexLength = () => {
    if (gridData.value && gridData.value[0]) {
      return gridData.value[0].length <= 8 ? 32 : 64
    }
    return 64
  }

  const hexCode = ref('0'.repeat(getInitialHexLength()))

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

    resetGrid(width)
    if (!gridData.value || !Array.isArray(gridData.value)) {
      return
    }

    const binary: string = hexCode.value
      .split('')
      .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
      .join('')

    const newGrid: number[][] = []
    for (let i = 0; i < height; i++) {
      if (i < gridData.value.length) {
        const row: number[] = []
        for (let j = 0; j < width; j++) {
          const index = i * width + j
          if (index < binary.length) {
            row.push(binary[index] === '1' ? 1 : 0)
          } else {
            row.push(0)
          }
        }
        newGrid.push(row)
      }
    }

    gridData.value = newGrid
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
