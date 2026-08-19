import { nextTick } from 'vue'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import { defaultSettings, useSettings } from '@/composables/useSettings'
import {
  disposeTheme,
  initializeTheme,
  setThemePreference,
} from '@/composables/useTheme'

import PixelPreview from './PixelPreview.vue'

type FillOperation = {
  color: string
  height: number
  width: number
  x: number
  y: number
}

const installMatchMedia = (): void => {
  const mediaQuery = {
    matches: false,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as MediaQueryList

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('color-scheme')
  useSettings().settings.value = { ...defaultSettings }
  installMatchMedia()
  disposeTheme()
  initializeTheme()
})

afterEach(() => {
  useSettings().settings.value = { ...defaultSettings }
  disposeTheme()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PixelPreview theme rendering', () => {
  it('redraws when the theme or configured glyph colors change', async () => {
    const fills: FillOperation[] = []
    let fillStyle = ''
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
        fills.push({ color: fillStyle, height, width, x, y })
      }),
      get fillStyle() {
        return fillStyle
      },
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        fillStyle = String(value)
      },
    } as unknown as CanvasRenderingContext2D

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as never,
    )

    const wrapper = mount(PixelPreview, {
      props: {
        hexValue: `8${'0'.repeat(31)}`,
        width: 8,
      },
    })
    await nextTick()

    expect(fills.slice(0, 2)).toEqual([
      { color: '#f8f9fa', height: 16, width: 8, x: 0, y: 0 },
      { color: '#333333', height: 1, width: 1, x: 0, y: 0 },
    ])

    fills.length = 0
    setThemePreference('dark')
    await nextTick()

    expect(fills.slice(0, 2)).toEqual([
      { color: '#333333', height: 16, width: 8, x: 0, y: 0 },
      { color: '#e0e0e0', height: 1, width: 1, x: 0, y: 0 },
    ])

    fills.length = 0
    useSettings().settings.value = {
      ...useSettings().settings.value,
      darkGlyphBackgroundColor: '#102030',
      darkGlyphForegroundColor: '#fedcba',
    }
    await nextTick()

    expect(fills.slice(0, 2)).toEqual([
      { color: '#102030', height: 16, width: 8, x: 0, y: 0 },
      { color: '#fedcba', height: 1, width: 1, x: 0, y: 0 },
    ])
    wrapper.unmount()
  })
})
