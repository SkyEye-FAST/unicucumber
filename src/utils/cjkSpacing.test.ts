import { describe, expect, it } from 'vitest'

import { formatCjkMixedText } from './cjkSpacing'

describe('formatCjkMixedText', () => {
  it('spaces Latin words and numbers next to Han characters', () => {
    expect(formatCjkMixedText('在zi.tools中打开')).toBe('在 zi.tools 中打开')
    expect(formatCjkMixedText('图片尺寸必须为8×16或16×16像素')).toBe(
      '图片尺寸必须为 8×16 或 16×16 像素',
    )
  })

  it('formats interpolated technical values without changing their contents', () => {
    expect(formatCjkMixedText('已存在码位为U+0000的字形！')).toBe(
      '已存在码位为 U+0000 的字形！',
    )
  })

  it('leaves text without mixed Han and Latin content unchanged', () => {
    expect(formatCjkMixedText('纯中文文案')).toBe('纯中文文案')
    expect(formatCjkMixedText('Unicode glyph editor')).toBe(
      'Unicode glyph editor',
    )
  })
})
