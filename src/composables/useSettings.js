import { ref, watch } from 'vue'

const SETTINGS_KEY = 'unicucumber_settings'

export function useSettings() {
  const defaultSettings = {
    glyphWidth: 16,
    drawMode: 'singleButtonDraw',
    cursorEffect: true,
    showBorder: true,
    confirmClear: true,
    glyphPreviewMode: 'pixelOnly',
  }

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultSettings,
          ...parsed,
          glyphWidth: parsed?.glyphWidth === 8 ? 8 : 16,
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    return defaultSettings
  }

  const settings = ref(loadSettings())
  const showSettings = ref(false)

  watch(
    () => settings.value,
    (newSettings) => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
      } catch (error) {
        console.error('Error saving settings:', error)
      }
    },
    { deep: true },
  )

  return {
    settings,
    showSettings,
  }
}
