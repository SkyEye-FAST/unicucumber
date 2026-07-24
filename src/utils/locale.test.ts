import { describe, expect, it } from 'vitest'

import en from '@/locales/en.json'
import zhCn from '@/locales/zh-cn.json'
import zhTw from '@/locales/zh-tw.json'

import { normalizeLocale } from './locale'

describe('locale normalization', () => {
  it.each([
    ['zh-Hans-CN', 'zh-CN'],
    ['zh_TW', 'zh-TW'],
    ['zh', 'zh'],
    ['en-GB', 'en'],
    [undefined, 'en'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected)
  })
})

describe('settings localization', () => {
  it.each([
    [en, ['Auto', 'Light', 'Dark', 'Follow system appearance']],
    [zhCn, ['自动', '浅色', '深色', '跟随系统外观']],
    [zhTw, ['自動', '淺色', '深色', '跟隨系統外觀']],
  ] as const)('defines every appearance preference label', (locale, labels) => {
    expect([
      locale.settings.appearance.auto,
      locale.settings.appearance.light,
      locale.settings.appearance.dark,
      locale.settings.appearance.follow_system,
    ]).toEqual(labels)
    expect(locale.settings.close_sidebar).toBeTruthy()
    expect(locale.settings.sections.general).toBeTruthy()
    expect(locale.settings.sections.canvas).toBeTruthy()
    expect(locale.settings.sections.glyph_preview).toBeTruthy()
    expect(locale.settings.sections.safety).toBeTruthy()
    expect(locale.settings.enable_selection).toBeTruthy()
    expect(locale.settings.glyph_library_density).toBeTruthy()
    expect(locale.settings.sections.import_export).toBeTruthy()
    expect(locale.settings.sections.workflow).toBeTruthy()
    expect(locale.settings.auto_save_enabled).toBeTruthy()
  })
})

describe('glyph-library localization', () => {
  it.each([en, zhCn, zhTw])(
    'defines the complete full-screen glyph-library vocabulary',
    (locale) => {
      const library = locale.glyph_manager.library
      expect(
        [
          library.expand,
          library.exit_fullscreen,
          library.title,
          library.density.compact,
          library.density.comfortable,
          library.density.large,
          library.selection_mode,
          library.select_filtered,
          library.clear_selection,
          library.selected_count,
          library.no_matches,
          library.open_in_editor,
          library.browser_preview,
          library.bitmap_preview,
        ].every(Boolean),
      ).toBe(true)
    },
  )
})
