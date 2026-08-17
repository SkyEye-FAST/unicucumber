import { crc32, deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const WIDTH = 560
const HEIGHT = 544
const ROW_BYTES = WIDTH / 8
const SCANLINE_BYTES = ROW_BYTES + 1

const pngChunk = (type: string, data: Buffer): Buffer => {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])) >>> 0)
  return Buffer.concat([length, typeBytes, data, checksum])
}

const glyphOrigin = (codePoint: number): [number, number] => {
  const position = codePoint & 0xff
  return [52 + 32 * Math.floor(position / 16), 39 + 32 * (position % 16)]
}

const buildGlyphSheet = (
  glyphs: Map<number, Array<[x: number, y: number]>>,
): Buffer => {
  const scanlines = Buffer.alloc(HEIGHT * SCANLINE_BYTES)
  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * SCANLINE_BYTES
    scanlines[start] = 0
    scanlines.fill(0xff, start + 1, start + SCANLINE_BYTES)
  }

  for (const [codePoint, pixels] of glyphs) {
    const [left, top] = glyphOrigin(codePoint)
    for (const [x, y] of pixels) {
      const absoluteX = left + x
      const absoluteY = top + y
      const byteOffset =
        absoluteY * SCANLINE_BYTES + 1 + Math.floor(absoluteX / 8)
      scanlines[byteOffset] &= ~(1 << (7 - (absoluteX & 7)))
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(WIDTH, 0)
  ihdr.writeUInt32BE(HEIGHT, 4)
  ihdr[8] = 1
  ihdr[9] = 3
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

export const fixtureHex = (pixels: Array<[x: number, y: number]>): string => {
  const bits = Array.from({ length: 256 }, () => 0)
  for (const [x, y] of pixels) bits[y * 16 + x] = 1
  let hex = ''
  for (let index = 0; index < bits.length; index += 4) {
    hex += (
      (bits[index]! << 3) |
      (bits[index + 1]! << 2) |
      (bits[index + 2]! << 1) |
      bits[index + 3]!
    )
      .toString(16)
      .toUpperCase()
  }
  return hex
}

export const createUgeFixture = async (root: string): Promise<void> => {
  await mkdir(path.join(root, 'struc'), { recursive: true })
  await mkdir(path.join(root, 'GS'), { recursive: true })
  await mkdir(path.join(root, 'IDS'), { recursive: true })

  await writeFile(
    path.join(root, 'struc', 'cgp.yaml'),
    [
      '19968:',
      '  i:',
      '  - 木',
      '  u: true',
      '19969:',
      '  i:',
      '  - 木',
      '  u: true',
      '19970:',
      '  i:',
      '  - ⿰日月',
      '  u: true',
      '19971:',
      '  u: false',
    ].join('\n'),
    'utf8',
  )
  await writeFile(
    path.join(root, 'struc', 'hfc.yaml'),
    ['57344:', '  i: 日', '  u: true', '57345:', '  u: false'].join('\n'),
    'utf8',
  )

  const sharedPixels: Array<[number, number]> = [
    [0, 0],
    [15, 15],
  ]
  await writeFile(
    path.join(root, 'GS', 'uni4E.png'),
    buildGlyphSheet(
      new Map([
        [0x4e00, sharedPixels],
        [0x4e01, sharedPixels],
        [
          0x4e02,
          [
            [3, 2],
            [5, 4],
          ],
        ],
      ]),
    ),
  )
  await writeFile(
    path.join(root, 'GS', 'uniE0.png'),
    buildGlyphSheet(
      new Map([
        [
          0xe000,
          [
            [7, 1],
            [7, 14],
          ],
        ],
      ]),
    ),
  )
  await writeFile(
    path.join(root, 'IDS', '0066.yaml'),
    [
      '26126: ⿰日月',
      '26127: ⿱日勿(.,H);{曰}⿴囗一',
      '26128: ⿻[2:]丨日',
    ].join('\n'),
    'utf8',
  )
}
