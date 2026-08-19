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

import { useSettings } from '@/composables/useSettings'
import { useTheme } from '@/composables/useTheme'

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
    default: 'list', // 'list', 'editor', 'dialog'
  },
})

const { resolvedTheme } = useTheme()
const { settings } = useSettings()
const canvas = ref<HTMLCanvasElement | null>(null)

const activeGlyphColors = computed(() =>
  resolvedTheme.value === 'dark'
    ? {
        background: settings.value.darkGlyphBackgroundColor,
        foreground: settings.value.darkGlyphForegroundColor,
      }
    : {
        background: settings.value.lightGlyphBackgroundColor,
        foreground: settings.value.lightGlyphForegroundColor,
      },
)

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
  })
  if (!ctx) return

  const { background: backgroundColor, foreground: foregroundColor } =
    activeGlyphColors.value

  try {
    ctx.clearRect(0, 0, props.width, 16)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, props.width, 16)

    const expectedLength = (props.width * 16) / 4
    const hexLength = props.hexValue.length

    if (!props.hexValue || hexLength !== expectedLength) {
      return
    }

    if (!/^[0-9A-Fa-f]*$/i.test(props.hexValue)) {
      return
    }

    ctx.fillStyle = foregroundColor
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
      ctx.fillStyle = backgroundColor
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
  [() => props.hexValue, () => props.width, activeGlyphColors],
  () => {
    drawGlyph()
  },
  { flush: 'post' },
)
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
  background-color: var(--glyph-preview-background);
  flex: none;
}
</style>
