<template>
  <canvas
    ref="canvas"
    :width="width"
    :height="16"
    :style="{
      width: getCanvasWidth,
      height: getCanvasHeight,
    }"
    :class="{ tablet: isTablet, mobile: isMobile }"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'

const props = defineProps({
  hexValue: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  displayMode: {
    type: String,
    default: 'list', // 'list', 'editor'
  },
})

const canvas = ref<HTMLCanvasElement | null>(null)

const isTablet = computed(() => {
  return window.matchMedia(
    '(orientation: portrait) and (min-width: 768px) and (max-width: 1024px)',
  ).matches
})

const isMobile = computed(() => {
  return window.matchMedia('(orientation: portrait) and (max-width: 767px)')
    .matches
})

const getCanvasWidth = computed(() => {
  const baseWidth = props.width === 8 ? 16 : 32

  if (props.displayMode === 'editor') {
    if (isMobile.value) {
      return props.width === 8 ? '16px' : '32px'
    }
    if (isTablet.value) {
      return props.width === 8 ? '24px' : '48px'
    }
    if (
      window.matchMedia('(orientation: portrait) and (min-width: 1023px)')
        .matches
    ) {
      return props.width === 8 ? '32px' : '64px'
    }
    return `${baseWidth}px`
  } else {
    if (isMobile.value) {
      return props.width === 8 ? '24px' : '48px'
    }
    if (isTablet.value) {
      return props.width === 8 ? '32px' : '64px'
    }
    if (
      window.matchMedia('(orientation: portrait) and (min-width: 1023px)')
        .matches
    ) {
      return props.width === 8 ? '48px' : '96px'
    }
    return `${baseWidth}px`
  }
})

const getCanvasHeight = computed(() => {
  if (props.displayMode === 'editor') {
    if (isMobile.value) {
      return '32px'
    }
    if (isTablet.value) {
      return '48px'
    }
    if (
      window.matchMedia('(orientation: portrait) and (min-width: 1024px)')
        .matches
    ) {
      return '64px'
    }
    return '32px'
  } else {
    if (isMobile.value) {
      return '48px'
    }
    if (isTablet.value) {
      return '64px'
    }
    if (
      window.matchMedia('(orientation: portrait) and (min-width: 1024px)')
        .matches
    ) {
      return '96px'
    }
    return '32px'
  }
})

const drawGlyph = () => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d', {
    alpha: false,
    willReadFrequently: false,
  }) as CanvasRenderingContext2D

  try {
    ctx.clearRect(0, 0, props.width, 16)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, props.width, 16)

    const expectedLength = props.width === 8 ? 32 : 64
    const hexLength = props.hexValue.length

    if (!props.hexValue || hexLength !== expectedLength) {
      return
    }

    if (!/^[0-9A-Fa-f]*$/i.test(props.hexValue)) {
      return
    }

    const bits = new Uint8Array(props.width * 16)
    const bytes = (props.hexValue.match(/.{1,2}/g) ?? []).map((byte) =>
      parseInt(byte, 16),
    )

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]
      if (byte === undefined) continue
      const offset = i * 8
      for (let bit = 0; bit < 8; bit++) {
        if (offset + bit < bits.length) {
          bits[offset + bit] = (byte >> (7 - bit)) & 1
        }
      }
    }

    ctx.fillStyle = 'black'
    for (let i = 0; i < bits.length; i++) {
      if (bits[i]) {
        const x = i % props.width
        const y = Math.floor(i / props.width)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  } catch (error) {
    console.warn('PixelPreview drawGlyph error:', error)
    try {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, props.width, 16)
    } catch (fallbackError) {
      console.error('PixelPreview fallback draw error:', fallbackError)
    }
  }
}

onMounted(() => {
  drawGlyph()
})

watch(
  [() => props.hexValue, () => props.width],
  () => {
    drawGlyph()
  },
  { flush: 'post' },
)
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
  background: white;
  flex: none;
}

.preview-grid {
  background-color: var(--background-light);
}

.preview-cell {
  border: 1px solid var(--border-color);
}

.preview-cell.filled {
  background-color: var(--text-color);
}
</style>
