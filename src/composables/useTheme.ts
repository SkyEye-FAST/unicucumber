import { computed, readonly, ref } from 'vue'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'auto'>

export const THEME_PREFERENCE_KEY = 'unicucumber_theme_preference'
export const LEGACY_THEME_KEYS = ['theme', 'unicucumber_theme'] as const

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

const preference = ref<ThemePreference>('auto')
const resolvedTheme = ref<ResolvedTheme>('light')
const isDark = computed(() => resolvedTheme.value === 'dark')

let mediaQuery: MediaQueryList | null = null
let listenerAttached = false
let initialized = false

const parseStoredPreference = (value: unknown): ThemePreference | null => {
  if (typeof value === 'boolean') return value ? 'dark' : 'light'
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (normalized === 'auto' || normalized === 'system') return 'auto'
  if (normalized === 'light' || normalized === 'false') return 'light'
  if (normalized === 'dark' || normalized === 'true') return 'dark'

  try {
    return parseStoredPreference(JSON.parse(value))
  } catch {
    return null
  }
}

const persistPreference = (value: ThemePreference): boolean => {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, value)
    return true
  } catch {
    return false
  }
}

const loadPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'auto'

  try {
    const stored = window.localStorage.getItem(THEME_PREFERENCE_KEY)
    if (stored !== null) {
      const parsed = parseStoredPreference(stored) ?? 'auto'
      persistPreference(parsed)
      return parsed
    }

    for (const key of LEGACY_THEME_KEYS) {
      const legacyValue = window.localStorage.getItem(key)
      if (legacyValue === null) continue
      const migrated = parseStoredPreference(legacyValue)
      if (migrated === null) continue

      if (persistPreference(migrated)) {
        for (const legacyKey of LEGACY_THEME_KEYS) {
          window.localStorage.removeItem(legacyKey)
        }
      }
      return migrated
    }
  } catch {
    return 'auto'
  }

  persistPreference('auto')
  return 'auto'
}

const getSystemTheme = (): ResolvedTheme =>
  mediaQuery?.matches ? 'dark' : 'light'

const applyResolvedTheme = (): void => {
  const nextTheme =
    preference.value === 'auto' ? getSystemTheme() : preference.value
  resolvedTheme.value = nextTheme

  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
}

const handleSystemThemeChange = (): void => {
  if (preference.value === 'auto') applyResolvedTheme()
}

const removeSystemListener = (): void => {
  if (!mediaQuery || !listenerAttached) return
  mediaQuery.removeEventListener('change', handleSystemThemeChange)
  listenerAttached = false
}

const syncSystemListener = (): void => {
  if (!mediaQuery || !initialized) return
  if (preference.value === 'auto' && !listenerAttached) {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    listenerAttached = true
  } else if (preference.value !== 'auto') {
    removeSystemListener()
  }
}

export const initializeTheme = (): void => {
  if (typeof window === 'undefined') return
  if (!mediaQuery) mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)

  if (!initialized) {
    preference.value = loadPreference()
    initialized = true
  }

  syncSystemListener()
  applyResolvedTheme()
}

export const setThemePreference = (value: ThemePreference): void => {
  if (!initialized) initializeTheme()
  preference.value = parseStoredPreference(value) ?? 'auto'
  persistPreference(preference.value)
  syncSystemListener()
  applyResolvedTheme()
}

export const disposeTheme = (): void => {
  removeSystemListener()
  mediaQuery = null
  initialized = false
}

export function useTheme() {
  return {
    preference: readonly(preference),
    resolvedTheme: readonly(resolvedTheme),
    isDark,
    setPreference: setThemePreference,
  }
}
