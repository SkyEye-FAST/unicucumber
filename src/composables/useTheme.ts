import { usePreferredDark, usePreferredColorScheme } from '@vueuse/core'
import { watch, ref } from 'vue'

const systemDark = usePreferredDark()
const preferredColor = usePreferredColorScheme()
const isDark = ref(systemDark.value)

export function useTheme() {
  const setTheme = (dark: boolean): void => {
    isDark.value = dark
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  }

  const toggleTheme = () => {
    setTheme(!isDark.value)
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme === 'dark')
    } else {
      setTheme(preferredColor.value === 'dark')
      watch(preferredColor, (newValue) => {
        if (!localStorage.getItem('theme')) {
          setTheme(newValue === 'dark')
        }
      })
    }
  }

  return {
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
