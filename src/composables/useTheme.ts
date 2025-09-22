import { ref, watch } from 'vue'

import { usePreferredColorScheme, usePreferredDark } from '@vueuse/core'

const systemDark = usePreferredDark()
const preferredColor = usePreferredColorScheme()
const isDark = ref(systemDark.value)

export function useTheme() {
  const setTheme = (dark: boolean): void => {
    isDark.value = dark
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  }

  const toggleTheme = () => {
    setTheme(!isDark.value)
  }

  const initTheme = () => {
    setTheme(preferredColor.value === 'dark')

    watch(preferredColor, (newValue) => {
      setTheme(newValue === 'dark')
    })
  }

  return {
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
