import { ref } from 'vue'

const isDark = ref(false)

export function useTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const setTheme = (dark) => {
    isDark.value = dark
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  }

  const toggleTheme = () => {
    setTheme(!isDark.value)
  }

  const handleSystemThemeChange = (e) => {
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
