<template>
  <section class="workspace" :aria-label="$t('workspace.label')">
    <div class="workspace-toolbar">
      <div class="workspace-metadata">
        <slot name="toolbar"></slot>
      </div>
      <div
        class="view-controls"
        role="toolbar"
        :aria-label="$t('workspace.view_controls')"
      >
        <button
          type="button"
          :aria-label="$t('workspace.zoom_out')"
          :title="$t('workspace.zoom_out')"
          @click="zoomBy(-ZOOM_STEP)"
        >
          <i-material-symbols-zoom-out class="icon" />
        </button>
        <output class="zoom-value" :aria-label="$t('workspace.zoom_level')">
          {{ zoomPercent }}%
        </output>
        <button
          type="button"
          :aria-label="$t('workspace.zoom_in')"
          :title="$t('workspace.zoom_in')"
          @click="zoomBy(ZOOM_STEP)"
        >
          <i-material-symbols-zoom-in class="icon" />
        </button>
        <button
          type="button"
          :class="{ active: fitMode }"
          :aria-label="$t('workspace.fit')"
          :title="$t('workspace.fit')"
          @click="fitToScreen"
        >
          <i-material-symbols-fit-screen class="icon" />
        </button>
        <button
          type="button"
          :aria-label="$t('workspace.reset_view')"
          :title="$t('workspace.reset_view')"
          @click="resetView"
        >
          <i-material-symbols-center-focus-strong-outline class="icon" />
        </button>
      </div>
    </div>

    <div
      ref="viewportRef"
      class="grid-viewport"
      :class="{
        interacting: interaction.kind !== 'idle',
        panning:
          interaction.kind === 'panning' || interaction.kind === 'gesturing',
      }"
      :style="viewportStyle"
      tabindex="0"
      role="application"
      :aria-label="$t('workspace.grid_label', { width: gridWidth })"
      @contextmenu="handleContextMenu"
      @keydown="handleKeyDown"
      @lostpointercapture="handleLostPointerCapture"
      @pointercancel="handlePointerCancel"
      @pointerdown="handlePointerDown"
      @pointerleave="handlePointerLeave"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @wheel="handleWheel"
    >
      <div ref="gridRef" class="grid-container" :style="gridStyle">
        <div class="header-row" aria-hidden="true">
          <div class="corner-cell"></div>
          <div
            v-for="colIndex in gridWidth"
            :key="`col-${colIndex}`"
            class="header-cell"
            :class="{ alternate: colIndex % 2 === 0 }"
          >
            {{ (colIndex - 1).toString(16).toUpperCase() }}
          </div>
        </div>

        <div
          v-for="(row, rowIndex) in gridData"
          :key="`row-${rowIndex}`"
          class="grid-row"
          aria-hidden="true"
        >
          <div class="header-cell" :class="{ alternate: rowIndex % 2 === 1 }">
            {{ rowIndex.toString(16).toUpperCase() }}
          </div>
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            class="cell"
            :class="{
              filled: displayedCellValue(cell, rowIndex, colIndex) === 1,
              bordered: showBorder,
            }"
            :data-row="rowIndex"
            :data-col="colIndex"
          ></div>
        </div>

        <div
          v-for="point in previewPoints"
          :key="`preview-${point.row}-${point.col}`"
          class="preview-cell"
          :class="{ erase: previewValue === 0 }"
          :style="cellOverlayStyle(point)"
        ></div>

        <div
          v-if="normalizedSelection"
          class="selection-overlay"
          :class="{ moving: interaction.kind === 'movingSelection' }"
          :style="rectangleOverlayStyle(normalizedSelection)"
        ></div>

        <div
          v-if="pasteRectangle && clipboard.clipboardData.value"
          class="paste-overlay"
          :style="pasteOverlayStyle"
        >
          <template
            v-for="(row, rowIndex) in clipboard.clipboardData.value.data"
            :key="`paste-row-${rowIndex}`"
          >
            <span
              v-for="(cell, colIndex) in row"
              :key="`paste-${rowIndex}-${colIndex}`"
              class="paste-cell"
              :class="{ filled: cell === 1 }"
              :style="{
                gridRow: rowIndex + 1,
                gridColumn: colIndex + 1,
              }"
            ></span>
          </template>
        </div>
      </div>
    </div>

    <div
      v-if="clipboard.isPasteMode.value"
      class="context-toolbar paste-toolbar"
      role="toolbar"
      :aria-label="$t('selection.paste_actions')"
    >
      <div class="nudge-controls">
        <button
          type="button"
          :aria-label="$t('selection.move_up')"
          @click="nudgePaste(-1, 0)"
        >
          <i-material-symbols-arrow-upward />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_left')"
          @click="nudgePaste(0, -1)"
        >
          <i-material-symbols-arrow-back />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_right')"
          @click="nudgePaste(0, 1)"
        >
          <i-material-symbols-arrow-forward />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_down')"
          @click="nudgePaste(1, 0)"
        >
          <i-material-symbols-arrow-downward />
        </button>
      </div>
      <button class="confirm" type="button" @click="confirmPaste">
        <i-material-symbols-check class="icon" />
        {{ $t('selection.confirm_paste') }}
      </button>
      <button type="button" @click="cancelPaste">
        <i-material-symbols-close class="icon" />
        {{ $t('selection.cancel_paste') }}
      </button>
    </div>

    <div
      v-else-if="normalizedSelection"
      class="context-toolbar selection-toolbar"
      role="toolbar"
      :aria-label="$t('selection.actions')"
    >
      <button
        type="button"
        :aria-label="$t('selection.cut')"
        :title="$t('glyph_editor.cut_title')"
        @click="handleCut"
      >
        <i-material-symbols-content-cut class="icon" />
        <span>{{ $t('selection.cut') }}</span>
      </button>
      <button
        type="button"
        :aria-label="$t('selection.copy')"
        :title="$t('glyph_editor.copy_title')"
        @click="handleCopy"
      >
        <i-material-symbols-content-copy class="icon" />
        <span>{{ $t('selection.copy') }}</span>
      </button>
      <button
        type="button"
        :aria-label="$t('selection.duplicate')"
        :title="$t('selection.duplicate')"
        @click="handleDuplicate"
      >
        <i-material-symbols-control-point-duplicate class="icon" />
        <span>{{ $t('selection.duplicate') }}</span>
      </button>
      <button
        type="button"
        :aria-label="$t('selection.delete')"
        :title="$t('selection.delete')"
        @click="handleDelete"
      >
        <i-material-symbols-delete-outline class="icon" />
        <span>{{ $t('selection.delete') }}</span>
      </button>
      <div class="nudge-controls">
        <button
          type="button"
          :aria-label="$t('selection.move_up')"
          @click="nudgeSelection(-1, 0)"
        >
          <i-material-symbols-arrow-upward />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_left')"
          @click="nudgeSelection(0, -1)"
        >
          <i-material-symbols-arrow-back />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_right')"
          @click="nudgeSelection(0, 1)"
        >
          <i-material-symbols-arrow-forward />
        </button>
        <button
          type="button"
          :aria-label="$t('selection.move_down')"
          @click="nudgeSelection(1, 0)"
        >
          <i-material-symbols-arrow-downward />
        </button>
      </div>
      <button
        type="button"
        :aria-label="$t('selection.deselect')"
        :title="$t('selection.deselect')"
        @click="clearSelection"
      >
        <i-material-symbols-deselect class="icon" />
        <span>{{ $t('selection.deselect') }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import { useI18n } from 'vue-i18n'

import { useClipboard } from '@/composables/useClipboard'
import { extractSelection, linePositions } from '@/domain/grid'
import type { EditorCommand } from '@/types/editor'
import type {
  EditorTool,
  GridCell,
  GridData,
  GridPosition,
  SelectionRectangle,
} from '@/types/glyph'
import {
  clampSelectionPosition,
  normalizeSelectionRectangle,
} from '@/utils/selection'

interface Props {
  gridData: GridData
  drawMode: 'singleButtonDraw' | 'doubleButtonDraw'
  drawValue: number
  showBorder: boolean
  currentTool?: EditorTool
  enableSelection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentTool: 'draw',
  enableSelection: true,
})

