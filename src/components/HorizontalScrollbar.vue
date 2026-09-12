<template>
  <div
    ref="track"
    class="horizontal-scrollbar"
    role="scrollbar"
    tabindex="0"
    aria-orientation="horizontal"
    :aria-controls="controls"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="Math.round(range)"
    :aria-valuenow="Math.round(position)"
    :aria-disabled="range === 0"
    @keydown="handleKeydown"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="finishDrag"
    @pointercancel="finishDrag"
    @lostpointercapture="pointerId = null"
  >
    <div
      class="horizontal-scrollbar__thumb"
      :style="{
        width: `${thumbSize}px`,
        transform: `translateX(${thumbOffset}px)`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'

const props = defineProps<{
  controls: string
  label: string
  position: number
  viewportSize: number
  contentSize: number
}>()
const emit = defineEmits<{ scroll: [position: number] }>()
const track = ref<HTMLElement | null>(null)
const { width } = useElementSize(track)
const range = computed(() =>
  Math.max(0, props.contentSize - props.viewportSize),
)
const thumbSize = computed(() =>
  Math.min(
    width.value,
    Math.max(32, (width.value * props.viewportSize) / (props.contentSize || 1)),
  ),
)
const travel = computed(() => width.value - thumbSize.value)
const thumbOffset = computed(() =>
  range.value
    ? Math.min(1, Math.max(0, props.position / range.value)) * travel.value
    : 0,
)
let pointerId: number | null = null
let grabOffset = 0

const moveTo = (position: number) =>
  emit('scroll', Math.max(0, Math.min(range.value, position)))
const updatePointer = (clientX: number) => {
  if (!track.value || travel.value <= 0) return
  moveTo(
    ((clientX - track.value.getBoundingClientRect().left - grabOffset) /
      travel.value) *
      range.value,
  )
}
const startDrag = (event: PointerEvent) => {
  if (event.button !== 0 || !track.value || range.value === 0) return
  event.preventDefault()
  track.value.focus({ preventScroll: true })
  const thumb =
    event.target instanceof HTMLElement &&
    event.target.closest('.horizontal-scrollbar__thumb')
  grabOffset = thumb
    ? event.clientX - thumb.getBoundingClientRect().left
    : thumbSize.value / 2
  pointerId = event.pointerId
  track.value.setPointerCapture(event.pointerId)
  updatePointer(event.clientX)
}
const moveDrag = (event: PointerEvent) => {
  if (pointerId === event.pointerId) updatePointer(event.clientX)
}
const finishDrag = (event: PointerEvent) => {
  if (pointerId !== event.pointerId) return
  if (track.value?.hasPointerCapture(event.pointerId))
    track.value.releasePointerCapture(event.pointerId)
  pointerId = null
}
const handleKeydown = (event: KeyboardEvent) => {
  const destinations: Record<string, number> = {
    ArrowLeft: props.position - 40,
    ArrowRight: props.position + 40,
    PageUp: props.position - props.viewportSize,
    PageDown: props.position + props.viewportSize,
    Home: 0,
    End: range.value,
  }
  const position = destinations[event.key]
  if (position === undefined) return
  event.preventDefault()
  moveTo(position)
}
</script>

<style scoped>
.horizontal-scrollbar {
  position: relative;
  height: 16px;
  background: var(--scrollbar-track);
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
}
.horizontal-scrollbar:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
.horizontal-scrollbar__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  border-radius: 999px;
  background: var(--scrollbar-thumb);
  cursor: grab;
}
.horizontal-scrollbar:active .horizontal-scrollbar__thumb {
  cursor: grabbing;
}
</style>
