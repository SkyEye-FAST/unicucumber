<template>
  <canvas
    ref="canvas"
    :width="width"
    :height="16"
    :style="{
      width: props.width === 8 ? '16px' : '32px',
      height: '32px',
    }"
  ></canvas>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  hexValue: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
})

const canvas = ref(null)

const drawGlyph = () => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d', {
    alpha: false,
    willReadFrequently: false,
  })

  const bits = new Uint8Array(props.width * 16)
  const bytes = props.hexValue
    .match(/.{1,2}/g)
    .map((byte) => parseInt(byte, 16))

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    const offset = i * 8
    for (let bit = 0; bit < 8; bit++) {
      bits[offset + bit] = (byte >> (7 - bit)) & 1
    }
  }

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, props.width, 16)

  ctx.fillStyle = 'black'
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) {
      const x = i % props.width
      const y = Math.floor(i / props.width)
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

onMounted(() => {
  drawGlyph()
})

watch(() => props.hexValue, drawGlyph)
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
  background: white;
  flex: none;
}
</style>
