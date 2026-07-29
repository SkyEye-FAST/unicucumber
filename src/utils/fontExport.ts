import * as opentype from 'opentype.js'

import type { Glyph, GridData } from '@/types/glyph'
import { hexToGrid } from '@/utils/hexUtils'

export type FontExportFormat = 'otf' | 'ttf' | 'woff'
export type FontExportScope = 'full' | 'modified'

export interface FontExportMetadata {
  familyName: string
  styleName: string
  fullName: string
  postScriptName: string
  uniqueId: string
  version: string
  copyright: string
  trademark: string
  manufacturer: string
  manufacturerUrl: string
  designer: string
  designerUrl: string
  description: string
  license: string
  licenseUrl: string
  vendorId: string
}

export type FontExportMetadataInput = string | Partial<FontExportMetadata>

const GLYPH_HEIGHT = 16
const UNITS_PER_EM = 64
const PIXEL_UNIT = UNITS_PER_EM / GLYPH_HEIGHT
const ASCENDER = 14 * PIXEL_UNIT
const DESCENDER = -2 * PIXEL_UNIT
const MAX_SFNT_SOURCE_GLYPHS = 0xfffe
const DEFAULT_FONT_FAMILY = 'UniCucumber Pixel'
const DEFAULT_FONT_VERSION = 'Version 1.000'
const DEFAULT_VENDOR_ID = 'UCCU'

const OFFICIAL_UNIFONT_COPYRIGHT =
  'Copyright © 1998-2026 Roman Czyborra, Paul Hardy, Qianqian Fang, Andrew Miller, Johnnie Weaver, David Corbett, Ælla Chiana Moskopp, Rebecca Bettencourt, Ho-Seok Ee, et al.'
const OFFICIAL_UNIFONT_LICENSE =
  'Dual license: SIL Open Font License version 1.1, and GNU GPL version 2 or later with the GNU Font Embedding Exception.'

const normalizeVersion = (value: string | undefined): string => {
  const version = value?.trim() || DEFAULT_FONT_VERSION
  return /^version\s/i.test(version) ? version : `Version ${version}`
}

const normalizeVendorId = (value: string | undefined): string =>
  (value || DEFAULT_VENDOR_ID)
    .replaceAll(/[^\x20-\x7e]/g, '')
    .slice(0, 4)
    .padEnd(4, ' ')

const defaultPostScriptName = (familyName: string): string =>
  familyName.replaceAll(/[^A-Za-z0-9]/g, '') || 'UniCucumberPixel'

export const createFontExportMetadata = (
  overrides: Partial<FontExportMetadata> = {},
): FontExportMetadata => {
  const familyName = overrides.familyName?.trim() || DEFAULT_FONT_FAMILY
  const styleName = overrides.styleName?.trim() || 'Regular'
  const version = normalizeVersion(overrides.version)
  const vendorId = normalizeVendorId(overrides.vendorId)
  const versionNumber = version.replace(/^version\s*/i, '')
  return {
    familyName,
    styleName,
    fullName: overrides.fullName?.trim() || `${familyName} ${styleName}`,
    postScriptName:
      overrides.postScriptName?.trim() || defaultPostScriptName(familyName),
    uniqueId:
      overrides.uniqueId?.trim() ||
      `${familyName}; ${versionNumber}; ${vendorId.trim()}`,
    version,
    copyright: overrides.copyright?.trim() || '',
    trademark: overrides.trademark?.trim() || '',
    manufacturer:
      overrides.manufacturer === undefined
        ? 'UniCucumber'
        : overrides.manufacturer.trim(),
    manufacturerUrl: overrides.manufacturerUrl?.trim() || '',
    designer: overrides.designer?.trim() || '',
    designerUrl: overrides.designerUrl?.trim() || '',
    description: overrides.description?.trim() || '',
    license: overrides.license?.trim() || '',
    licenseUrl: overrides.licenseUrl?.trim() || '',
    vendorId,
  }
}

