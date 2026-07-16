import { ref, type Ref, watch } from 'vue'

import type { GridData, GlyphWidth } from '@/types/glyph'
import {
  getGlyphWidthFromHex,
  gridToHex,
  hexToGrid,
  normalizeHex,
} from '@/utils/hexUtils'

interface UseHexCodeReturn {
  hexCode: Ref<string>
  updateHexCode: () => void
  updateGridFromHex: () => void
}

export function useHexCode(
  gridData: Ref<GridData>,
  resetGrid: (width?: GlyphWidth) => void,
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

  const updateGridFromHex = (): boolean => {
    const normalized = normalizeHex(hexCode.value)
    const grid = hexToGrid(hexCode.value)
    const width = getGlyphWidthFromHex(hexCode.value)
    if (normalized === null || grid === null || width === null) return false
    resetGrid(width)
    gridData.value = grid
    hexCode.value = normalized
    return true
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