const emit = defineEmits<{
  'update:cell': [row: number, col: number, value: GridCell]
  'update:draw-value': [value: number]
  'selection-change': [hasSelection: boolean]
  'tool-change': [tool: EditorTool]
  'tool-state-change': [tool: 'draw' | 'erase']
  'draw-complete': [action: { type: 'draw' | 'erase'; changes: never[] }]
  'clipboard-change': [hasData: boolean]
  'paste-start': []
  command: [command: EditorCommand]
}>()

const { t: $t } = useI18n()
const clipboard = useClipboard()
const viewportRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const gridWidth = computed(() => props.gridData[0]?.length ?? 16)

const DEFAULT_CELL_SIZE = 30
const MIN_CELL_SIZE = 10
const MAX_CELL_SIZE = 64
const ZOOM_STEP = 2
const cellSize = ref(DEFAULT_CELL_SIZE)
const fitMode = ref(true)
const pan = reactive({ x: 0, y: 0 })

const zoomPercent = computed(() =>
  Math.round((cellSize.value / DEFAULT_CELL_SIZE) * 100),
)
const documentWidth = computed(() => (gridWidth.value + 1) * cellSize.value)
const documentHeight = computed(
  () => (props.gridData.length + 1) * cellSize.value,
)
const viewportStyle = computed<CSSProperties>(() => {
  const fittedHeight = documentHeight.value + 2
  if (fitMode.value) return { height: `${fittedHeight}px` }
  return {
    height: `${Math.min(
      fittedHeight,
      Math.max(
        260,
        Math.round(
          (window.visualViewport?.height ?? window.innerHeight) * 0.62,
        ),
      ),
    )}px`,
  }
})
const gridStyle = computed<CSSProperties>(() => ({
  '--cell-size': `${cellSize.value}px`,
  gridTemplateColumns: `repeat(${gridWidth.value + 1}, var(--cell-size))`,
  transform: `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0)`,
}))

