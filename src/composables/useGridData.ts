import { ref, type Ref, watch } from 'vue'

import type { GridData, GlyphWidth } from '@/types/glyph'
import { createGrid } from '@/utils/hexUtils'

export type GridDataType = GridData

interface UseGridDataReturn {
  gridData: Ref<GridDataType>
  resetGrid: (width?: GlyphWidth) => void
  updateGrid: (newSize: GlyphWidth) => void
}

export function useGridData(widthRef: Ref<GlyphWidth>): UseGridDataReturn {
  const gridData = ref<GridData>([])

  const resetGrid = (width: GlyphWidth = 16): void => {
    gridData.value = createGrid(width)
  }

  const updateGrid = (newSize: GlyphWidth): void => {
    resetGrid(newSize)
  }

  watch(
    widthRef,
    (newWidth) => {
      updateGrid(newWidth)
    },
    { immediate: true },
  )

  return {
    gridData,
    resetGrid,
    updateGrid,
  }
}
