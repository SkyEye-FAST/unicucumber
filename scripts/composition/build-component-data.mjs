import { createHash } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateComponentSource } from './validate-component-source.mjs'

const jsonText = (value) => `${JSON.stringify(value)}\n`

const componentBounds = (hex) => {
  let left = 16
  let top = 16
  let right = -1
  let bottom = -1
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      const bitIndex = row * 16 + col
      const nibble = Number.parseInt(hex[bitIndex >> 2], 16)
      const bit = (nibble >> (3 - (bitIndex & 3))) & 1
      if (bit === 0) continue
      left = Math.min(left, col)
      top = Math.min(top, row)
      right = Math.max(right, col)
      bottom = Math.max(bottom, row)
    }
  }
  if (right < left || bottom < top) {
    throw new TypeError('Composition components must contain a set pixel.')
  }
  return [left, top, right + 1, bottom + 1]
}

const semanticKey = (characters, hex) => JSON.stringify({ characters, hex })

const componentId = (characters, hex) =>
  createHash('sha256')
    .update(semanticKey(characters, hex), 'utf8')
    .digest('hex')
    .toUpperCase()
    .slice(0, 32)

const normalizeComponents = (components) => {
  const unique = new Map()
  for (const component of components) {
    const characters = [...new Set(component.characters)].sort(
      (left, right) => left.codePointAt(0) - right.codePointAt(0),
    )
    const hex = component.hex.toUpperCase()
    if (
      characters.length === 0 ||
      !/^[0-9A-F]{64}$/u.test(hex) ||
      /^0{64}$/u.test(hex)
    ) {
      continue
    }
    const key = semanticKey(characters, hex)
    if (!unique.has(key)) unique.set(key, { characters, hex })
  }

  const ids = new Map()
  return [...unique.values()]
    .map(({ characters, hex }) => {
      const id = componentId(characters, hex)
      const prior = ids.get(id)
      const key = semanticKey(characters, hex)
      if (prior !== undefined && prior !== key) {
        throw new TypeError(`Composition component digest collision: ${id}`)
      }
      ids.set(id, key)
      return {
        id,
        characters,
        bounds: componentBounds(hex),
        chunk: id.slice(0, 2),
        hex,
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id, 'en'))
}

const sortedIdsEntries = (ids) =>
  [...ids.entries()]
    .map(([codePoint, expressions]) => [
      codePoint,
      [...new Set(expressions)].sort((left, right) =>
        left.localeCompare(right, 'en'),
      ),
    ])
    .sort(([left], [right]) => left - right)

const validateDataVersion = (dataVersion) => {
  if (
    typeof dataVersion !== 'string' ||
    !dataVersion.trim() ||
    dataVersion !== dataVersion.trim()
  ) {
    throw new TypeError('Composition data version must be a non-empty string.')
  }
  return dataVersion
}

const writeJson = (file, value) => writeFile(file, jsonText(value), 'utf8')

const replaceDirectory = async (staging, output) => {
  const backup = `${output}.backup-${process.pid}`
  await rm(backup, { recursive: true, force: true })
  let backedUp = false
  try {
    try {
      await rename(output, backup)
      backedUp = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await rename(staging, output)
    if (backedUp) await rm(backup, { recursive: true, force: true })
  } catch (error) {
    if (backedUp) {
      await rm(output, { recursive: true, force: true })
      await rename(backup, output)
    }
    throw error
  }
}

export const buildCompositionData = async (
  sourceDirectory,
  outputDirectory,
  dataVersion,
) => {
  const normalizedVersion = validateDataVersion(dataVersion)
  const decoded = await validateComponentSource(sourceDirectory)
  const output = path.resolve(outputDirectory)
  const staging = `${output}.tmp-${process.pid}`
  const components = normalizeComponents(decoded.components)
  if (components.length === 0) {
    throw new TypeError('Composition source produced no runtime components.')
  }

  const catalog = components.map(({ id, characters, bounds, chunk }) => ({
    id,
    characters,
    bounds,
    chunk,
  }))
  const componentChunks = new Map()
  for (const component of components) {
    const records = componentChunks.get(component.chunk) ?? []
    records.push(component)
    componentChunks.set(component.chunk, records)
  }

  const idsChunks = new Map()
  for (const [codePoint, expressions] of sortedIdsEntries(decoded.ids)) {
    const chunk = Math.floor(codePoint / 0x1000)
      .toString(16)
      .toUpperCase()
      .padStart(3, '0')
    const records = idsChunks.get(chunk) ?? {}
    records[String(codePoint)] = expressions
    idsChunks.set(chunk, records)
  }

  const manifest = {
    schemaVersion: 1,
    dataVersion: normalizedVersion,
    componentCount: components.length,
    idsCount: decoded.ids.size,
    componentChunkFormat: 1,
    idsChunkFormat: 1,
  }

  await rm(staging, { recursive: true, force: true })
  await mkdir(path.join(staging, 'components'), { recursive: true })
  await mkdir(path.join(staging, 'ids'), { recursive: true })
  try {
    await writeJson(path.join(staging, 'catalog.json'), catalog)
    for (const [chunk, records] of [...componentChunks.entries()].sort()) {
      await writeJson(
        path.join(staging, 'components', `${chunk}.json`),
        records,
      )
    }
    for (const [chunk, records] of [...idsChunks.entries()].sort()) {
      await writeJson(path.join(staging, 'ids', `${chunk}.json`), records)
    }
    // Emit the manifest only after every referenced payload has been written.
    await writeJson(path.join(staging, 'index.json'), manifest)
    await replaceDirectory(staging, output)
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }

  return {
    dataVersion: normalizedVersion,
    componentCount: components.length,
    idsCount: decoded.ids.size,
    droppedIdsRecords: decoded.droppedIdsRecords,
    componentChunks: componentChunks.size,
    idsChunks: idsChunks.size,
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const args = process.argv.slice(2)
  if (args[0] === '--') args.shift()
  const source = args[0]
  const dataVersion = args[1]
  const output = args[2] ?? path.resolve('public/composition')
  if (!source || !dataVersion) {
    console.error(
      'Usage: node build-component-data.mjs <extracted-uge-directory> <data-version> [output-directory]',
    )
    process.exitCode = 2
  } else {
    try {
      const result = await buildCompositionData(source, output, dataVersion)
      console.log(
        `Built ${result.componentCount} components and ${result.idsCount} IDS records in ${result.componentChunks + result.idsChunks} chunks (${result.dataVersion}); omitted ${result.droppedIdsRecords} non-standard IDS records.`,
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
