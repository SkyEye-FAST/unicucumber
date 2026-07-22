<template>
  <canvas
    ref="canvas"
    :width="width"
    :height="16"
    :style="{
      width: getCanvasWidth,
      height: getCanvasHeight,
    }"
  ></canvas>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

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

const getCanvasWidth = computed(() => {
  const scale = props.displayMode === 'editor' ? 2 : 3
  return `${props.width * scale}px`
})

const getCanvasHeight = computed(() => {
  return props.displayMode === 'editor' ? '32px' : '48px'
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

    ctx.fillStyle = 'black'
    for (let i = 0; i < props.width * 16; i++) {
      const nibble = Number.parseInt(
        props.hexValue.charAt(Math.floor(i / 4)),
        16,
      )
      if (((nibble >> (3 - (i % 4))) & 1) === 1) {
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
