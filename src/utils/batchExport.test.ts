import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import {
  characterListCodePoints,
  createGlyphArchive,
  createHexExport,
} from './batchExport'

const glyphs = [
  { codePoint: '20000', hexValue: 'f'.repeat(64) },
  { codePoint: '41', hexValue: '80'.repeat(16) },
]

describe('batch glyph export', () => {
  it('deduplicates characters, retains spaces and supplementary characters, and ignores line separators', () => {
    expect(characterListCodePoints('AA\n𠀀\t B\r')).toEqual([
      '0041',
      '20000',
      '0020',
      '0042',
    ])
    expect(() => characterListCodePoints('\uD800')).toThrow('Invalid Unicode')
  })

  it('exports sorted normalized Unifont lines including six-digit supplementary code points', () => {
    expect(createHexExport(glyphs)).toBe(
      `0041:${'80'.repeat(16)}\n020000:${'F'.repeat(64)}`,
    )
    expect(glyphs[0]?.codePoint).toBe('20000')
    expect(() => createHexExport([])).toThrow('No glyphs')
    expect(() =>
      createHexExport([{ codePoint: '0041', hexValue: '' }]),
    ).toThrow('Invalid')
  })

  it('creates readable ZIP entries with the actual glyph dimensions, scale, and transparency', async () => {
    const archive = await createGlyphArchive(glyphs, 'svg', {
      scale: 4,
      transparent: true,
    })
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()))
    expect(archive.type).toBe('application/zip')
    expect(Object.keys(files)).toEqual(['U+0041.svg', 'U+20000.svg'])
    expect(strFromU8(files['U+0041.svg']!)).toContain('width="32" height="64"')
    expect(strFromU8(files['U+20000.svg']!)).toContain('width="64" height="64"')
    expect(strFromU8(files['U+0041.svg']!)).not.toContain('#FFFFFF')
  })

  it('keeps encoded PNG bytes intact and fails when canvas encoding fails', async () => {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      imageSmoothingEnabled: true,
    }
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) =>
        callback(
          new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
        ),
      )
    try {
      const archive = await createGlyphArchive([glyphs[1]!], 'png')
      const files = unzipSync(new Uint8Array(await archive.arrayBuffer()))
      expect([...files['U+0041.png']!]).toEqual([137, 80, 78, 71])
      toBlob.mockImplementation((callback) => callback(null))
      await expect(createGlyphArchive([glyphs[1]!], 'png')).rejects.toThrow(
        'encode',
      )
    } finally {
      getContext.mockRestore()
      toBlob.mockRestore()
    }
  })
})
