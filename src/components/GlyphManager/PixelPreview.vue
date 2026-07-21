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
