import { describe, expect, it } from 'vitest'
import * as opentype from 'opentype.js'

import {
  createBdfFont,
  createFontExportMetadata,
  createOfficialUnifontMetadata,
  createPixelFont,
  createPsfFont,
  createWoff2Font,
} from './fontExport'

const readTag = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(...bytes.slice(offset, offset + 4))

const readUint16 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)

const readUint32 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) * 0x1000000 +
    (bytes[offset + 1] ?? 0) * 0x10000 +
    (bytes[offset + 2] ?? 0) * 0x100 +
    (bytes[offset + 3] ?? 0)) >>>
  0

const getTable = (
  font: Uint8Array,
  tag: string,
): { offset: number; length: number } => {
  const tableCount = readUint16(font, 4)
  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16
    if (readTag(font, recordOffset) === tag) {
      return {
        offset: readUint32(font, recordOffset + 8),
        length: readUint32(font, recordOffset + 12),
      }
    }
  }
  throw new Error(`Missing ${tag} table.`)
}

const readUtf16Be = (
  bytes: Uint8Array,
  offset: number,
  length: number,
): string => {
  let value = ''
  for (let index = 0; index < length; index += 2) {
    value += String.fromCharCode(readUint16(bytes, offset + index))
  }
  return value
}

const getWindowsNames = (font: Uint8Array): Map<number, string> => {
  const name = getTable(font, 'name')
  const nameCount = readUint16(font, name.offset + 2)
  const stringOffset = name.offset + readUint16(font, name.offset + 4)
  const names = new Map<number, string>()
  for (let index = 0; index < nameCount; index += 1) {
    const recordOffset = name.offset + 6 + index * 12
    const nameId = readUint16(font, recordOffset + 6)
    const length = readUint16(font, recordOffset + 8)
    const offset = readUint16(font, recordOffset + 10)
    names.set(nameId, readUtf16Be(font, stringOffset + offset, length))
  }
  return names
}

