import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const GLYPH_SHEET_WIDTH = 560
const GLYPH_SHEET_HEIGHT = 544
const GLYPH_SIZE = 16
const CELL_PITCH = 32
const CELL_LEFT = 52
const CELL_TOP = 39
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const IDS_ARITY = new Map([
  ['⿾', 1],
  ['⿿', 1],
  ['⿰', 2],
  ['⿱', 2],
  ['⿴', 2],
  ['⿵', 2],
  ['⿶', 2],
  ['⿷', 2],
  ['⿸', 2],
  ['⿹', 2],
  ['⿺', 2],
  ['⿻', 2],
  ['⿼', 2],
  ['⿽', 2],
  ['㇯', 2],
  ['⿲', 3],
  ['⿳', 3],
])

const isUnicodeScalar = (value) =>
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 0x10ffff &&
  !(value >= 0xd800 && value <= 0xdfff)

const codePointCompare = (left, right) =>
  left.codePointAt(0) - right.codePointAt(0)

const decodeYamlScalar = (value) => {
  const trimmed = value.trim()
  if (trimmed === "''" || trimmed === '""') return ''
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'")
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      throw new TypeError(`Invalid quoted YAML scalar: ${trimmed}`)
    }
  }
  return trimmed
}

const parseStructureYaml = (text, sourceName) => {
  const records = new Map()
  let currentCodePoint = null
  let current = null
  let readingIds = false

  const finish = () => {
    if (currentCodePoint === null || current === null) return
    if (current.used === null) {
      throw new TypeError(
        `${sourceName}: record ${currentCodePoint} has no boolean u field.`,
      )
    }
    records.set(currentCodePoint, {
      used: current.used,
      ids: current.ids,
    })
  }

  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue

    const topLevel = /^(\d+):\s*$/u.exec(line)
    if (topLevel) {
      finish()
      currentCodePoint = Number.parseInt(topLevel[1], 10)
      if (!isUnicodeScalar(currentCodePoint)) {
        throw new TypeError(
          `${sourceName}:${index + 1}: invalid Unicode scalar key.`,
        )
      }
      if (records.has(currentCodePoint)) {
        throw new TypeError(
          `${sourceName}:${index + 1}: duplicate code point ${currentCodePoint}.`,
        )
      }
      current = { used: null, ids: [] }
      readingIds = false
      continue
    }

    if (current === null) {
      throw new TypeError(
        `${sourceName}:${index + 1}: content appears before a code point.`,
      )
    }

    const used = /^\s{2}u:\s*(true|false)\s*$/u.exec(line)
    if (used) {
      current.used = used[1] === 'true'
      readingIds = false
      continue
    }

    const ids = /^\s{2}i:\s*(.*)$/u.exec(line)
    if (ids) {
      const inline = decodeYamlScalar(ids[1])
      current.ids = inline ? [inline] : []
      readingIds = !inline
      continue
    }

    const idsEntry = readingIds ? /^\s{2}-\s*(.*)$/u.exec(line) : null
    if (idsEntry) {
      const decoded = decodeYamlScalar(idsEntry[1])
      if (decoded) current.ids.push(decoded)
      continue
    }

    if (/^\s{2}\S/u.test(line)) readingIds = false
  }
  finish()

  if (records.size === 0) {
    throw new TypeError(`${sourceName}: no structure records were found.`)
  }
  return records
}

const paethPredictor = (left, above, upperLeft) => {
  const estimate = left + above - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const aboveDistance = Math.abs(estimate - above)
  const diagonalDistance = Math.abs(estimate - upperLeft)
  if (leftDistance <= aboveDistance && leftDistance <= diagonalDistance) {
    return left
  }
  return aboveDistance <= diagonalDistance ? above : upperLeft
}