export const createOfficialUnifontMetadata = (
  unifontVersion: string,
): FontExportMetadata => {
  const version = unifontVersion.trim() || '17.0.05'
  return createFontExportMetadata({
    familyName: 'Unifont',
    styleName: 'Regular',
    fullName: 'Unifont',
    postScriptName: 'Unifont',
    uniqueId: `Unifont-${version}.otf`,
    version,
    copyright: OFFICIAL_UNIFONT_COPYRIGHT,
    manufacturer: '',
    manufacturerUrl: 'https://unifoundry.com/unifont/',
    license: OFFICIAL_UNIFONT_LICENSE,
    licenseUrl:
      'https://gnu.org/licenses/gpl.html, https://scripts.sil.org/OFL',
    vendorId: 'GNU ',
  })
}

const resolveFontExportMetadata = (
  input: FontExportMetadataInput = {},
): FontExportMetadata =>
  typeof input === 'string'
    ? createFontExportMetadata({ familyName: input })
    : createFontExportMetadata(input)

type FontTable = { tag: string; data: Uint8Array; checksum: number }

class Writer {
  private readonly bytes: number[] = []

  get length(): number {
    return this.bytes.length
  }

  u8(value: number): void {
    this.bytes.push(value & 0xff)
  }

  u16(value: number): void {
    this.u8(value >>> 8)
    this.u8(value)
  }

  i16(value: number): void {
    this.u16(value < 0 ? value + 0x10000 : value)
  }

  u32(value: number): void {
    this.u16(value >>> 16)
    this.u16(value)
  }

  text(value: string): void {
    for (const character of value) this.u8(character.charCodeAt(0))
  }

  append(value: Uint8Array): void {
    const chunkSize = 8192
    for (let offset = 0; offset < value.length; offset += chunkSize) {
      this.bytes.push(...value.subarray(offset, offset + chunkSize))
    }
  }

  padTo4(): void {
    while (this.bytes.length % 4 !== 0) this.u8(0)
  }

  patchU32(offset: number, value: number): void {
    this.bytes[offset] = value >>> 24
    this.bytes[offset + 1] = value >>> 16
    this.bytes[offset + 2] = value >>> 8
    this.bytes[offset + 3] = value
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

const readU16 = (data: Uint8Array, offset: number): number =>
  ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0)

const readU32 = (data: Uint8Array, offset: number): number =>
  ((data[offset] ?? 0) * 0x1000000 +
    (data[offset + 1] ?? 0) * 0x10000 +
    (data[offset + 2] ?? 0) * 0x100 +
    (data[offset + 3] ?? 0)) >>>
  0

const readTag = (data: Uint8Array, offset: number): string =>
  String.fromCharCode(...data.slice(offset, offset + 4))

const checksum = (data: Uint8Array): number => {
  let total = 0
  for (let offset = 0; offset < data.length; offset += 4) {
    total = (total + readU32(data, offset)) >>> 0
  }
  return total
}

const validGlyphs = (glyphs: Glyph[]): Glyph[] => {
  const unique = new Map<number, Glyph>()
  glyphs.forEach((glyph) => {
    const codePoint = Number.parseInt(glyph.codePoint, 16)
    if (
      Number.isInteger(codePoint) &&
      codePoint >= 0 &&
      codePoint <= 0x10ffff &&
      !unique.has(codePoint) &&
      hexToGrid(glyph.hexValue)
    ) {
      unique.set(codePoint, glyph)
    }
  })
  return [...unique.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, glyph]) => glyph)
}

interface BitmapRectangle {
  bottom: number
  left: number
  right: number
  top: number
}

const bitmapRectangles = (grid: GridData): BitmapRectangle[] => {
  const rectangles: BitmapRectangle[] = []
  let activeRuns = new Map<string, number>()
  grid.forEach((row, rowIndex) => {
    const currentRuns = new Map<string, number>()
    let column = 0
    while (column < row.length) {
      if (row[column] !== 1) {
        column += 1
        continue
      }
      const start = column
      while (column < row.length && row[column] === 1) column += 1
      const key = `${start}:${column}`
      const existing = activeRuns.get(key)
      if (existing !== undefined) {
        const rectangle = rectangles[existing]
        if (rectangle) {
          rectangle.bottom = (GLYPH_HEIGHT - rowIndex - 1) * PIXEL_UNIT
          currentRuns.set(key, existing)
        }
        continue
      }
      currentRuns.set(key, rectangles.length)
      rectangles.push({
        left: start * PIXEL_UNIT,
        right: column * PIXEL_UNIT,
        top: (GLYPH_HEIGHT - rowIndex) * PIXEL_UNIT,
        bottom: (GLYPH_HEIGHT - rowIndex - 1) * PIXEL_UNIT,
      })
    }
    activeRuns = currentRuns
  })
  return rectangles
}

