import { ref, watch } from 'vue'

import type {
  DrawMode,
  EditorSettings,
  GlyphPreviewMode,
  GlyphWidth,
} from '@/types/glyph'

export const SETTINGS_KEY = 'unicucumber_settings'
const SETTINGS_VERSION = 1

export const FONT_LIST = [
  'Noto Sans',
  'Noto Sans CJK SC',
  'Plangothic P1',
  'Plangothic P2',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'sans-serif',
  'Noto Sans CJK TC',
  'Noto Sans SC',
  'Noto Sans TC',
  'Source Han Sans SC',
  'Source Han Sans TC',
  'Source Han Sans CN',
  'Source Han Sans TW',
  'serif',
  'BabelStone Han',
  'FZSongS-Extended',
  'FZSongS-Extended(SIP)',
  'HanaMinA',
  'HanaMinB',
  'FZSong-Extended',
  'Arial Unicode MS',
  'DFSongStd',
  'STHeiti SC',
  'unifont',
  'SimSun-ExtG',
  'SimSun-ExtB',
  'TH-Tshyn-P16',
  'TH-Tshyn-P2',
  'TH-Tshyn-P1',
  'TH-Tshyn-P0',
  'Jigmo3',
  'Jigmo2',
  'Jigmo',
  'ZhongHuaSongPlane15',
  'ZhongHuaSongPlane02',
  'ZhongHuaSongPlane00',
] as const

const defaultFontStack = FONT_LIST.map((font) =>
  font.includes(' ') || font.includes('-') ? `"${font}"` : font,
).join(', ')

export const defaultSettings: Readonly<EditorSettings> = {
  glyphWidth: 16,
  drawMode: 'singleButtonDraw',
  alwaysShowMouseCursor: false,
  showBorder: true,
  confirmClear: true,
  glyphPreviewMode: 'pixelOnly',
  browserPreviewFont: defaultFontStack,
  enableSelection: false,
}

type StoredSettings = Partial<EditorSettings> & { version?: number }

const isGlyphWidth = (value: unknown): value is GlyphWidth =>
  value === 8 || value === 16
const isDrawMode = (value: unknown): value is DrawMode =>
  value === 'singleButtonDraw' || value === 'doubleButtonDraw'
const isPreviewMode = (value: unknown): value is GlyphPreviewMode =>
  value === 'pixelOnly' || value === 'browserOnly' || value === 'both'

export const parseSettings = (value: unknown): EditorSettings => {
  const stored =
    value !== null && typeof value === 'object' ? (value as StoredSettings) : {}

  return {
    glyphWidth: isGlyphWidth(stored.glyphWidth)
      ? stored.glyphWidth
      : defaultSettings.glyphWidth,
    drawMode: isDrawMode(stored.drawMode)
      ? stored.drawMode
      : defaultSettings.drawMode,
    alwaysShowMouseCursor:
      typeof stored.alwaysShowMouseCursor === 'boolean'
        ? stored.alwaysShowMouseCursor
        : defaultSettings.alwaysShowMouseCursor,
    showBorder:
      typeof stored.showBorder === 'boolean'
        ? stored.showBorder
        : defaultSettings.showBorder,
    confirmClear:
      typeof stored.confirmClear === 'boolean'
        ? stored.confirmClear
        : defaultSettings.confirmClear,
    glyphPreviewMode: isPreviewMode(stored.glyphPreviewMode)
      ? stored.glyphPreviewMode
      : defaultSettings.glyphPreviewMode,
    browserPreviewFont:
      typeof stored.browserPreviewFont === 'string' &&
      stored.browserPreviewFont.trim().length > 0
        ? stored.browserPreviewFont
        : defaultSettings.browserPreviewFont,
    enableSelection:
      typeof stored.enableSelection === 'boolean'
        ? stored.enableSelection
        : defaultSettings.enableSelection,
  }
}

const loadSettings = (): EditorSettings => {
  if (typeof window === 'undefined') return { ...defaultSettings }
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY)
    return stored === null
      ? { ...defaultSettings }
      : parseSettings(JSON.parse(stored))
  } catch {
    return { ...defaultSettings }
  }
}

const settings = ref<EditorSettings>(loadSettings())
const showSettings = ref(false)

watch(
  settings,
  (value) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ version: SETTINGS_VERSION, ...value }),
      )
    } catch {
      // Privacy mode and quota failures must not prevent editing.
    }
  },
  { deep: true },
)

export function useSettings() {
  return { settings, showSettings, defaultSettings }
}
