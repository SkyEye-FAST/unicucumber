import { describe, expect, it, vi } from 'vitest'

import {
  defaultSettings,
  FONT_LIST,
  parseSettings,
  SETTINGS_BASELINE,
  SETTINGS_VERSION,
} from './useSettings'

describe('settings parsing and baseline reset', () => {
  it('keeps valid persisted values and supplies defaults for missing settings', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        glyphWidth: 8,
        drawMode: 'doubleButtonDraw',
      }),
    ).toMatchObject({
      glyphWidth: 8,
      drawMode: 'doubleButtonDraw',
      enableSelection: defaultSettings.enableSelection,
      glyphLibraryDensity: defaultSettings.glyphLibraryDensity,
      glyphManagerPushEditor: true,
      lightGlyphForegroundColor: defaultSettings.lightGlyphForegroundColor,
      lightGlyphBackgroundColor: defaultSettings.lightGlyphBackgroundColor,
      darkGlyphForegroundColor: defaultSettings.darkGlyphForegroundColor,
      darkGlyphBackgroundColor: defaultSettings.darkGlyphBackgroundColor,
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

  it('keeps a valid glyph-library density only on the current baseline', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        glyphLibraryDensity: 'compact',
      }),
    ).toMatchObject({ glyphLibraryDensity: 'compact' })
    expect(
      parseSettings({
        version: SETTINGS_VERSION - 1,
        glyphLibraryDensity: 'compact',
      }),
    ).toEqual(defaultSettings)
  })

  it('keeps the selection-tool preference', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        enableSelection: false,
      }),
    ).toMatchObject({ enableSelection: false })
  })

  it('keeps the desktop glyph-manager layout preference', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        glyphManagerPushEditor: false,
      }),
    ).toMatchObject({
      glyphManagerPushEditor: false,
    })
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        glyphManagerPushEditor: 'yes',
      }),
    ).toMatchObject({
      glyphManagerPushEditor: true,
    })
  })

  it('keeps valid import, export, and workflow preferences', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
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

  it('keeps valid theme-specific glyph colors and rejects malformed values', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        baseline: SETTINGS_BASELINE,
        lightGlyphForegroundColor: '#A1B2C3',
        lightGlyphBackgroundColor: 'white',
        darkGlyphForegroundColor: '#102030',
        darkGlyphBackgroundColor: '#12345g',
      }),
    ).toMatchObject({
      lightGlyphForegroundColor: '#a1b2c3',
      lightGlyphBackgroundColor: defaultSettings.lightGlyphBackgroundColor,
      darkGlyphForegroundColor: '#102030',
      darkGlyphBackgroundColor: defaultSettings.darkGlyphBackgroundColor,
    })
  })

  it('resets every older settings record, including custom font stacks', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION - 1,
        browserPreviewFont: '"Custom CJK", serif',
        glyphPreviewMode: 'both',
      }),
    ).toEqual(defaultSettings)
  })

  it('resets a historical version 1 record without the new baseline marker', () => {
    expect(
      parseSettings({
        version: SETTINGS_VERSION,
        glyphPreviewMode: 'both',
      }),
    ).toEqual(defaultSettings)
  })

  it('puts Google Fonts Noto Sans CJK names before local CJK variants', () => {
    expect(FONT_LIST.indexOf('Noto Sans SC')).toBeLessThan(
      FONT_LIST.indexOf('Noto Sans CJK SC'),
    )
    expect(FONT_LIST.indexOf('Noto Sans TC')).toBeLessThan(
      FONT_LIST.indexOf('Noto Sans CJK TC'),
    )
  })

  it('puts the loaded Plangothic family before its local aliases', () => {
    expect(FONT_LIST.indexOf('Plangothic')).toBeLessThan(
      FONT_LIST.indexOf('Plangothic P1'),
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

  it('replaces old localStorage settings with the new version 1 baseline', async () => {
    window.localStorage.setItem(
      'unicucumber_settings',
      JSON.stringify({ version: 8, glyphWidth: 8, glyphPreviewMode: 'both' }),
    )
    vi.resetModules()

    const settingsModule = await import('./useSettings')
    expect(settingsModule.useSettings().settings.value).toEqual(
      settingsModule.defaultSettings,
    )
    expect(
      JSON.parse(
        window.localStorage.getItem(settingsModule.SETTINGS_KEY) ?? '{}',
      ),
    ).toMatchObject({
      version: settingsModule.SETTINGS_VERSION,
      baseline: settingsModule.SETTINGS_BASELINE,
      glyphWidth: settingsModule.defaultSettings.glyphWidth,
    })
  })
})