/**
 * Construct a pixel outline from the bitmap source that
 * GNU Unifont's `hex2otf` consumes. opentype.js serializes the OpenType
 * tables, avoiding a second, hand-written font container implementation.
 */
const createOutline = (glyph: Glyph): opentype.Path => {
  const path = new opentype.Path()
  const grid = hexToGrid(glyph.hexValue)
  if (!grid) return path
  bitmapRectangles(grid).forEach(({ bottom, left, right, top }) => {
    path.moveTo(left, bottom)
    path.lineTo(right, bottom)
    path.lineTo(right, top)
    path.lineTo(left, top)
    path.close()
  })
  return path
}

const createOpenType = (
  sourceGlyphs: Glyph[],
  metadataInput: FontExportMetadataInput,
): ArrayBuffer => {
  const glyphs = validGlyphs(sourceGlyphs)
  if (glyphs.length > MAX_SFNT_SOURCE_GLYPHS) {
    throw new RangeError(
      `A single sfnt font supports at most ${MAX_SFNT_SOURCE_GLYPHS.toLocaleString()} source glyphs.`,
    )
  }
  const metadata = resolveFontExportMetadata(metadataInput)
  const fontGlyphs = [
    new opentype.Glyph({
      name: '.notdef',
      advanceWidth: UNITS_PER_EM,
      path: new opentype.Path(),
    }),
    ...glyphs.map((glyph) => {
      const width = hexToGrid(glyph.hexValue)?.[0]?.length ?? 16
      const codePoint = Number.parseInt(glyph.codePoint, 16)
      return new opentype.Glyph({
        name:
          codePoint === 0
            ? '.null'
            : `uni${glyph.codePoint.toUpperCase().padStart(4, '0')}`,
        unicode: codePoint,
        advanceWidth: width * PIXEL_UNIT,
        path: createOutline(glyph),
      })
    }),
  ]
  const font = new opentype.Font({
    familyName: metadata.familyName,
    styleName: metadata.styleName,
    fullName: metadata.fullName,
    postScriptName: metadata.postScriptName,
    designer: metadata.designer,
    designerURL: metadata.designerUrl,
    manufacturer: metadata.manufacturer,
    manufacturerURL: metadata.manufacturerUrl,
    license: metadata.license,
    licenseURL: metadata.licenseUrl,
    version: metadata.version,
    description: metadata.description,
    copyright: metadata.copyright,
    trademark: metadata.trademark,
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    glyphs: fontGlyphs,
  })
  const platformNames = font.names as unknown as Record<
    'unicode' | 'macintosh' | 'windows',
    Record<string, opentype.LocalizedName>
  >
  for (const platform of ['unicode', 'macintosh', 'windows'] as const) {
    platformNames[platform].uniqueID = { en: metadata.uniqueId }
  }
  font.tables.os2.achVendID = metadata.vendorId
  return font.toArrayBuffer()
}

const getSfntTables = (sfnt: Uint8Array): FontTable[] => {
  const tableCount = readU16(sfnt, 4)
  return Array.from({ length: tableCount }, (_, index) => {
    const recordOffset = 12 + index * 16
    const tag = readTag(sfnt, recordOffset)
    const checksumValue = readU32(sfnt, recordOffset + 4)
    const offset = readU32(sfnt, recordOffset + 8)
    const length = readU32(sfnt, recordOffset + 12)
    if (offset + length > sfnt.length) {
      throw new Error(`Invalid ${tag} table in generated OpenType font.`)
    }
    return {
      tag,
      data: sfnt.slice(offset, offset + length),
      checksum: checksumValue,
    }
  })
}