const decodeUgePng = (buffer, sourceName) => {
  if (
    buffer.length < 33 ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw new TypeError(`${sourceName}: invalid PNG signature.`)
  }

  let offset = PNG_SIGNATURE.length
  let width = 0
  let height = 0
  let bitDepth = -1
  let colorType = -1
  let compressionMethod = -1
  let filterMethod = -1
  let interlaceMethod = -1
  let palette = null
  const idat = []

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (dataEnd + 4 > buffer.length) {
      throw new TypeError(`${sourceName}: truncated PNG chunk.`)
    }
    const data = buffer.subarray(dataStart, dataEnd)
    if (type === 'IHDR') {
      if (data.length !== 13) {
        throw new TypeError(`${sourceName}: invalid IHDR length.`)
      }
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      compressionMethod = data[10]
      filterMethod = data[11]
      interlaceMethod = data[12]
    } else if (type === 'PLTE') {
      palette = Buffer.from(data)
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset = dataEnd + 4
  }

  if (
    width !== GLYPH_SHEET_WIDTH ||
    height !== GLYPH_SHEET_HEIGHT ||
    bitDepth !== 1 ||
    colorType !== 3 ||
    compressionMethod !== 0 ||
    filterMethod !== 0 ||
    interlaceMethod !== 0
  ) {
    throw new TypeError(
      `${sourceName}: expected a 560x544 non-interlaced 1-bit indexed PNG.`,
    )
  }
  if (
    palette === null ||
    palette.length < 6 ||
    !palette.subarray(0, 3).equals(Buffer.from([0, 0, 0])) ||
    !palette.subarray(3, 6).equals(Buffer.from([255, 255, 255]))
  ) {
    throw new TypeError(
      `${sourceName}: expected palette index 0=black and 1=white.`,
    )
  }
  if (idat.length === 0) {
    throw new TypeError(`${sourceName}: PNG contains no IDAT data.`)
  }

  const bytesPerRow = Math.ceil(width / 8)
  const inflated = inflateSync(Buffer.concat(idat))
  const expectedLength = height * (bytesPerRow + 1)
  if (inflated.length !== expectedLength) {
    throw new TypeError(`${sourceName}: unexpected decompressed PNG size.`)
  }

  const rows = []
  let inputOffset = 0
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset]
    inputOffset += 1
    const row = Buffer.alloc(bytesPerRow)
    const previous = rows[y - 1] ?? null
    for (let x = 0; x < bytesPerRow; x += 1) {
      const raw = inflated[inputOffset + x]
      const left = x > 0 ? row[x - 1] : 0
      const above = previous?.[x] ?? 0
      const upperLeft = x > 0 ? (previous?.[x - 1] ?? 0) : 0
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : filter === 4
                  ? paethPredictor(left, above, upperLeft)
                  : null
      if (predictor === null) {
        throw new TypeError(`${sourceName}: unsupported PNG filter ${filter}.`)
      }
      row[x] = (raw + predictor) & 0xff
    }
    inputOffset += bytesPerRow
    rows.push(row)
  }

  return {
    pixelIndex(x, y) {
      const packed = rows[y]?.[x >> 3]
      if (packed === undefined) {
        throw new RangeError(`${sourceName}: pixel is outside the glyph sheet.`)
      }
      return (packed >> (7 - (x & 7))) & 1
    },
  }
}

const glyphHexFromSheet = (sheet, codePoint) => {
  const position = codePoint & 0xff
  const left = CELL_LEFT + CELL_PITCH * Math.floor(position / 16)
  const top = CELL_TOP + CELL_PITCH * (position % 16)
  let bits = ''
  for (let y = 0; y < GLYPH_SIZE; y += 1) {
    for (let x = 0; x < GLYPH_SIZE; x += 1) {
      const pixel = sheet.pixelIndex(left + x, top + y)
      bits += String(1 - pixel)
    }
  }

  let hex = ''
  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2)
      .toString(16)
      .toUpperCase()
  }
  return hex.padStart(64, '0')
}

const semanticCharacters = (idsValues) => {
  const result = new Set()
  for (const value of idsValues) {
    for (const character of [...value]) {
      const codePoint = character.codePointAt(0)
      if (
        !IDS_ARITY.has(character) &&
        isUnicodeScalar(codePoint) &&
        codePoint >= 0x80
      ) {
        result.add(character)
      }
    }
  }
  return [...result].sort(codePointCompare)
}

const parseIdsNode = (tokens, index) => {
  const token = tokens[index]
  if (token === undefined) return null
  const codePoint = token.codePointAt(0)
  if (!isUnicodeScalar(codePoint) || codePoint < 0x80) return null
  const arity = IDS_ARITY.get(token)
  if (arity === undefined) return index + 1

  let nextIndex = index + 1
  for (let child = 0; child < arity; child += 1) {
    const parsed = parseIdsNode(tokens, nextIndex)
    if (parsed === null) return null
    nextIndex = parsed
  }
  return nextIndex
}

const isStandardIdsExpression = (value) => {
  const tokens = [...value]
  return tokens.length > 0 && parseIdsNode(tokens, 0) === tokens.length
}

const normalizeIdsValue = (rawValue) => {
  const normalized = []
  for (const rawAlternative of rawValue.split(';')) {
    let value = rawAlternative.trim()
    while (/\([^()]*\)$/u.test(value)) {
      value = value.replace(/\([^()]*\)$/u, '').trim()
    }
    while (/^\{[^{}]*\}/u.test(value)) {
      value = value.replace(/^\{[^{}]*\}/u, '').trim()
    }
    if (
      value &&
      isStandardIdsExpression(value) &&
      !normalized.includes(value)
    ) {
      normalized.push(value)
    }
  }
  return normalized
}

const parseIdsYaml = (text, sourceName) => {
  const records = new Map()
  let sourceRecords = 0
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue
    sourceRecords += 1
    const match = /^(\d+):\s*(.*)$/u.exec(line)
    if (!match) {
      throw new TypeError(`${sourceName}:${index + 1}: invalid IDS record.`)
    }
    const codePoint = Number.parseInt(match[1], 10)
    if (!isUnicodeScalar(codePoint)) {
      throw new TypeError(`${sourceName}:${index + 1}: invalid Unicode scalar.`)
    }
    const expressions = normalizeIdsValue(decodeYamlScalar(match[2]))
    if (expressions.length > 0) records.set(codePoint, expressions)
  }
  return { records, sourceRecords }
}