type PointerMetadata = {
  x: number
  y: number
  pointerType: string
  pressure: number
  tiltX: number
  tiltY: number
  twist: number
}

type InteractionState =
  | { kind: 'idle' }
  | {
      kind: 'drawing'
      pointerId: number
      value: GridCell
      points: GridPosition[]
    }
  | {
      kind: 'selecting'
      pointerId: number
      anchor: GridPosition
      current: GridPosition
    }
  | {
      kind: 'movingSelection'
      pointerId: number
      anchor: GridPosition
      original: SelectionRectangle
      target: GridPosition
    }
  | {
      kind: 'shaping'
      pointerId: number
      tool: 'line' | 'rectangle' | 'filledRectangle'
      start: GridPosition
      current: GridPosition
    }
  | {
      kind: 'panning'
      pointerId: number
      startClient: { x: number; y: number }
      startPan: { x: number; y: number }
    }
  | {
      kind: 'gesturing'
      pointerIds: [number, number]
      startDistance: number
      startCellSize: number
      documentFocal: { x: number; y: number }
    }

const interaction = ref<InteractionState>({ kind: 'idle' })
const pointers = new Map<number, PointerMetadata>()
const activePenPointerId = ref<number | null>(null)
const hoverCell = ref<GridPosition | null>(null)
const selectionRect = ref<SelectionRectangle | null>(null)
const pasteTarget = ref<GridPosition>({ row: 0, col: 0 })
const currentDrawValue = ref(1)
const drawing = { currentDrawValue }

const normalizedSelection = computed(() => {
  if (interaction.value.kind === 'selecting') {
    return normalizeSelectionRectangle({
      startRow: interaction.value.anchor.row,
      startCol: interaction.value.anchor.col,
      endRow: interaction.value.current.row,
      endCol: interaction.value.current.col,
    })
  }
  if (interaction.value.kind === 'movingSelection') {
    const original = normalizeSelectionRectangle(interaction.value.original)
    const width = original.endCol - original.startCol + 1
    const height = original.endRow - original.startRow + 1
    return {
      startRow: interaction.value.target.row,
      startCol: interaction.value.target.col,
      endRow: interaction.value.target.row + height - 1,
      endCol: interaction.value.target.col + width - 1,
    }
  }
  return selectionRect.value
    ? normalizeSelectionRectangle(selectionRect.value)
    : null
})

const movingSelectionPreview = computed(() => {
  const state = interaction.value
  if (state.kind !== 'movingSelection') return null
  const original = normalizeSelectionRectangle(state.original)
  return {
    original,
    target: normalizedSelection.value ?? original,
    data: extractSelection(props.gridData, original),
  }
})

const displayedCellValue = (
  value: GridCell,
  row: number,
  col: number,
): GridCell => {
  const preview = movingSelectionPreview.value
  if (!preview) return value

  const { original, target, data } = preview
  if (
    row >= target.startRow &&
    row <= target.endRow &&
    col >= target.startCol &&
    col <= target.endCol
  ) {
    return data[row - target.startRow]?.[col - target.startCol] ?? 0
  }
  if (
    row >= original.startRow &&
    row <= original.endRow &&
    col >= original.startCol &&
    col <= original.endCol
  ) {
    return 0
  }
  return value
}

const pasteRectangle = computed<SelectionRectangle | null>(() => {
  const data = clipboard.clipboardData.value
  if (!clipboard.isPasteMode.value || !data) return null
  return {
    startRow: pasteTarget.value.row,
    startCol: pasteTarget.value.col,
    endRow: pasteTarget.value.row + data.height - 1,
    endCol: pasteTarget.value.col + data.width - 1,
  }
})

const pasteOverlayStyle = computed<CSSProperties>(() => {
  const rectangle = pasteRectangle.value
  const data = clipboard.clipboardData.value
  if (!rectangle || !data) return { display: 'none' }
  return {
    ...rectangleOverlayStyle(rectangle),
    gridTemplateColumns: `repeat(${data.width}, var(--cell-size))`,
    gridTemplateRows: `repeat(${data.height}, var(--cell-size))`,
  }
})