/** A standards-compliant uncompressed WOFF 1.0 wrapper around the OpenType tables. */
const createWoff = (sfnt: Uint8Array): Uint8Array => {
  const tables = getSfntTables(sfnt).sort((left, right) =>
    left.tag.localeCompare(right.tag),
  )
  const writer = new Writer()
  const directoryLength = 44 + tables.length * 20
  let tableOffset = directoryLength
  writer.u32(0x774f4646)
  writer.u32(readU32(sfnt, 0))
  writer.u32(0)
  writer.u16(tables.length)
  writer.u16(0)
  writer.u32(sfnt.length)
  writer.u16(1)
  writer.u16(0)
  for (let index = 0; index < 5; index += 1) writer.u32(0)
  tables.forEach((table) => {
    writer.text(table.tag)
    writer.u32(tableOffset)
    writer.u32(table.data.length)
    writer.u32(table.data.length)
    writer.u32(table.checksum || checksum(table.data))
    tableOffset += Math.ceil(table.data.length / 4) * 4
  })
  tables.forEach((table) => {
    writer.append(table.data)
    writer.padTo4()
  })
  writer.patchU32(8, writer.length)
  return writer.toUint8Array()
}

const powerOfTwoAtMost = (value: number): number =>
  2 ** Math.floor(Math.log2(Math.max(1, value)))

const createTrueTypeGlyph = (glyph: Glyph | null): Uint8Array => {
  const grid = glyph ? hexToGrid(glyph.hexValue) : null
  const rectangles = grid ? bitmapRectangles(grid) : []
  const contourCount = rectangles.length
  const width = grid?.[0]?.length === 8 ? UNITS_PER_EM / 2 : UNITS_PER_EM
  const data = new Uint8Array(12 + contourCount * 22)
  const view = new DataView(data.buffer)
  view.setInt16(0, contourCount)
  view.setInt16(2, 0)
  view.setInt16(4, 0)
  view.setInt16(6, width)
  view.setInt16(8, UNITS_PER_EM)
  let offset = 10
  for (let contour = 1; contour <= contourCount; contour += 1) {
    view.setUint16(offset, contour * 4 - 1)
    offset += 2
  }
  view.setUint16(offset, 0)
  offset += 2
  data.fill(1, offset, offset + contourCount * 4)
  offset += contourCount * 4
  let previousX = 0
  rectangles.forEach(({ left, right }) => {
    view.setInt16(offset, left - previousX)
    view.setInt16(offset + 2, right - left)
    view.setInt16(offset + 4, 0)
    view.setInt16(offset + 6, left - right)
    offset += 8
    previousX = left
  })
  let previousY = 0
  rectangles.forEach(({ bottom, top }) => {
    view.setInt16(offset, bottom - previousY)
    view.setInt16(offset + 2, 0)
    view.setInt16(offset + 4, top - bottom)
    view.setInt16(offset + 6, 0)
    offset += 8
    previousY = top
  })
  return data
}

const createTrueTypeCmap = (glyphs: Glyph[]): Uint8Array => {
  const bmp = glyphs
    .map((glyph, index) => ({
      codePoint: Number.parseInt(glyph.codePoint, 16),
      glyphId: index + 1,
    }))
    .filter(({ codePoint }) => codePoint < 0xffff)
  const canUseFormat4 = bmp.length < 8190
  const format4 = new Writer()
  if (canUseFormat4) {
    const segmentCount = bmp.length + 1
    const searchPower = powerOfTwoAtMost(segmentCount)
    format4.u16(4)
    format4.u16(16 + segmentCount * 8)
    format4.u16(0)
    format4.u16(segmentCount * 2)
    format4.u16(searchPower * 2)
    format4.u16(Math.log2(searchPower))
    format4.u16(segmentCount * 2 - searchPower * 2)
    bmp.forEach(({ codePoint }) => format4.u16(codePoint))
    format4.u16(0xffff)
    format4.u16(0)
    bmp.forEach(({ codePoint }) => format4.u16(codePoint))
    format4.u16(0xffff)
    bmp.forEach(({ codePoint, glyphId }) =>
      format4.u16((glyphId - codePoint) & 0xffff),
    )
    format4.u16(1)
    for (let index = 0; index < segmentCount; index += 1) format4.u16(0)
  }
  const groups: Array<{ start: number; end: number; glyphId: number }> = []
  glyphs.forEach((glyph, index) => {
    const codePoint = Number.parseInt(glyph.codePoint, 16)
    const last = groups.at(-1)
    if (last && codePoint === last.end + 1) last.end = codePoint
    else groups.push({ start: codePoint, end: codePoint, glyphId: index + 1 })
  })
  const writer = new Writer()
  writer.u16(0)
  writer.u16(canUseFormat4 ? 2 : 1)
  const firstOffset = 4 + (canUseFormat4 ? 16 : 8)
  if (canUseFormat4) {
    writer.u16(3)
    writer.u16(1)
    writer.u32(firstOffset)
  }
  writer.u16(3)
  writer.u16(10)
  writer.u32(firstOffset + (canUseFormat4 ? format4.length : 0))
  if (canUseFormat4) writer.append(format4.toUint8Array())
  writer.u16(12)
  writer.u16(0)
  writer.u32(16 + groups.length * 12)
  writer.u32(0)
  writer.u32(groups.length)
  groups.forEach((group) => {
    writer.u32(group.start)
    writer.u32(group.end)
    writer.u32(group.glyphId)
  })
  return writer.toUint8Array()
}

