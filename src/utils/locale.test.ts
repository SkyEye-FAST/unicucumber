import { describe, expect, it } from 'vitest'

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
