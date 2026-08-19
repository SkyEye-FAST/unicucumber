import { ref, watch } from 'vue'

import type {
  DrawMode,
  EditorSettings,
  AutoSaveInterval,
  ExportScale,
  GlyphLibraryDensity,
  GlyphPreviewMode,
  ImageImportMode,
} from '@/types/glyph'
import { isGlyphWidth } from '@/utils/hexUtils'

export const SETTINGS_KEY = 'unicucumber_settings'
export const SETTINGS_VERSION = 1
export const SETTINGS_BASELINE = '2026-07-settings-reset'

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
  'Plangothic',
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

export const defaultSettings: Readonly<EditorSettings> = {
  glyphWidth: 16,
  drawMode: 'singleButtonDraw',
  alwaysShowMouseCursor: false,
  showBorder: true,
  lightGlyphForegroundColor: '#333333',
  lightGlyphBackgroundColor: '#f8f9fa',
  darkGlyphForegroundColor: '#e0e0e0',
  darkGlyphBackgroundColor: '#333333',
  glyphManagerPushEditor: true,
  confirmClear: true,
  glyphPreviewMode: 'pixelOnly',
  glyphLibraryDensity: 'comfortable',
  browserPreviewFont: defaultFontStack,
  enableSelection: true,
  exportScale: 8,
  exportTransparent: false,
  imageImportMode: 'fit',
  imageImportThreshold: 128,
  imageImportTransparentAsWhite: true,
  autoSaveEnabled: true,
  autoSaveInterval: 1000,
}

type StoredSettings = Partial<EditorSettings> & {
  baseline?: string
  version?: number
}

const isDrawMode = (value: unknown): value is DrawMode =>
  value === 'singleButtonDraw' || value === 'doubleButtonDraw'
const isPreviewMode = (value: unknown): value is GlyphPreviewMode =>
  value === 'pixelOnly' || value === 'browserOnly' || value === 'both'
const isGlyphLibraryDensity = (value: unknown): value is GlyphLibraryDensity =>
  value === 'compact' || value === 'comfortable' || value === 'large'
const isExportScale = (value: unknown): value is ExportScale =>
  value === 1 || value === 2 || value === 4 || value === 8 || value === 16
const isImageImportMode = (value: unknown): value is ImageImportMode =>
  value === 'fit' || value === 'crop'
const isImageImportThreshold = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 255
const isAutoSaveInterval = (value: unknown): value is AutoSaveInterval =>
  value === 500 ||
  value === 1000 ||
  value === 3000 ||
  value === 5000 ||
  value === 10000
const parseHexColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback

export const parseSettings = (value: unknown): EditorSettings => {
  const stored =
    value !== null && typeof value === 'object' ? (value as StoredSettings) : {}
  if (
    stored.version !== SETTINGS_VERSION ||
    stored.baseline !== SETTINGS_BASELINE
  ) {
    return { ...defaultSettings }
  }

  const storedPreviewFont =
    typeof stored.browserPreviewFont === 'string' &&
    stored.browserPreviewFont.trim().length > 0
      ? stored.browserPreviewFont
      : null

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
    lightGlyphForegroundColor: parseHexColor(
      stored.lightGlyphForegroundColor,
      defaultSettings.lightGlyphForegroundColor,
    ),
    lightGlyphBackgroundColor: parseHexColor(
      stored.lightGlyphBackgroundColor,
      defaultSettings.lightGlyphBackgroundColor,
    ),
    darkGlyphForegroundColor: parseHexColor(
      stored.darkGlyphForegroundColor,
      defaultSettings.darkGlyphForegroundColor,
    ),
    darkGlyphBackgroundColor: parseHexColor(
      stored.darkGlyphBackgroundColor,
      defaultSettings.darkGlyphBackgroundColor,
    ),
    glyphManagerPushEditor:
      typeof stored.glyphManagerPushEditor === 'boolean'
        ? stored.glyphManagerPushEditor
        : defaultSettings.glyphManagerPushEditor,
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
    browserPreviewFont: storedPreviewFont ?? defaultSettings.browserPreviewFont,
    enableSelection:
      typeof stored.enableSelection === 'boolean'
        ? stored.enableSelection
        : defaultSettings.enableSelection,
    exportScale: isExportScale(stored.exportScale)
      ? stored.exportScale
      : defaultSettings.exportScale,
    exportTransparent:
      typeof stored.exportTransparent === 'boolean'
        ? stored.exportTransparent
        : defaultSettings.exportTransparent,
    imageImportMode: isImageImportMode(stored.imageImportMode)
      ? stored.imageImportMode
      : defaultSettings.imageImportMode,
    imageImportThreshold: isImageImportThreshold(stored.imageImportThreshold)
      ? stored.imageImportThreshold
      : defaultSettings.imageImportThreshold,
    imageImportTransparentAsWhite:
      typeof stored.imageImportTransparentAsWhite === 'boolean'
        ? stored.imageImportTransparentAsWhite
        : defaultSettings.imageImportTransparentAsWhite,
    autoSaveEnabled:
      typeof stored.autoSaveEnabled === 'boolean'
        ? stored.autoSaveEnabled
        : defaultSettings.autoSaveEnabled,
    autoSaveInterval: isAutoSaveInterval(stored.autoSaveInterval)
      ? stored.autoSaveInterval
      : defaultSettings.autoSaveInterval,
  }
}

const persistSettings = (value: EditorSettings): void => {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        ...value,
      }),
    )
  } catch {
    // Privacy mode and quota failures must not prevent editing.
  }
}

const resetSettings = (): EditorSettings => {
  const settings = { ...defaultSettings }
  persistSettings(settings)
  return settings
}

const loadSettings = (): EditorSettings => {
  if (typeof window === 'undefined') return { ...defaultSettings }
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY)
    if (stored === null) return resetSettings()

    const parsed = JSON.parse(stored)
    const storedSettings =
      parsed !== null && typeof parsed === 'object'
        ? (parsed as StoredSettings)
        : null
    if (
      storedSettings?.version !== SETTINGS_VERSION ||
      storedSettings.baseline !== SETTINGS_BASELINE
    ) {
      return resetSettings()
    }

    return parseSettings(storedSettings)
  } catch {
    return resetSettings()
  }
}

const settings = ref<EditorSettings>(loadSettings())
const showSettings = ref(false)

const applyGlyphColors = (value: EditorSettings): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty(
    '--glyph-light-foreground-color',
    value.lightGlyphForegroundColor,
  )
  root.style.setProperty(
    '--glyph-light-background-color',
    value.lightGlyphBackgroundColor,
  )
  root.style.setProperty(
    '--glyph-dark-foreground-color',
    value.darkGlyphForegroundColor,
  )
  root.style.setProperty(
    '--glyph-dark-background-color',
    value.darkGlyphBackgroundColor,
  )
}

applyGlyphColors(settings.value)

watch(
  settings,
  (value) => {
    if (typeof window !== 'undefined') persistSettings(value)
    applyGlyphColors(value)
  },
  { deep: true },
)

export function useSettings() {
  return { settings, showSettings, defaultSettings }
}