const createTrueTypeName = (metadata: FontExportMetadata): Uint8Array => {
  const records = [
    [0, metadata.copyright],
    [1, metadata.familyName],
    [2, metadata.styleName],
    [3, metadata.uniqueId],
    [4, metadata.fullName],
    [5, metadata.version],
    [6, metadata.postScriptName],
    [7, metadata.trademark],
    [8, metadata.manufacturer],
    [9, metadata.designer],
    [10, metadata.description],
    [11, metadata.manufacturerUrl],
    [12, metadata.designerUrl],
    [13, metadata.license],
    [14, metadata.licenseUrl],
  ].filter((record): record is [number, string] => Boolean(record[1]))
  const stringData = new Writer()
  const writer = new Writer()
  writer.u16(0)
  writer.u16(records.length)
  writer.u16(6 + records.length * 12)
  records.forEach(([nameId, value]) => {
    const offset = stringData.length
    const bytes = new Uint8Array(value.length * 2)
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index)
      bytes[index * 2] = code >>> 8
      bytes[index * 2 + 1] = code
    }
    writer.u16(3)
    writer.u16(1)
    writer.u16(0x0409)
    writer.u16(nameId)
    writer.u16(bytes.length)
    writer.u16(offset)
    stringData.append(bytes)
  })
  writer.append(stringData.toUint8Array())
  return writer.toUint8Array()
}

