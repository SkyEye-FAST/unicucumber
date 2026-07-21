import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MediaListener = (event: MediaQueryListEvent) => void

const installMatchMedia = (initialDark: boolean) => {
  let matches = initialDark
  const listeners = new Set<MediaListener>()

  const mediaQuery = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(
      (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener as MediaListener)
      },
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener as MediaListener)
      },
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as MediaQueryList

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  )

  return {
    mediaQuery,
    emit(nextDark: boolean) {
      matches = nextDark
      const event = { matches: nextDark, media: mediaQuery.media }
      for (const listener of listeners) {
        listener(event as MediaQueryListEvent)
      }
    },
  }
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('color-scheme')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('theme preference', () => {
  it('defaults to Auto and resolves the current light system theme', async () => {
    const system = installMatchMedia(false)
    const theme = await import('./useTheme')
    theme.initializeTheme()
    theme.initializeTheme()

    const state = theme.useTheme()
    expect(state.preference.value).toBe('auto')
    expect(state.resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('auto')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(system.mediaQuery.addEventListener).toHaveBeenCalledTimes(1)
    theme.disposeTheme()
    expect(system.mediaQuery.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('resolves Auto to a dark system theme', async () => {
    installMatchMedia(true)
    const theme = await import('./useTheme')
    theme.initializeTheme()

    expect(theme.useTheme().preference.value).toBe('auto')
    expect(theme.useTheme().resolvedTheme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    theme.disposeTheme()
  })

  it('updates Auto live without overwriting the persisted preference', async () => {
    const system = installMatchMedia(false)
    const theme = await import('./useTheme')
    theme.initializeTheme()

    system.emit(true)
    expect(theme.useTheme().resolvedTheme.value).toBe('dark')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('auto')

    system.emit(false)
    expect(theme.useTheme().resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('auto')
    theme.disposeTheme()
  })

  it('keeps manual Light stable and removes the system listener', async () => {
    const system = installMatchMedia(false)
    const theme = await import('./useTheme')
    theme.initializeTheme()
    theme.setThemePreference('light')

    system.emit(true)
    expect(theme.useTheme().resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('light')
    expect(system.mediaQuery.removeEventListener).toHaveBeenCalledTimes(1)
    theme.disposeTheme()
  })

  it('keeps manual Dark stable when the system changes', async () => {
    const system = installMatchMedia(true)
    const theme = await import('./useTheme')
    theme.initializeTheme()
    theme.setThemePreference('dark')

    system.emit(false)
    expect(theme.useTheme().resolvedTheme.value).toBe('dark')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('dark')
    theme.disposeTheme()
  })

  it('switches from a manual preference back to the current system theme', async () => {
    const system = installMatchMedia(false)
    const theme = await import('./useTheme')
    theme.initializeTheme()
    theme.setThemePreference('dark')
    system.emit(false)

    theme.setThemePreference('auto')
    expect(theme.useTheme().preference.value).toBe('auto')
    expect(theme.useTheme().resolvedTheme.value).toBe('light')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('auto')
    expect(system.mediaQuery.addEventListener).toHaveBeenCalledTimes(2)
    theme.disposeTheme()
  })

  it('preserves the selected preference across a module remount', async () => {
    installMatchMedia(false)
    const first = await import('./useTheme')
    first.initializeTheme()
    first.setThemePreference('dark')
    first.disposeTheme()

    vi.resetModules()
    installMatchMedia(false)
    const second = await import('./useTheme')
    second.initializeTheme()
    expect(second.useTheme().preference.value).toBe('dark')
    expect(second.useTheme().resolvedTheme.value).toBe('dark')
    second.disposeTheme()
  })

  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['true', 'dark'],
    ['false', 'light'],
    ['"dark"', 'dark'],
  ] as const)(
    'migrates legacy theme value %s to %s',
    async (stored, expected) => {
      localStorage.setItem('theme', stored)
      installMatchMedia(false)
      const theme = await import('./useTheme')
      theme.initializeTheme()

      expect(theme.useTheme().preference.value).toBe(expected)
      expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe(expected)
      expect(localStorage.getItem('theme')).toBeNull()
      theme.disposeTheme()
    },
  )

  it('falls back safely when the stored preference is invalid', async () => {
    localStorage.setItem('unicucumber_theme_preference', 'sepia')
    installMatchMedia(true)
    const theme = await import('./useTheme')
    theme.initializeTheme()

    expect(theme.useTheme().preference.value).toBe('auto')
    expect(theme.useTheme().resolvedTheme.value).toBe('dark')
    expect(localStorage.getItem(theme.THEME_PREFERENCE_KEY)).toBe('auto')
    theme.disposeTheme()
  })
})