const dedupePoints = (points: readonly GridPosition[]): GridPosition[] => {
  const seen = new Set<string>()
  return points.filter((point) => {
    const key = `${point.row}:${point.col}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const previewPoints = computed<GridPosition[]>(() => {
  const state = interaction.value
  if (state.kind === 'drawing') return dedupePoints(state.points)
  if (state.kind === 'shaping') {
    if (state.tool === 'line') return linePositions(state.start, state.current)
    const points: GridPosition[] = []
    const startRow = Math.min(state.start.row, state.current.row)
    const endRow = Math.max(state.start.row, state.current.row)
    const startCol = Math.min(state.start.col, state.current.col)
    const endCol = Math.max(state.start.col, state.current.col)
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (
          state.tool === 'filledRectangle' ||
          row === startRow ||
          row === endRow ||
          col === startCol ||
          col === endCol
        ) {
          points.push({ row, col })
        }
      }
    }
    return points
  }
  if (
    hoverCell.value &&
    (props.currentTool === 'draw' || props.currentTool === 'erase')
  ) {
    return [hoverCell.value]
  }
  return []
})

const previewValue = computed<GridCell>(() => {
  if (interaction.value.kind === 'drawing') return interaction.value.value
  return props.currentTool === 'erase' ? 0 : 1
})

const cellOverlayStyle = (position: GridPosition): CSSProperties => ({
  top: `calc(${position.row + 1} * var(--cell-size))`,
  left: `calc(${position.col + 1} * var(--cell-size))`,
  width: 'var(--cell-size)',
  height: 'var(--cell-size)',
})

const rectangleOverlayStyle = (
  rectangle: SelectionRectangle,
): CSSProperties => {
  const normalized = normalizeSelectionRectangle(rectangle)
  return {
    top: `calc(${normalized.startRow + 1} * var(--cell-size))`,
    left: `calc(${normalized.startCol + 1} * var(--cell-size))`,
    width: `calc(${normalized.endCol - normalized.startCol + 1} * var(--cell-size))`,
    height: `calc(${normalized.endRow - normalized.startRow + 1} * var(--cell-size))`,
  }
}

const clampPan = (): void => {
  const viewport = viewportRef.value
  if (!viewport) return
  const minX = Math.min(0, viewport.clientWidth - documentWidth.value)
  const minY = Math.min(0, viewport.clientHeight - documentHeight.value)
  if (documentWidth.value <= viewport.clientWidth) {
    pan.x = Math.round((viewport.clientWidth - documentWidth.value) / 2)
  } else {
    pan.x = Math.max(minX, Math.min(0, pan.x))
  }
  if (documentHeight.value <= viewport.clientHeight) {
    pan.y = 0
  } else {
    pan.y = Math.max(minY, Math.min(0, pan.y))
  }
}

const calculateFitCellSize = (): number => {
  const available = Math.max(
    1,
    (viewportRef.value?.clientWidth ?? window.innerWidth) - 4,
  )
  return Math.max(
    MIN_CELL_SIZE,
    Math.min(DEFAULT_CELL_SIZE, Math.floor(available / (gridWidth.value + 1))),
  )
}

const fitToScreen = async (): Promise<void> => {
  fitMode.value = true
  cellSize.value = calculateFitCellSize()
  await nextTick()
  pan.x = 0
  pan.y = 0
  clampPan()
}

const resetView = async (): Promise<void> => {
  fitMode.value = false
  cellSize.value = DEFAULT_CELL_SIZE
  pan.x = 0
  pan.y = 0
  await nextTick()
  clampPan()
}

const applyZoom = (
  nextCellSize: number,
  focal?: { x: number; y: number },
): void => {
  const viewport = viewportRef.value
  if (!viewport) return
  const previous = cellSize.value
  const next = Math.max(
    MIN_CELL_SIZE,
    Math.min(MAX_CELL_SIZE, Math.round(nextCellSize)),
  )
  if (next === previous) return
  fitMode.value = false
  const localFocal = focal ?? {
    x: viewport.clientWidth / 2,
    y: viewport.clientHeight / 2,
  }
  const documentX = (localFocal.x - pan.x) / previous
  const documentY = (localFocal.y - pan.y) / previous
  cellSize.value = next
  pan.x = localFocal.x - documentX * next
  pan.y = localFocal.y - documentY * next
  nextTick(clampPan)
}

const zoomBy = (delta: number): void => applyZoom(cellSize.value + delta)

const updatePointer = (event: PointerEvent): void => {
  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    pointerType: event.pointerType,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist,
  })
}

const pointDistance = (
  first: PointerMetadata,
  second: PointerMetadata,
): number => Math.hypot(second.x - first.x, second.y - first.y)

const pointMidpoint = (first: PointerMetadata, second: PointerMetadata) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
})

const eventCell = (event: PointerEvent, clamp = false): GridPosition | null => {
  const grid = gridRef.value
  if (!grid) return null
  const bounds = grid.getBoundingClientRect()
  let row = Math.floor((event.clientY - bounds.top) / cellSize.value) - 1
  let col = Math.floor((event.clientX - bounds.left) / cellSize.value) - 1
  if (clamp) {
    row = Math.max(0, Math.min(props.gridData.length - 1, row))
    col = Math.max(0, Math.min(gridWidth.value - 1, col))
  }
  if (
    row < 0 ||
    col < 0 ||
    row >= props.gridData.length ||
    col >= gridWidth.value
  ) {
    return null
  }
  return { row, col }
}

const isInsideSelection = (position: GridPosition): boolean => {
  const rectangle = normalizedSelection.value
  return Boolean(
    rectangle &&
    position.row >= rectangle.startRow &&
    position.row <= rectangle.endRow &&
    position.col >= rectangle.startCol &&
    position.col <= rectangle.endCol,
  )
}

const startGesture = (): void => {
  const entries = [...pointers.entries()].filter(
    ([, pointer]) => pointer.pointerType === 'touch',
  )
  if (entries.length < 2) return
  const [[firstId, first], [secondId, second]] = entries
  if (!first || !second || firstId === undefined || secondId === undefined)
    return
  const viewportBounds = viewportRef.value?.getBoundingClientRect()
  if (!viewportBounds) return
  const midpoint = pointMidpoint(first, second)
  interaction.value = {
    kind: 'gesturing',
    pointerIds: [firstId, secondId],
    startDistance: Math.max(1, pointDistance(first, second)),
    startCellSize: cellSize.value,
    documentFocal: {
      x: (midpoint.x - viewportBounds.left - pan.x) / cellSize.value,
      y: (midpoint.y - viewportBounds.top - pan.y) / cellSize.value,
    },
  }
  hoverCell.value = null
}

const handlePointerDown = (event: PointerEvent): void => {
  if (event.pointerType === 'touch' && activePenPointerId.value !== null) return
  if (event.pointerType === 'pen') activePenPointerId.value = event.pointerId
  if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2)
    return
  if (event.pointerType !== 'mouse' && !event.isPrimary && pointers.size === 0)
    return

  updatePointer(event)
  if (event.isTrusted) {
    viewportRef.value?.setPointerCapture?.(event.pointerId)
  }

  if (
    event.pointerType === 'touch' &&
    [...pointers.values()].filter((pointer) => pointer.pointerType === 'touch')
      .length >= 2
  ) {
    startGesture()
    event.preventDefault()
    return
  }

  const position = eventCell(event)
  if (clipboard.isPasteMode.value) {
    if (position) setPasteTarget(position)
    event.preventDefault()
    return
  }

  if (props.currentTool === 'pan') {
    interaction.value = {
      kind: 'panning',
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: { ...pan },
    }
    event.preventDefault()
    return
  }
  if (!position) return

  if (props.currentTool === 'fill') {
    emit('command', { type: 'fillRegion', origin: position, value: 1 })
  } else if (
    props.currentTool === 'line' ||
    props.currentTool === 'rectangle' ||
    props.currentTool === 'filledRectangle'
  ) {
    interaction.value = {
      kind: 'shaping',
      pointerId: event.pointerId,
      tool: props.currentTool,
      start: position,
      current: position,
    }
  } else if (props.currentTool === 'select') {
    if (selectionRect.value && isInsideSelection(position)) {
      interaction.value = {
        kind: 'movingSelection',
        pointerId: event.pointerId,
        anchor: position,
        original: normalizeSelectionRectangle(selectionRect.value),
        target: {
          row: selectionRect.value.startRow,
          col: selectionRect.value.startCol,
        },
      }
    } else {
      interaction.value = {
        kind: 'selecting',
        pointerId: event.pointerId,
        anchor: position,
        current: position,
      }
    }
  } else {
    const value: GridCell =
      props.currentTool === 'erase' ||
      (props.drawMode === 'doubleButtonDraw' && event.button === 2)
        ? 0
        : props.drawValue === 0
          ? 0
          : 1
    currentDrawValue.value = value
    interaction.value = {
      kind: 'drawing',
      pointerId: event.pointerId,
      value,
      points: [position],
    }
  }
  event.preventDefault()
}

const handlePointerMove = (event: PointerEvent): void => {
  if (pointers.has(event.pointerId)) updatePointer(event)
  const state = interaction.value
  if (state.kind === 'idle') {
    hoverCell.value = event.pointerType === 'touch' ? null : eventCell(event)
    return
  }
  if (state.kind === 'gesturing') {
    const first = pointers.get(state.pointerIds[0])
    const second = pointers.get(state.pointerIds[1])
    const viewportBounds = viewportRef.value?.getBoundingClientRect()
    if (!first || !second || !viewportBounds) return
    const midpoint = pointMidpoint(first, second)
    const nextSize = Math.max(
      MIN_CELL_SIZE,
      Math.min(
        MAX_CELL_SIZE,
        Math.round(
          state.startCellSize *
            (pointDistance(first, second) / state.startDistance),
        ),
      ),
    )
    cellSize.value = nextSize
    fitMode.value = false
    pan.x = midpoint.x - viewportBounds.left - state.documentFocal.x * nextSize
    pan.y = midpoint.y - viewportBounds.top - state.documentFocal.y * nextSize
    clampPan()
    event.preventDefault()
    return
  }
  if ('pointerId' in state && state.pointerId !== event.pointerId) return

  if (state.kind === 'panning') {
    pan.x = state.startPan.x + event.clientX - state.startClient.x
    pan.y = state.startPan.y + event.clientY - state.startClient.y
    clampPan()
  } else {
    const position = eventCell(event, true)
    if (!position) return
    if (state.kind === 'drawing') {
      const last = state.points[state.points.length - 1] ?? position
      state.points.push(...linePositions(last, position))
    } else if (state.kind === 'selecting' || state.kind === 'shaping') {
      state.current = position
    } else if (state.kind === 'movingSelection') {
      const original = normalizeSelectionRectangle(state.original)
      const width = original.endCol - original.startCol + 1
      const height = original.endRow - original.startRow + 1
      state.target = clampSelectionPosition(
        {
          row: original.startRow + position.row - state.anchor.row,
          col: original.startCol + position.col - state.anchor.col,
        },
        width,
        height,
        gridWidth.value,
        props.gridData.length,
      )
    }
  }
  event.preventDefault()
}

const finishInteraction = (pointerId: number, commit: boolean): void => {
  const state = interaction.value
  if (state.kind === 'gesturing') {
    if (state.pointerIds.includes(pointerId))
      interaction.value = { kind: 'idle' }
    return
  }
  if ('pointerId' in state && state.pointerId !== pointerId) return
  if (!commit) {
    interaction.value = { kind: 'idle' }
    currentDrawValue.value = 1
    return
  }

  if (state.kind === 'drawing') {
    const points = dedupePoints(state.points)
    emit('command', { type: 'applyStroke', points, value: state.value })
  } else if (state.kind === 'selecting') {
    selectionRect.value = normalizeSelectionRectangle({
      startRow: state.anchor.row,
      startCol: state.anchor.col,
      endRow: state.current.row,
      endCol: state.current.col,
    })
  } else if (state.kind === 'movingSelection') {
    const original = normalizeSelectionRectangle(state.original)
    if (
      state.target.row !== original.startRow ||
      state.target.col !== original.startCol
    ) {
      emit('command', {
        type: 'moveSelection',
        rectangle: original,
        target: state.target,
      })
      const width = original.endCol - original.startCol
      const height = original.endRow - original.startRow
      selectionRect.value = {
        startRow: state.target.row,
        startCol: state.target.col,
        endRow: state.target.row + height,
        endCol: state.target.col + width,
      }
    }
  } else if (state.kind === 'shaping') {
    if (state.tool === 'line') {
      emit('command', {
        type: 'drawLine',
        start: state.start,
        end: state.current,
        value: 1,
      })
    } else {
      emit('command', {
        type: 'drawRectangle',
        start: state.start,
        end: state.current,
        value: 1,
        mode: state.tool === 'filledRectangle' ? 'filled' : 'outline',
      })
    }
  }
  interaction.value = { kind: 'idle' }
  currentDrawValue.value = 1
}

const releasePointer = (event: PointerEvent): void => {
  const target = viewportRef.value
  if (target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  pointers.delete(event.pointerId)
  if (activePenPointerId.value === event.pointerId)
    activePenPointerId.value = null
}

const handlePointerUp = (event: PointerEvent): void => {
  finishInteraction(event.pointerId, true)
  releasePointer(event)
}

const handlePointerCancel = (event: PointerEvent): void => {
  finishInteraction(event.pointerId, false)
  releasePointer(event)
}

const handleLostPointerCapture = (event: PointerEvent): void => {
  if (pointers.has(event.pointerId)) {
    finishInteraction(event.pointerId, false)
    pointers.delete(event.pointerId)
  }
}

const cancelInteraction = (): void => {
  interaction.value = { kind: 'idle' }
  pointers.clear()
  activePenPointerId.value = null
  currentDrawValue.value = 1
}

const handlePointerLeave = (event: PointerEvent): void => {
  if (interaction.value.kind === 'idle' && event.pointerType !== 'touch') {
    hoverCell.value = null
  }
}

const handleWheel = (event: WheelEvent): void => {
  if (!event.ctrlKey && !event.metaKey) return
  const bounds = viewportRef.value?.getBoundingClientRect()
  if (!bounds) return
  event.preventDefault()
  applyZoom(cellSize.value + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })
}

const handleContextMenu = (event: MouseEvent): void => {
  if (
    props.drawMode === 'doubleButtonDraw' &&
    gridRef.value?.contains(event.target as Node)
  ) {
    event.preventDefault()
  }
}

const clearSelection = (): void => {
  selectionRect.value = null
}

const selectionPayload = () => {
  const rectangle = normalizedSelection.value
  if (!rectangle) return null
  const data = extractSelection(props.gridData, rectangle)
  return {
    data,
    width: data[0]?.length ?? 0,
    height: data.length,
    originalRect: rectangle,
  }
}

const copyToSystemClipboard = async (data: GridData): Promise<void> => {
  if (!navigator.clipboard?.writeText) return
  const text = `UNICUCUMBER/1\n${data.map((row) => row.join('')).join('\n')}`
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.info(
      'System clipboard unavailable; internal glyph clipboard remains available.',
      error,
    )
  }
}

const handleCopy = (): void => {
  const payload = selectionPayload()
  if (!payload) return
  clipboard.copy(payload)
  void copyToSystemClipboard(payload.data)
  emit('clipboard-change', true)
}

const handleCut = (): void => {
  const payload = selectionPayload()
  if (!payload || !normalizedSelection.value) return
  clipboard.cut(payload)
  void copyToSystemClipboard(payload.data)
  emit('command', {
    type: 'deleteSelection',
    rectangle: normalizedSelection.value,
  })
  clearSelection()
  emit('clipboard-change', true)
}

const setPasteTarget = (target: GridPosition): void => {
  const data = clipboard.clipboardData.value
  if (!data) return
  pasteTarget.value = clampSelectionPosition(
    target,
    Math.min(data.width, gridWidth.value),
    Math.min(data.height, props.gridData.length),
    gridWidth.value,
    props.gridData.length,
  )
}

const handlePaste = (): void => {
  if (!clipboard.enterPasteMode()) return
  const target = normalizedSelection.value
    ? {
        row: normalizedSelection.value.startRow,
        col: normalizedSelection.value.startCol,
      }
    : { row: 0, col: 0 }
  setPasteTarget(target)
  emit('paste-start')
}

const confirmPaste = (): void => {
  const data = clipboard.clipboardData.value
  if (!data) return
  emit('command', {
    type: 'pasteSelection',
    data: data.data.map((row) =>
      row.map((cell): GridCell => (cell === 1 ? 1 : 0)),
    ),
    target: pasteTarget.value,
  })
  selectionRect.value = pasteRectangle.value
  clipboard.exitPasteMode()
}

const cancelPaste = (): void => clipboard.exitPasteMode()

const nudgePaste = (row: number, col: number): void => {
  setPasteTarget({
    row: pasteTarget.value.row + row,
    col: pasteTarget.value.col + col,
  })
}

const handleDelete = (): void => {
  if (!normalizedSelection.value) return
  emit('command', {
    type: 'deleteSelection',
    rectangle: normalizedSelection.value,
  })
}

const handleDuplicate = (): void => {
  const payload = selectionPayload()
  const rectangle = normalizedSelection.value
  if (!payload || !rectangle) return
  clipboard.copy(payload)
  emit('clipboard-change', true)
  const target = clampSelectionPosition(
    { row: rectangle.startRow + 1, col: rectangle.startCol + 1 },
    payload.width,
    payload.height,
    gridWidth.value,
    props.gridData.length,
  )
  emit('command', {
    type: 'pasteSelection',
    data: payload.data,
    target,
  })
  selectionRect.value = {
    startRow: target.row,
    startCol: target.col,
    endRow: target.row + payload.height - 1,
    endCol: target.col + payload.width - 1,
  }
}

const handleSelectAll = (): void => {
  selectionRect.value = {
    startRow: 0,
    startCol: 0,
    endRow: props.gridData.length - 1,
    endCol: gridWidth.value - 1,
  }
}

const nudgeSelection = (row: number, col: number): void => {
  const rectangle = normalizedSelection.value
  if (!rectangle) return
  const width = rectangle.endCol - rectangle.startCol + 1
  const height = rectangle.endRow - rectangle.startRow + 1
  const target = clampSelectionPosition(
    { row: rectangle.startRow + row, col: rectangle.startCol + col },
    width,
    height,
    gridWidth.value,
    props.gridData.length,
  )
  if (target.row === rectangle.startRow && target.col === rectangle.startCol)
    return
  emit('command', { type: 'moveSelection', rectangle, target })
  selectionRect.value = {
    startRow: target.row,
    startCol: target.col,
    endRow: target.row + height - 1,
    endCol: target.col + width - 1,
  }
}

const handleKeyDown = (event: KeyboardEvent): void => {
  const modifier = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (modifier && key === 'c') handleCopy()
  else if (modifier && key === 'x') handleCut()
  else if (modifier && key === 'v') handlePaste()
  else if (modifier && key === 'a') handleSelectAll()
  else if (key === 'delete' || key === 'backspace') handleDelete()
  else if (key === 'escape') {
    if (clipboard.isPasteMode.value) cancelPaste()
    else if (interaction.value.kind !== 'idle') cancelInteraction()
    else clearSelection()
  } else if (event.key === 'Enter' && clipboard.isPasteMode.value)
    confirmPaste()
  else if (event.key === 'ArrowUp') nudgeSelection(-1, 0)
  else if (event.key === 'ArrowDown') nudgeSelection(1, 0)
  else if (event.key === 'ArrowLeft') nudgeSelection(0, -1)
  else if (event.key === 'ArrowRight') nudgeSelection(0, 1)
  else return
  event.preventDefault()
  event.stopPropagation()
}

let resizeObserver: ResizeObserver | null = null
const handleViewportChange = (): void => {
  if (fitMode.value) void fitToScreen()
  else nextTick(clampPan)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(handleViewportChange)
  if (viewportRef.value) resizeObserver.observe(viewportRef.value)
  window.visualViewport?.addEventListener('resize', handleViewportChange)
  window.addEventListener('blur', cancelInteraction)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void fitToScreen()
})

const handleVisibilityChange = (): void => {
  if (document.visibilityState !== 'visible') cancelInteraction()
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.visualViewport?.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('blur', cancelInteraction)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(
  () => props.currentTool,
  (tool) => {
    cancelInteraction()
    if (tool !== 'select') clearSelection()
    if (tool !== 'select' && clipboard.isPasteMode.value) {
      clipboard.exitPasteMode()
    }
    emit('tool-change', tool)
  },
)

watch(
  () => props.gridData[0]?.length,
  () => {
    clearSelection()
    if (fitMode.value) void fitToScreen()
  },
)

watch(normalizedSelection, (selection) => {
  emit('selection-change', selection !== null)
})

watch(clipboard.clipboardData, () => {
  emit('clipboard-change', clipboard.hasClipboardData())
})

defineExpose({
  clipboard,
  drawing,
  handleCopy,
  handleCut,
  handlePaste,
  handleSelectAll,
  handleDelete,
  handleDuplicate,
  nudgeSelection,
  confirmPaste,
  cancelPaste,
  clearSelection,
  fitToScreen,
  resetView,
  zoomBy,
})
</script>

<style scoped>
.workspace {
  width: min(100%, var(--workspace-max));
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.workspace-toolbar {
  box-sizing: border-box;
  width: min(100%, var(--editor-flow-max));
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--background-light);
}

.workspace-metadata {
  min-width: 0;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding-inline-start: var(--space-2);
  border-inline-start: 1px solid var(--border-color);
}

.view-controls button,
.context-toolbar button {
  min-width: var(--control-height-compact);
  min-height: var(--control-height-compact);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
}

.view-controls button:hover,
.view-controls button:focus-visible,
.view-controls button.active,
.context-toolbar button:hover,
.context-toolbar button:focus-visible {
  border-color: var(--border-hover);
  background: var(--background-hover);
}

.zoom-value {
  min-width: 3.4rem;
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.8rem;
  text-align: center;
}

.grid-viewport {
  width: min(100%, var(--editor-flow-max));
  min-height: 260px;
  position: relative;
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: none;
  outline: none;
  border-radius: 2px;
}

.grid-viewport:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.grid-viewport.panning {
  cursor: grabbing;
}

.grid-container {
  --cell-size: 25px;
  width: fit-content;
  display: grid;
  grid-auto-rows: var(--cell-size);
  gap: 0;
  position: absolute;
  inset: 0 auto auto 0;
  transform-origin: 0 0;
  will-change: transform;
  -webkit-touch-callout: none;
  user-select: none;
}

.header-row,
.grid-row {
  display: contents;
}

.corner-cell,
.header-cell,
.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  box-sizing: border-box;
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  font-family: var(--monospace-font);
  font-size: max(9px, calc(var(--cell-size) * 0.55));
}

.header-cell.alternate {
  color: var(--danger-color);
}

.cell {
  background: white;
  box-shadow: inset 0 0 0 0.3px var(--primary-darker);
}

.cell.filled {
  background: black;
}

.cell:not(.bordered) {
  box-shadow: inset 0 0 0 0.3px
    color-mix(in srgb, var(--primary-darker) 45%, transparent);
}

.preview-cell {
  position: absolute;
  z-index: 4;
  background: black;
  opacity: 0.72;
  pointer-events: none;
}

.preview-cell.erase {
  background: white;
  box-shadow: inset 0 0 0 1px var(--danger-color);
}

.selection-overlay,
.paste-overlay {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  border: 2px dashed var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  pointer-events: none;
}

.selection-overlay.moving {
  border-style: solid;
}

.paste-overlay {
  display: grid;
  grid-template-columns: repeat(var(--paste-columns, 1), var(--cell-size));
  border-color: var(--info-color);
  opacity: 0.8;
  overflow: hidden;
}

.paste-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  background: white;
  box-shadow: inset 0 0 0 0.3px var(--primary-darker);
}

.paste-cell.filled {
  background: black;
}

.context-toolbar {
  max-width: calc(100% - 1rem);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
  padding: 0.35rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-light);
  box-shadow: 0 2px 6px var(--modal-overlay);
}

.context-toolbar button {
  flex: 0 0 auto;
  padding: 0.45rem 0.65rem;
  font-family: var(--normal-font);
  white-space: nowrap;
}

.context-toolbar .confirm {
  background: var(--primary-color);
  color: white;
}

.nudge-controls {
  display: flex;
  gap: 2px;
}

.nudge-controls button {
  padding: 0;
  font-size: 1.1rem;
}

@media (max-width: 899px) {
  .workspace-toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
  }

  .view-controls {
    justify-content: center;
    padding: 0.25rem 0 0;
    border-inline-start: 0;
    border-top: 1px solid var(--border-color);
  }
}

@container (max-width: 38rem) {
  .workspace-toolbar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
  }

  .view-controls {
    justify-content: center;
    padding: 0.25rem 0 0;
    border-inline-start: 0;
    border-top: 1px solid var(--border-color);
  }
}

@media (max-width: 719px) {
  .workspace {
    width: 100%;
    gap: 0;
  }

  .workspace-toolbar {
    width: 100%;
    padding: 0.3rem;
    border-radius: var(--radius-sm);
  }

  .view-controls {
    justify-content: center;
  }

  .view-controls button {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }

  .grid-viewport {
    width: calc(
      100vw - max(0.5rem, env(safe-area-inset-left)) -
        max(0.5rem, env(safe-area-inset-right))
    );
    max-width: 100%;
  }

  .context-toolbar {
    position: sticky;
    bottom: calc(4.25rem + env(safe-area-inset-bottom));
    z-index: 40;
  }
}

@container (max-width: 48rem) {
  .selection-toolbar button span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid-container,
  .view-controls button,
  .context-toolbar button {
    transition: none;
  }
}
</style>