const createTrueType = (
  sourceGlyphs: Glyph[],
  metadataInput: FontExportMetadataInput,
): Uint8Array => {
  const glyphs = validGlyphs(sourceGlyphs)
  if (glyphs.length > MAX_SFNT_SOURCE_GLYPHS) {
    throw new RangeError(
      `A single sfnt font supports at most ${MAX_SFNT_SOURCE_GLYPHS.toLocaleString()} source glyphs.`,
    )
  }
  const metadata = resolveFontExportMetadata(metadataInput)
  const glyphData = [
    createTrueTypeGlyph(null),
    ...glyphs.map(createTrueTypeGlyph),
  ]
  const offsets = [0]
  let glyfLength = 0
  glyphData.forEach((data) => {
    glyfLength += Math.ceil(data.length / 4) * 4
    offsets.push(glyfLength)
  })
  const glyf = new Uint8Array(glyfLength)
  glyphData.forEach((data, index) => {
    glyf.set(data, offsets[index])
  })
  const glyphCount = glyphData.length
  const maxContours = Math.max(
    0,
    ...glyphData.slice(1).map((data) => ((data[0] ?? 0) << 8) | (data[1] ?? 0)),
  )
  const head = new Writer()
  head.u32(0x00010000)
  head.u32(0x00010000)
  head.u32(0)
  head.u32(0x5f0f3cf5)
  head.u16(3)
  head.u16(UNITS_PER_EM)
  head.u32(0)
  head.u32(0)
  head.u32(0)
  head.u32(0)
  head.i16(0)
  head.i16(0)
  head.i16(UNITS_PER_EM)
  head.i16(UNITS_PER_EM)
  head.u16(0)
  head.u16(16)
  head.i16(2)
  head.i16(1)
  head.i16(0)
  const hhea = new Writer()
  hhea.u32(0x00010000)
  hhea.i16(ASCENDER)
  hhea.i16(DESCENDER)
  hhea.i16(0)
  hhea.u16(UNITS_PER_EM)
  hhea.i16(0)
  hhea.i16(0)
  hhea.i16(UNITS_PER_EM)
  hhea.i16(1)
  hhea.i16(0)
  hhea.i16(0)
  for (let index = 0; index < 4; index += 1) hhea.i16(0)
  hhea.i16(0)
  hhea.u16(glyphCount)
  const hmtx = new Writer()
  hmtx.u16(UNITS_PER_EM)
  hmtx.i16(0)
  glyphs.forEach((glyph) => {
    hmtx.u16((hexToGrid(glyph.hexValue)?.[0]?.length ?? 16) * PIXEL_UNIT)
    hmtx.i16(0)
  })
  const loca = new Writer()
  offsets.forEach((offset) => loca.u32(offset))
  const maxp = new Writer()
  maxp.u32(0x00010000)
  maxp.u16(glyphCount)
  maxp.u16(maxContours * 4)
  maxp.u16(maxContours)
  maxp.u16(0)
  maxp.u16(0)
  maxp.u16(1)
  for (let index = 0; index < 8; index += 1) maxp.u16(0)
  const os2 = new Writer()
  os2.u16(0)
  os2.i16(UNITS_PER_EM)
  os2.u16(400)
  os2.u16(5)
  os2.u16(0)
  for (let index = 0; index < 10; index += 1) os2.i16(0)
  os2.i16(0)
  for (let index = 0; index < 10; index += 1) os2.u8(0)
  for (let index = 0; index < 4; index += 1) os2.u32(0)
  os2.text(metadata.vendorId)
  os2.u16(0x0040)
  os2.u16(Math.min(0xffff, Number.parseInt(glyphs[0]?.codePoint ?? '0', 16)))
  os2.u16(
    Math.min(0xffff, Number.parseInt(glyphs.at(-1)?.codePoint ?? '0', 16)),
  )
  os2.i16(ASCENDER)
  os2.i16(DESCENDER)
  os2.i16(0)
  os2.u16(ASCENDER)
  os2.u16(-DESCENDER)
  const post = new Writer()
  post.u32(0x00030000)
  post.u32(0)
  post.i16(0)
  post.i16(1)
  post.u32(1)
  for (let index = 0; index < 4; index += 1) post.u32(0)
  const tables = [
    { tag: 'OS/2', data: os2.toUint8Array() },
    { tag: 'cmap', data: createTrueTypeCmap(glyphs) },
    { tag: 'glyf', data: glyf },
    { tag: 'head', data: head.toUint8Array() },
    { tag: 'hhea', data: hhea.toUint8Array() },
    { tag: 'hmtx', data: hmtx.toUint8Array() },
    { tag: 'loca', data: loca.toUint8Array() },
    { tag: 'maxp', data: maxp.toUint8Array() },
    { tag: 'name', data: createTrueTypeName(metadata) },
    { tag: 'post', data: post.toUint8Array() },
  ].sort((left, right) => left.tag.localeCompare(right.tag))
  const power = powerOfTwoAtMost(tables.length)
  const directoryLength = 12 + tables.length * 16
  let offset = directoryLength
  const tableOffsets = new Map<string, number>()
  tables.forEach((table) => {
    tableOffsets.set(table.tag, offset)
    offset += Math.ceil(table.data.length / 4) * 4
  })
  const font = new Uint8Array(offset)
  const view = new DataView(font.buffer)
  view.setUint32(0, 0x00010000)
  view.setUint16(4, tables.length)
  view.setUint16(6, power * 16)
  view.setUint16(8, Math.log2(power))
  view.setUint16(10, tables.length * 16 - power * 16)
  tables.forEach((table, index) => {
    const recordOffset = 12 + index * 16
    for (let tagIndex = 0; tagIndex < 4; tagIndex += 1) {
      font[recordOffset + tagIndex] = table.tag.charCodeAt(tagIndex)
    }
    view.setUint32(recordOffset + 4, checksum(table.data))
    view.setUint32(recordOffset + 8, tableOffsets.get(table.tag) ?? 0)
    view.setUint32(recordOffset + 12, table.data.length)
    font.set(table.data, tableOffsets.get(table.tag) ?? 0)
  })
  const headOffset = tableOffsets.get('head')
  if (headOffset === undefined) throw new Error('Missing head table.')
  const adjustment = (0xb1b0afba - checksum(font)) >>> 0
  font[headOffset + 8] = adjustment >>> 24
  font[headOffset + 9] = adjustment >>> 16
  font[headOffset + 10] = adjustment >>> 8
  font[headOffset + 11] = adjustment
  return font
}

