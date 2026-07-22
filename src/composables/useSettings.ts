import { ref, watch } from 'vue'

import type {
  DrawMode,
  EditorSettings,
  GlyphLibraryDensity,
  GlyphPreviewMode,
  GlyphWidth,
} from '@/types/glyph'

export const SETTINGS_KEY = 'unicucumber_settings'
const SETTINGS_VERSION = 3

export const FONT_LIST = [
  'Noto Sans',
  'Noto Sans SC',
  'Noto Sans CJK SC',
  'Noto Sans TC',
  'Noto Sans CJK TC',
  'Noto Sans HK',
  'Noto Sans CJK HK',
  'Noto Sans JP',
  'Noto Sans CJK JP',
  'Noto Sans KR',
  'Noto Sans CJK KR',
  'Noto Serif SC',
  'Noto Serif CJK SC',
  'Noto Serif TC',
  'Noto Serif CJK TC',
  'Noto Serif JP',
  'Noto Serif CJK JP',
  'Noto Serif KR',
  'Noto Serif CJK KR',
  'MiSans',
  'MiSans VF',
  'vivo Sans',
  'HarmonyOS Sans SC',
  'Alibaba PuHuiTi 3.0',
  'OPPO Sans',
  'Smiley Sans',
  'LXGW WenKai',
  'LXGW WenKai Mono',
  'Sarasa Gothic SC',
  'Sarasa Gothic TC',
  'Sarasa Gothic J',
  'Sarasa Gothic K',
  'Source Han Sans SC',
  'Source Han Sans TC',
  'Source Han Sans CN',
  'Source Han Sans TW',
  'Source Han Sans HC',
  'Source Han Sans JP',
  'Source Han Sans K',
  'WenQuanYi Zen Hei',
  'WenQuanYi Micro Hei',
  'Droid Sans Fallback',
  'Microsoft YaHei',
  'Microsoft JhengHei',
  'SimHei',
  'SimSun',
  'NSimSun',
  'KaiTi',
  'FangSong',
  'DengXian',
  'PingFang SC',
  'PingFang TC',
  'PingFang HK',
  'Hiragino Sans GB',
  'Hiragino Kaku Gothic ProN',
  'Yu Gothic',
  'Meiryo',
  'Malgun Gothic',
  'Apple SD Gothic Neo',
  'Plangothic P1',
  'Plangothic P2',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  'sans-serif',
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

const createFontStack = (fonts: readonly string[]): string =>
  fonts
    .map((font) =>
      font.includes(' ') || font.includes('-') ? `"${font}"` : font,
    )
    .join(', ')

const defaultFontStack = createFontStack(FONT_LIST)

// Version 2's stock value is migrated so that users who never changed this
// setting receive the expanded fallback stack, while custom stacks stay intact.
const previousDefaultFontStack = createFontStack([
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
])

export const defaultSettings: Readonly<EditorSettings> = {
  glyphWidth: 16,
  drawMode: 'singleButtonDraw',
  alwaysShowMouseCursor: false,
  showBorder: true,
  confirmClear: true,
  glyphPreviewMode: 'pixelOnly',
  glyphLibraryDensity: 'comfortable',
  browserPreviewFont: defaultFontStack,
  enableSelection: true,
}

type StoredSettings = Partial<EditorSettings> & { version?: number }

const isGlyphWidth = (value: unknown): value is GlyphWidth =>
  value === 8 || value === 16
const isDrawMode = (value: unknown): value is DrawMode =>
  value === 'singleButtonDraw' || value === 'doubleButtonDraw'
const isPreviewMode = (value: unknown): value is GlyphPreviewMode =>
  value === 'pixelOnly' || value === 'browserOnly' || value === 'both'
const isGlyphLibraryDensity = (value: unknown): value is GlyphLibraryDensity =>
  value === 'compact' || value === 'comfortable' || value === 'large'

export const parseSettings = (value: unknown): EditorSettings => {
  const stored =
    value !== null && typeof value === 'object' ? (value as StoredSettings) : {}
  const storedPreviewFont =
    typeof stored.browserPreviewFont === 'string' &&
    stored.browserPreviewFont.trim().length > 0
      ? stored.browserPreviewFont
      : null
  const shouldMigratePreviewFont =
    storedPreviewFont !== null &&
    (stored.version === undefined || stored.version < SETTINGS_VERSION) &&
    storedPreviewFont === previousDefaultFontStack

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
    glyphLibraryDensity: isGlyphLibraryDensity(stored.glyphLibraryDensity)
      ? stored.glyphLibraryDensity
      : defaultSettings.glyphLibraryDensity,
    browserPreviewFont:
      storedPreviewFont !== null && !shouldMigratePreviewFont
        ? storedPreviewFont
        : defaultSettings.browserPreviewFont,
    enableSelection: true,
  }
}

const loadSettings = (): EditorSettings => {
  if (typeof window === 'undefined') return { ...defaultSettings }
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY)
    if (stored === null) return { ...defaultSettings }

    const parsed = JSON.parse(stored)
    const loadedSettings = parseSettings(parsed)
    const storedSettings =
      parsed !== null && typeof parsed === 'object'
        ? (parsed as StoredSettings)
        : null

    if (
      storedSettings?.browserPreviewFont === previousDefaultFontStack &&
      loadedSettings.browserPreviewFont === defaultSettings.browserPreviewFont
    ) {
      try {
        window.localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify({ version: SETTINGS_VERSION, ...loadedSettings }),
        )
      } catch {
        // The in-memory migration is still usable when storage is unavailable.
      }
    }

    return loadedSettings
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
