import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TEXT_EXTENSIONS = new Set([
  '.cfg',
  '.csv',
  '.dat',
  '.ini',
  '.json',
  '.py',
  '.tsv',
  '.txt',
  '.yaml',
  '.yml',
])

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

const semanticCharacter = (value) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '')
  const codePointMatch = /^(?:U\+|0x)([0-9A-F]{1,6})$/i.exec(trimmed)
  if (codePointMatch) {
    const codePoint = Number.parseInt(codePointMatch[1], 16)
    return isUnicodeScalar(codePoint) ? String.fromCodePoint(codePoint) : null
  }
  const decimalMatch = /^\d{1,7}$/.exec(trimmed)
  if (decimalMatch) {
    const codePoint = Number.parseInt(trimmed, 10)
    return isUnicodeScalar(codePoint) ? String.fromCodePoint(codePoint) : null
  }
  const scalars = [...trimmed]
  if (scalars.length !== 1 || IDS_ARITY.has(scalars[0])) return null
  const codePoint = scalars[0].codePointAt(0)
  return isUnicodeScalar(codePoint) ? scalars[0] : null
}

const binaryToHex = (bits) => {
  let hex = ''
  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2)
      .toString(16)
      .toUpperCase()
  }
  return hex
}

const normalizeBitmap = (value) => {
  if (/^[01]{256}$/.test(value)) return binaryToHex(value)
  if (/^[0-9A-Fa-f]{64}$/.test(value)) return value.toUpperCase()
  return null
}

const extractCharacters = (context) => {
  const result = new Set()
  const fieldPattern =
    /(?:character|characters|char|unicode|hanzi|字|字符)\s*[:=]\s*\[?\s*([^\n\r#\]]+)/giu
  for (const match of context.matchAll(fieldPattern)) {
    const raw = match[1]
    for (const token of raw.split(/[\s,;/|]+/u)) {
      const character = semanticCharacter(token)
      if (character !== null) result.add(character)
    }
  }
  return [...result]
}

const parseIdsNode = (tokens, index) => {
  const token = tokens[index]
  if (token === undefined) return null
  const arity = IDS_ARITY.get(token)
  if (arity === undefined) return { nextIndex: index + 1 }

  let nextIndex = index + 1
  for (let child = 0; child < arity; child += 1) {
    const parsed = parseIdsNode(tokens, nextIndex)
    if (parsed === null) return null
    nextIndex = parsed.nextIndex
  }
  return { nextIndex }
}

const isValidIds = (expression) => {
  const tokens = [...expression]
  if (tokens.length === 0 || !IDS_ARITY.has(tokens[0])) return false
  const parsed = parseIdsNode(tokens, 0)
  return parsed !== null && parsed.nextIndex === tokens.length
}

const extractIdsKey = (prefix) => {
  const hexMatches = [
    ...prefix.matchAll(/(?:U\+|0x)([0-9A-F]{1,6})/giu),
  ]
  const hex = hexMatches.at(-1)?.[1]
  if (hex !== undefined) {
    const codePoint = Number.parseInt(hex, 16)
    return isUnicodeScalar(codePoint) ? codePoint : null
  }

  const decimalMatches = [...prefix.matchAll(/(?:^|[:=,\s])(\d{4,7})(?=[:=,\s]|$)/gu)]
  const decimal = decimalMatches.at(-1)?.[1]
  if (decimal !== undefined) {
    const codePoint = Number.parseInt(decimal, 10)
    if (isUnicodeScalar(codePoint)) return codePoint
  }

  const semanticMatches = [
    ...prefix.matchAll(/[\p{Unified_Ideograph}\p{Script=Han}]/gu),
  ]
  const character = semanticMatches.at(-1)?.[0]
  return character === undefined ? null : character.codePointAt(0)
}

const extractIdsFromText = (text, target) => {
  for (const line of text.split(/\r?\n/u)) {
    const expressionMatch =
      /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻⿼⿽⿾⿿㇯][^\s,;#'"\]\})]+/u.exec(line)
    if (!expressionMatch) continue
    const expression = expressionMatch[0]
    if (!isValidIds(expression)) continue
    const codePoint = extractIdsKey(line.slice(0, expressionMatch.index))
    if (codePoint === null) continue
    const values = target.get(codePoint) ?? []
    if (!values.includes(expression)) values.push(expression)
    target.set(codePoint, values)
  }
}

const extractComponentsFromText = (text, target) => {
  const bitmapPattern =
    /(?<![01])[01]{256}(?![01])|(?<![0-9A-Fa-f])[0-9A-Fa-f]{64}(?![0-9A-Fa-f])/gu
  for (const match of text.matchAll(bitmapPattern)) {
    const raw = match[0]
    const hex = normalizeBitmap(raw)
    if (hex === null || /^0{64}$/.test(hex)) continue
    const start = Math.max(0, match.index - 320)
    const context = text.slice(start, match.index)
    const characters = extractCharacters(context)
    if (characters.length === 0) continue

    const existing = target.get(hex) ?? new Set()
    for (const character of characters) existing.add(character)
    target.set(hex, existing)
  }
}

const walkTextFiles = async (directory) => {
  const result = []
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await walkTextFiles(fullPath)))
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      result.push(fullPath)
    }
  }
  return result
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

  const componentMap = new Map()
  const ids = new Map()
  const files = await walkTextFiles(absoluteSource)
  for (const file of files) {
    const text = await readFile(file, 'utf8')
    extractComponentsFromText(text, componentMap)
    extractIdsFromText(text, ids)
  }

  const components = [...componentMap.entries()]
    .map(([hex, characters]) => ({
      hex,
      characters: [...characters].sort(
        (left, right) => left.codePointAt(0) - right.codePointAt(0),
      ),
    }))
    .sort((left, right) => left.hex.localeCompare(right.hex, 'en'))

  return { sourceDirectory: absoluteSource, files, components, ids }
}

export const validateComponentSource = async (sourceDirectory) => {
  const decoded = await decodeUgeSource(sourceDirectory)
  if (decoded.components.length === 0) {
    throw new TypeError(
      'UGE source does not contain any valid 16x16 component records.',
    )
  }
  return decoded
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const source = process.argv[2]
  if (!source) {
    console.error('Usage: node validate-component-source.mjs <extracted-uge-directory>')
    process.exitCode = 2
  } else {
    try {
      const decoded = await validateComponentSource(source)
      console.log(
        `Validated ${decoded.components.length} components and ${decoded.ids.size} IDS records.`,
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
