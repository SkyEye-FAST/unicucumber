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
    expect(locale.settings.sections.drawing).toBeTruthy()
    expect(locale.settings.sections.glyph_preview).toBeTruthy()
    expect(locale.settings.sections.behaviour).toBeTruthy()
  })
})
