import { ref, watch } from 'vue'

export function useSettings() {
  const getGlyphWidth = () => {
    const width = parseInt(localStorage.getItem('glyphWidth')) || 16
    return width === 8 || width === 16 ? width : 16
  }

  const drawMode = ref(localStorage.getItem('drawMode') || 'singleButtonDraw')
  const cursorEffect = ref(JSON.parse(localStorage.getItem('cursorEffect') ?? 'true'))
  const glyphWidth = ref(getGlyphWidth())
  const showSettings = ref(false)

  watch([drawMode, cursorEffect, glyphWidth], () => {
    try {
      localStorage.setItem('drawMode', drawMode.value)
      localStorage.setItem('cursorEffect', JSON.stringify(cursorEffect.value))
      localStorage.setItem('glyphWidth', glyphWidth.value.toString())
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  })

  const saveSettings = () => {
    showSettings.value = false
  }

  return {
    drawMode,
    cursorEffect,
    glyphWidth,
    showSettings,
    saveSettings,
  }
}
