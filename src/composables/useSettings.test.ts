import { describe, expect, it } from 'vitest'

import { defaultSettings, FONT_LIST, parseSettings } from './useSettings'

describe('settings parsing and migration', () => {
  it('keeps valid persisted values and supplies defaults for missing settings', () => {
    expect(
      parseSettings({ glyphWidth: 8, drawMode: 'doubleButtonDraw' }),
    ).toMatchObject({
      glyphWidth: 8,
      drawMode: 'doubleButtonDraw',
      enableSelection: defaultSettings.enableSelection,
      glyphLibraryDensity: defaultSettings.glyphLibraryDensity,
    })
  })

  it('does not trust corrupted or invalid persisted values', () => {
    expect(
      parseSettings({
        glyphWidth: 12,
        drawMode: 'anything',
        browserPreviewFont: '',
        glyphLibraryDensity: 'tiny',
      }),
    ).toEqual(defaultSettings)
    expect(parseSettings(null)).toEqual(defaultSettings)
  })

  it('keeps a valid glyph-library density and migrates older settings', () => {
    expect(parseSettings({ glyphLibraryDensity: 'compact' })).toMatchObject({
      glyphLibraryDensity: 'compact',
    })
    expect(
      parseSettings({ version: 1, glyphPreviewMode: 'both' }),
    ).toMatchObject({
      glyphPreviewMode: 'both',
      glyphLibraryDensity: 'comfortable',
    })
  })

  it('keeps the selection-tool preference', () => {
    expect(parseSettings({ enableSelection: false })).toMatchObject({
      enableSelection: false,
    })
  })

  it('keeps valid import, export, and workflow preferences', () => {
    expect(
      parseSettings({
        exportScale: 4,
        exportTransparent: true,
        imageImportMode: 'crop',
        imageImportThreshold: 96,
        imageImportTransparentAsWhite: false,
        autoSaveEnabled: false,
        autoSaveInterval: 5000,
      }),
    ).toMatchObject({
      exportScale: 4,
      exportTransparent: true,
      imageImportMode: 'crop',
      imageImportThreshold: 96,
      imageImportTransparentAsWhite: false,
      autoSaveEnabled: false,
      autoSaveInterval: 5000,
    })
  })

  it('upgrades the unchanged version 2 preview-font default', () => {
    const version2DefaultFontStack =
      '"Noto Sans", "Noto Sans CJK SC", "Plangothic P1", "Plangothic P2", "ui-sans-serif", "system-ui", "-apple-system", BlinkMacSystemFont, "sans-serif", "Noto Sans CJK TC", "Noto Sans SC", "Noto Sans TC", "Source Han Sans SC", "Source Han Sans TC", "Source Han Sans CN", "Source Han Sans TW", serif, "BabelStone Han", "FZSongS-Extended", "FZSongS-Extended(SIP)", HanaMinA, HanaMinB, "FZSong-Extended", "Arial Unicode MS", DFSongStd, "STHeiti SC", unifont, "SimSun-ExtG", "SimSun-ExtB", "TH-Tshyn-P16", "TH-Tshyn-P2", "TH-Tshyn-P1", "TH-Tshyn-P0", Jigmo3, Jigmo2, Jigmo, ZhongHuaSongPlane15, ZhongHuaSongPlane02, ZhongHuaSongPlane00'

    expect(
      parseSettings({
        version: 2,
        browserPreviewFont: version2DefaultFontStack,
      }).browserPreviewFont,
    ).toBe(defaultSettings.browserPreviewFont)
  })

  it('retains a custom preview-font stack during migration', () => {
    expect(
      parseSettings({ version: 2, browserPreviewFont: '"Custom CJK", serif' })
        .browserPreviewFont,
    ).toBe('"Custom CJK", serif')
  })

  it('puts Google Fonts Noto Sans CJK names before local CJK variants', () => {
    expect(FONT_LIST.indexOf('Noto Sans SC')).toBeLessThan(
      FONT_LIST.indexOf('Noto Sans CJK SC'),
    )
    expect(FONT_LIST.indexOf('Noto Sans TC')).toBeLessThan(
      FONT_LIST.indexOf('Noto Sans CJK TC'),
    )
  })

  it('provides one app-scoped source to every consumer', async () => {
    const { useSettings } = await import('./useSettings')
    const first = useSettings()
    const second = useSettings()
    first.settings.value.showBorder = false
    expect(second.settings.value.showBorder).toBe(false)
    second.settings.value.showBorder = defaultSettings.showBorder
  })
})