const loadStructureComponents = async (
  sourceDirectory,
  structureFile,
  expectedRange,
  sheets,
) => {
  const sourceName = path.relative(sourceDirectory, structureFile)
  const records = parseStructureYaml(
    await readFile(structureFile, 'utf8'),
    sourceName,
  )
  const components = []
  for (const [codePoint, record] of records) {
    if (!record.used) continue
    if (codePoint < expectedRange[0] || codePoint > expectedRange[1]) {
      throw new TypeError(
        `${sourceName}: used code point ${codePoint} is outside the expected range.`,
      )
    }
    const characters = semanticCharacters(record.ids)
    if (characters.length === 0) continue
    const highByte = codePoint >> 8
    const sheet = sheets.get(highByte)
    if (!sheet) {
      throw new TypeError(
        `${sourceName}: missing GS glyph sheet for U+${codePoint.toString(16).toUpperCase()}.`,
      )
    }
    const hex = glyphHexFromSheet(sheet, codePoint)
    if (/^0{64}$/u.test(hex)) continue
    components.push({ characters, hex })
  }
  return components
}

const loadGlyphSheets = async (sourceDirectory) => {
  const gsDirectory = path.join(sourceDirectory, 'GS')
  let entries
  try {
    entries = await readdir(gsDirectory, { withFileTypes: true })
  } catch (error) {
    throw new Error('UGE source is missing the GS directory.', { cause: error })
  }

  const sheets = new Map()
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const match = /^uni([0-9a-f]+)\.png$/iu.exec(entry.name)
    if (!match) continue
    const highByte = Number.parseInt(match[1], 16)
    if (!Number.isInteger(highByte) || sheets.has(highByte)) {
      throw new TypeError(`GS/${entry.name}: duplicate or invalid glyph page.`)
    }
    sheets.set(
      highByte,
      decodeUgePng(
        await readFile(path.join(gsDirectory, entry.name)),
        `GS/${entry.name}`,
      ),
    )
  }
  if (sheets.size === 0) {
    throw new TypeError('UGE source contains no GS glyph sheets.')
  }
  return sheets
}

const loadIds = async (sourceDirectory) => {
  const idsDirectory = path.join(sourceDirectory, 'IDS')
  let entries
  try {
    entries = await readdir(idsDirectory, { withFileTypes: true })
  } catch (error) {
    throw new Error('UGE source is missing the IDS directory.', {
      cause: error,
    })
  }

  const result = new Map()
  let droppedRecords = 0
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name, 'en'),
  )) {
    if (!entry.isFile() || !/^[0-9a-f]{4}\.ya?ml$/iu.test(entry.name)) {
      continue
    }
    const sourceName = `IDS/${entry.name}`
    const parsed = parseIdsYaml(
      await readFile(path.join(idsDirectory, entry.name), 'utf8'),
      sourceName,
    )
    droppedRecords += parsed.sourceRecords - parsed.records.size
    for (const [codePoint, expressions] of parsed.records) {
      if (result.has(codePoint)) {
        throw new TypeError(
          `${sourceName}: duplicate IDS code point ${codePoint} across files.`,
        )
      }
      result.set(codePoint, expressions)
    }
  }
  if (result.size === 0) {
    throw new TypeError('UGE source contains no valid IDS records.')
  }
  return { records: result, droppedRecords }
}

export const decodeUgeSource = async (sourceDirectory) => {
  const absoluteSource = path.resolve(sourceDirectory)
  let sourceStat
  try {
    sourceStat = await stat(absoluteSource)
  } catch (error) {
    throw new Error(`UGE source directory does not exist: ${absoluteSource}`, {
      cause: error,
    })
  }
  if (!sourceStat.isDirectory()) {
    throw new TypeError(`UGE source must be a directory: ${absoluteSource}`)
  }

  const sheets = await loadGlyphSheets(absoluteSource)
  const components = [
    ...(await loadStructureComponents(
      absoluteSource,
      path.join(absoluteSource, 'struc', 'cgp.yaml'),
      [0x4e00, 0x9fff],
      sheets,
    )),
    ...(await loadStructureComponents(
      absoluteSource,
      path.join(absoluteSource, 'struc', 'hfc.yaml'),
      [0xe000, 0xe9ff],
      sheets,
    )),
  ]
  if (components.length === 0) {
    throw new TypeError(
      'UGE source does not contain any valid 16x16 component records.',
    )
  }

  const ids = await loadIds(absoluteSource)
  return {
    sourceDirectory: absoluteSource,
    components,
    ids: ids.records,
    droppedIdsRecords: ids.droppedRecords,
  }
}

export const validateComponentSource = decodeUgeSource

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const source = process.argv[2]
  if (!source) {
    console.error(
      'Usage: node validate-component-source.mjs <extracted-uge-directory>',
    )
    process.exitCode = 2
  } else {
    try {
      const decoded = await validateComponentSource(source)
      console.log(
        `Validated ${decoded.components.length} component records and ${decoded.ids.size} IDS records; omitted ${decoded.droppedIdsRecords} non-standard IDS records.`,
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
