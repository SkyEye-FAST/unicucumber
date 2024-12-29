import { ref, watch } from 'vue'

export function useSettings() {
  const getValidWidth = (width) => {
    const parsed = parseInt(width)
    return parsed === 8 || parsed === 16 ? parsed : 16
  }

  const settings = ref({
    drawMode: localStorage.getItem('drawMode') || 'singleButtonDraw',
    cursorEffect: JSON.parse(localStorage.getItem('cursorEffect') ?? 'true'),
    glyphWidth: getValidWidth(localStorage.getItem('glyphWidth')),
  })

  const showSettings = ref(false)

  watch(
    () => settings.value,
    (newSettings) => {
      try {
        Object.entries(newSettings).forEach(([key, value]) => {
          localStorage.setItem(
            key,
            typeof value === 'boolean' ? JSON.stringify(value) : value,
          )
        })
      } catch (error) {
        console.error('Failed to save settings:', error)
      }
    },
    { deep: true },
  )

  return {
    settings,
    showSettings,
  }
}
