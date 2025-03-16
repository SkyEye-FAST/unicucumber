import { ref } from 'vue'

const isDark = ref(false)

export function useTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const setTheme = (dark: boolean): void => {
    isDark.value = dark
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  }

  const toggleTheme = () => {
    setTheme(!isDark.value)
  }

  interface MediaQueryEvent {
    matches: boolean
  }

  const handleSystemThemeChange = (e: MediaQueryEvent): void => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches)
    }
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme === 'dark')
    } else {
      setTheme(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }
  }

  return {
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
