import { describe, expect, it } from 'vitest'

import en from '@/locales/en.json'
import lzh from '@/locales/lzh.json'
import zhCn from '@/locales/zh-cn.json'
import zhTw from '@/locales/zh-tw.json'

import { normalizeLocale } from './locale'

describe('locale normalization', () => {
  it.each([
    ['zh-Hans-CN', 'zh-CN'],
    ['zh_TW', 'zh-TW'],
    ['lzh', 'lzh'],
    ['lzh-Hant', 'lzh'],
    ['lzh_TW', 'lzh'],
    ['lzhfoo', 'en'],
    ['zhfoo', 'en'],
    ['zh', 'zh'],
    ['en-GB', 'en'],
    [undefined, 'en'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected)
  })
})

describe('locale branding', () => {
  it.each([
    [en, 'Uni', 'Cucumber'],
    [zhCn, 'Uni', 'Cucumber'],
    [zhTw, 'Uni', 'Cucumber'],
    [lzh, '匯', '翠'],
  ] as const)(
    'defines localized editor-header branding',
    (locale, titleUni, titleCucumber) => {
      expect(locale.header.title_uni).toBe(titleUni)
      expect(locale.header.title_cucumber).toBe(titleCucumber)
    },
  )

  it.each([en, zhCn, zhTw])(
    'preserves the UniCucumber product name',
    (locale) => {
      expect(locale.title).toContain('UniCucumber')
      expect(locale.header.github).toContain('UniCucumber')
    },
  )

  it('uses the Literary Chinese product and GitHub translations', () => {
    expect(lzh.title).toBe('「匯翠」- 纂萬國碼字體')
    expect(lzh.header.github).toBe('開「匯翠」之庫於技閣')
  })

  it.each([en, zhCn, zhTw, lzh])(
    'identifies UniCucumber in the offline-ready message',
    (locale) => {
      expect(locale.pwa.offline_ready).toContain('UniCucumber')
    },
  )
})

describe('Literary Chinese localization', () => {
  it('preserves current glyph dimensions and Unicode terminology', () => {
    expect(lzh.dialog.dimension_error.message).toContain('十二')
    expect(lzh.glyph_manager.library.cell_accessible).toBe(
      '{character}，U+{codePoint}，{width}像素字形{states}',
    )
    expect(lzh.glyph_manager.library.unicode_plane['2']).toContain('表意文字')
    expect(lzh.glyph_manager.library.unicode_plane['3']).toContain('表意文字')
  })
})

describe('settings localization', () => {
  it.each([
    [en, ['Auto', 'Light', 'Dark', 'Follow system appearance']],
    [zhCn, ['自动', '浅色', '深色', '跟随系统外观']],
    [zhTw, ['自動', '淺色', '深色', '跟隨系統外觀']],
    [lzh, ['自適', '明', '黯', '隨械綱']],
  ] as const)('defines every appearance preference label', (locale, labels) => {
    expect([
      locale.settings.appearance.auto,
      locale.settings.appearance.light,
      locale.settings.appearance.dark,
      locale.settings.appearance.follow_system,
    ]).toEqual(labels)
  })
})
