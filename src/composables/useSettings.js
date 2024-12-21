import { ref, watch } from 'vue'

export function useSettings() {
  const getCursorEffect = () => {
    try {
      return JSON.parse(localStorage.getItem('cursorEffect')) ?? true
    } catch {
      return true
    }
  }

  const drawMode = ref(localStorage.getItem('drawMode') || 'singleButtonDraw')
  const cursorEffect = ref(getCursorEffect())
  const showSettings = ref(false)

  watch([drawMode, cursorEffect], () => {
    try {
      localStorage.setItem('drawMode', drawMode.value)
      localStorage.setItem('cursorEffect', JSON.stringify(cursorEffect.value))
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
    showSettings,
    saveSettings,
  }
}