export const createPixelFont = (
  glyphs: Glyph[],
  format: FontExportFormat,
  metadata: FontExportMetadataInput = {},
): Uint8Array => {
  if (format === 'otf') return new Uint8Array(createOpenType(glyphs, metadata))
  const ttf = createTrueType(glyphs, metadata)
  return format === 'woff' ? createWoff(ttf) : ttf
}

/** Loads the reference WOFF2 WASM encoder only when a WOFF2 export is requested. */
export const createWoff2Font = async (
  glyphs: Glyph[],
  metadata: FontExportMetadataInput = {},
): Promise<Uint8Array> => {
  const { compress } = await import('woff2-encoder')
  return compress(createTrueType(glyphs, metadata))
}

/** BDF follows the bitmap-oriented GNU Unifont export path. */
export const createBdfFont = (
  sourceGlyphs: Glyph[],
  metadataInput: FontExportMetadataInput = {},
): string => {
  const glyphs = validGlyphs(sourceGlyphs)
  const metadata = resolveFontExportMetadata(metadataInput)
  const familyName = metadata.familyName
  const escapedName = familyName.replaceAll(' ', '-').replaceAll(/[^\w-]/g, '')
  const properties = [
    'FONT_ASCENT 14',
    'FONT_DESCENT 2',
    `FONT_NAME "${familyName.replaceAll('"', '\\"')}"`,
    metadata.copyright
      ? `COPYRIGHT "${metadata.copyright.replaceAll('"', '\\"')}"`
      : '',
  ].filter(Boolean)
  const header = [
    'STARTFONT 2.1',
    `FONT -misc-${escapedName}-medium-r-normal--16-160-75-75-c-160-iso10646-1`,
    'SIZE 16 75 75',
    'FONTBOUNDINGBOX 16 16 0 -2',
    `STARTPROPERTIES ${properties.length}`,
    ...properties,
    'ENDPROPERTIES',
    `CHARS ${glyphs.length}`,
  ]
  const records = glyphs.map((glyph) => {
    const width = hexToGrid(glyph.hexValue)?.[0]?.length ?? 16
    const codePoint = Number.parseInt(glyph.codePoint, 16)
    const rows = glyph.hexValue.match(new RegExp(`.{${width / 4}}`, 'g')) ?? []
    return [
      `STARTCHAR uni${glyph.codePoint.toUpperCase().padStart(4, '0')}`,
      `ENCODING ${codePoint}`,
      `SWIDTH ${Math.round((width * 1000) / 16)} 0`,
      `DWIDTH ${width} 0`,
      `BBX ${width} 16 0 -2`,
      'BITMAP',
      ...rows.map((row) => row.toUpperCase()),
      'ENDCHAR',
    ].join('\n')
  })
  return [...header, ...records, 'ENDFONT', ''].join('\n')
}

/** PSF2 requires a fixed-width cell, so 8-pixel glyphs are padded to 16 pixels. */
export const createPsfFont = (sourceGlyphs: Glyph[]): Uint8Array => {
  const glyphs = validGlyphs(sourceGlyphs)
  const writer = new Writer()
  const littleEndian = (value: number): void => {
    writer.u8(value)
    writer.u8(value >>> 8)
    writer.u8(value >>> 16)
    writer.u8(value >>> 24)
  }
  littleEndian(0x864ab572)
  littleEndian(0)
  littleEndian(32)
  littleEndian(1)
  littleEndian(glyphs.length)
  littleEndian(32)
  littleEndian(16)
  littleEndian(16)
  glyphs.forEach((glyph) => {
    const grid = hexToGrid(glyph.hexValue)
    grid?.forEach((row) => {
      let firstByte = 0
      let secondByte = 0
      row.forEach((cell, index) => {
        if (cell !== 1) return
        if (index < 8) firstByte |= 0x80 >> index
        else secondByte |= 0x80 >> (index - 8)
      })
      writer.u8(firstByte)
      writer.u8(secondByte)
    })
  })
  glyphs.forEach((glyph) => {
    writer.append(
      new TextEncoder().encode(
        String.fromCodePoint(Number.parseInt(glyph.codePoint, 16)),
      ),
    )
    writer.u8(0xff)
  })
  writer.u8(0xff)
  return writer.toUint8Array()
}
