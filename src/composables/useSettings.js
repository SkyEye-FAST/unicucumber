import { ref, watch } from 'vue'

const SETTINGS_KEY = 'unicucumber_settings'

export function useSettings() {
  const defaultSettings = {
    glyphWidth: 16,
    drawMode: 'singleButtonDraw',
    cursorEffect: true,
  }

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 确保所有必需的设置都存在
        return {
          ...defaultSettings,
          ...parsed,
          glyphWidth: parsed?.glyphWidth === 8 ? 8 : 16, // 确保宽度值有效
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