describe('pixel font export', () => {
  const glyphs = [
    {
      codePoint: '0041',
      hexValue:
        '8001800180018001800180018001800180018001800180018001800180018001',
    },
    { codePoint: '1F600', hexValue: '0'.repeat(64) },
  ]

  it('creates an OpenType CFF font with the expected required tables', () => {
    const font = createPixelFont(
      [{ codePoint: '0000', hexValue: '0'.repeat(32) }, ...glyphs],
      'otf',
    )
    const tableCount = (font[4] ?? 0) * 0x100 + (font[5] ?? 0)
    const tags = Array.from({ length: tableCount }, (_, index) =>
      readTag(font, 12 + index * 16),
    )
    expect(readUint32(font, 0)).toBe(0x4f54544f)
    expect(tags).toEqual(
      expect.arrayContaining(['CFF ', 'cmap', 'head', 'name']),
    )
  })

  it('converts the OpenType source to a TrueType font', () => {
    const font = createPixelFont(glyphs, 'ttf')
    expect(readUint32(font, 0)).toBe(0x00010000)
    expect(opentype.parse(font.buffer).charToGlyphIndex('A')).toBe(1)
  })

  it('includes the metadata and limits required by Windows font loading', () => {
    const familyName = 'UniCucumber Test'
    const font = createPixelFont(glyphs, 'ttf', familyName)
    const names = getWindowsNames(font)

    expect(names.get(3)).toBe(`${familyName}; 1.000; UCCU`)
    expect(names.get(5)).toBe('Version 1.000')

    const os2 = getTable(font, 'OS/2')
    expect(os2.length).toBe(78)
    expect(readTag(font, os2.offset + 58)).toBe('UCCU')
    expect(readUint16(font, os2.offset + 62)).toBe(0x0040)

    const head = getTable(font, 'head')
    expect(readUint16(font, head.offset + 44)).toBe(0)
    expect(readUint16(font, head.offset + 48)).toBe(2)

    const maxp = getTable(font, 'maxp')
    expect(readUint16(font, maxp.offset + 14)).toBe(1)
  })

  it('writes editable metadata into TrueType name and vendor records', () => {
    const metadata = createFontExportMetadata({
      familyName: 'My Pixel Family',
      styleName: 'Book',
      fullName: 'My Pixel Family Book',
      postScriptName: 'MyPixelFamily-Book',
      uniqueId: 'example:my-pixel-family:2.5',
      version: '2.5',
      copyright: 'Copyright Example',
      manufacturer: 'Example Foundry',
      manufacturerUrl: 'https://example.com/fonts',
      designer: 'Example Designer',
      designerUrl: 'https://example.com/designer',
      description: 'A custom pixel font.',
      license: 'Example License',
      licenseUrl: 'https://example.com/license',
      vendorId: 'EX',
    })
    const font = createPixelFont(glyphs, 'ttf', metadata)
    const names = getWindowsNames(font)

    expect(names.get(0)).toBe('Copyright Example')
    expect(names.get(1)).toBe('My Pixel Family')
    expect(names.get(2)).toBe('Book')
    expect(names.get(3)).toBe('example:my-pixel-family:2.5')
    expect(names.get(4)).toBe('My Pixel Family Book')
    expect(names.get(5)).toBe('Version 2.5')
    expect(names.get(6)).toBe('MyPixelFamily-Book')
    expect(names.get(8)).toBe('Example Foundry')
    expect(names.get(13)).toBe('Example License')
    expect(names.get(14)).toBe('https://example.com/license')

    const os2 = getTable(font, 'OS/2')
    expect(readTag(font, os2.offset + 58)).toBe('EX  ')
  })

  it('provides the official Unifont metadata profile for complete exports', () => {
    const metadata = createOfficialUnifontMetadata('17.0.05')
    const font = createPixelFont(glyphs, 'ttf', metadata)
    const names = getWindowsNames(font)
    const openType = opentype.parse(
      createPixelFont(glyphs, 'otf', metadata).buffer,
    )
    const openTypeNames = openType.names as unknown as {
      windows: Record<string, opentype.LocalizedName>
    }

    expect(metadata.familyName).toBe('Unifont')
    expect(metadata.fullName).toBe('Unifont')
    expect(metadata.version).toBe('Version 17.0.05')
    expect(metadata.vendorId).toBe('GNU ')
    expect(names.get(0)).toContain('Roman Czyborra')
    expect(names.get(1)).toBe('Unifont')
    expect(names.get(4)).toBe('Unifont')
    expect(names.get(13)).toContain('SIL Open Font License')
    expect(openTypeNames.windows.fontFamily?.en).toBe('Unifont')
    expect(openTypeNames.windows.fullName?.en).toBe('Unifont')
    expect(openTypeNames.windows.version?.en).toBe('Version 17.0.05')
    expect(openTypeNames.windows.license?.en).toContain('SIL Open Font License')
    expect(openTypeNames.windows.uniqueID?.en).toBe('Unifont-17.0.05.otf')
    expect(
      (openType.tables.os2 as opentype.Table & { achVendID: string }).achVendID,
    ).toBe('GNU ')

    const os2 = getTable(font, 'OS/2')
    expect(readTag(font, os2.offset + 58)).toBe('GNU ')
  })

  it('creates a WOFF wrapper with valid declared lengths', () => {
    const font = createPixelFont(glyphs, 'woff')
    expect(readTag(font, 0)).toBe('wOFF')
    expect(readUint32(font, 8)).toBe(font.length)
    expect(readUint32(font, 16)).toBeGreaterThan(0)
  })

  it('encodes the TrueType source as WOFF2', async () => {
    const font = await createWoff2Font(glyphs)
    expect(readTag(font, 0)).toBe('wOF2')
  })

  it('keeps Unifont bitmap data in BDF and PSF exports', () => {
    expect(createBdfFont(glyphs)).toContain('ENCODING 65')
    expect(readUint32(createPsfFont(glyphs), 0)).toBe(0x72b54a86)
  })
})
