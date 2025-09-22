import { ref, watch } from 'vue'

const SETTINGS_KEY = 'unicucumber_settings'

export function useSettings() {
  const fontList = [
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
  ]

  const defaultSettings = {
    glyphWidth: 16,
    drawMode: 'singleButtonDraw',
    cursorEffect: true,
    showBorder: true,
    confirmClear: true,
    glyphPreviewMode: 'pixelOnly',
    browserPreviewFont: fontList
      .map((font) =>
        font.includes(' ') || font.includes('-') ? `"${font}"` : font,
      )
      .join(', '),
    enableSelection: false,
  }

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultSettings,
          ...parsed,
          glyphWidth: parsed?.glyphWidth === 8 ? 8 : 16,
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    return defaultSettings
  }

  const settings = ref(loadSettings())
  const showSettings = ref(false)

  watch(
    () => settings.value,
    (newSettings) => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
      } catch (error) {
        console.error('Error saving settings:', error)
      }
    },
    { deep: true },
  )

  return {
    settings,
    showSettings,
    defaultSettings,
  }
}
