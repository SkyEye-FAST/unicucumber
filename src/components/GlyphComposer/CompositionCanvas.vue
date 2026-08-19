<template>
  <svg
    class="composition-canvas"
    data-testid="composition-canvas"
    viewBox="0 0 16 16"
    role="img"
    :aria-label="$t('composition.canvas')"
    tabindex="0"
    @keydown="handleKeydown"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="cancelPointerMove"
  >
    <rect class="canvas-background" width="16" height="16" />
    <template v-for="(row, rowIndex) in displayGrid" :key="rowIndex">
      <rect
        v-for="(cell, colIndex) in row"
        v-show="cell === 1"
        :key="`${rowIndex}-${colIndex}`"
        class="canvas-pixel"
        :x="colIndex"
        :y="rowIndex"
        width="1"
        height="1"
      />
    </template>
    <path class="canvas-grid" :d="gridPath" />
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { composeLayers } from '@/domain/composition'
import type { CompositionLayer } from '@/types/composition'

const props = defineProps<{
  layers: CompositionLayer[]
  selectedLayerId: string | null
}>()

const emit = defineEmits<{
  move: [dx: number, dy: number]
}>()

const { t: $t } = useI18n()
const dragStart = ref<{ col: number; row: number } | null>(null)
const dragDelta = ref({ dx: 0, dy: 0 })
const activePointerId = ref<number | null>(null)

const selectedLayer = computed(() =>
  props.layers.find(({ id }) => id === props.selectedLayerId),
)

const displayGrid = computed(() => {
  if (
    dragStart.value === null ||
    selectedLayer.value === undefined ||
    (dragDelta.value.dx === 0 && dragDelta.value.dy === 0)
  ) {
    return composeLayers(props.layers)
  }

  return composeLayers(
    props.layers.map((layer) =>
      layer.id === selectedLayer.value?.id
        ? {
            ...layer,
            offsetX: layer.offsetX + dragDelta.value.dx,
            offsetY: layer.offsetY + dragDelta.value.dy,
          }
        : layer,
    ),
  )
})

const gridPath = Array.from({ length: 17 }, (_, index) => {
  return `M${index} 0V16M0 ${index}H16`
}).join('')

const handleKeydown = (event: KeyboardEvent): void => {
  if (selectedLayer.value?.locked !== false) return

  const delta =
    event.key === 'ArrowLeft'
      ? { dx: -1, dy: 0 }
      : event.key === 'ArrowRight'
        ? { dx: 1, dy: 0 }
        : event.key === 'ArrowUp'
          ? { dx: 0, dy: -1 }
          : event.key === 'ArrowDown'
            ? { dx: 0, dy: 1 }
            : null

  if (delta === null) return
  event.preventDefault()
  emit('move', delta.dx, delta.dy)
}

const pointerCell = (
  event: PointerEvent,
): { col: number; row: number } | null => {
  const target = event.currentTarget
  if (!(target instanceof SVGElement)) return null
  const rect = target.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    col: Math.max(
      0,
      Math.min(15, Math.floor(((event.clientX - rect.left) / rect.width) * 16)),
    ),
    row: Math.max(
      0,
      Math.min(15, Math.floor(((event.clientY - rect.top) / rect.height) * 16)),
    ),
  }
}

const handlePointerDown = (event: PointerEvent): void => {
  if (selectedLayer.value?.locked !== false) return
  const cell = pointerCell(event)
  if (cell === null) return
  dragStart.value = cell
  dragDelta.value = { dx: 0, dy: 0 }
  activePointerId.value = event.pointerId
  const target = event.currentTarget
  if (target instanceof SVGElement && 'setPointerCapture' in target) {
    target.setPointerCapture(event.pointerId)
  }
}

const handlePointerMove = (event: PointerEvent): void => {
  if (dragStart.value === null || activePointerId.value !== event.pointerId) {
    return
  }
  const cell = pointerCell(event)
  if (cell === null) return
  dragDelta.value = {
    dx: cell.col - dragStart.value.col,
    dy: cell.row - dragStart.value.row,
  }
}

const finishPointerMove = (): void => {
  const { dx, dy } = dragDelta.value
  if (dx !== 0 || dy !== 0) emit('move', dx, dy)
  cancelPointerMove()
}

const handlePointerUp = (event: PointerEvent): void => {
  if (activePointerId.value !== event.pointerId) return
  finishPointerMove()
}

const cancelPointerMove = (): void => {
  dragStart.value = null
  dragDelta.value = { dx: 0, dy: 0 }
  activePointerId.value = null
}
</script>

<style scoped>
.composition-canvas {
  display: block;
  width: min(100%, 34rem);
  aspect-ratio: 1;
  margin: auto;
  color: var(--glyph-foreground-color);
  background: var(--glyph-background-color);
  border: 1px solid var(--border-color);
  border-radius: 0;
  touch-action: none;
}

.composition-canvas:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.canvas-background {
  fill: var(--glyph-background-color);
}

.canvas-pixel {
  fill: currentColor;
}

.canvas-grid {
  fill: none;
  stroke: var(--border-hover);
  stroke-width: 0.04;
}
</style>
