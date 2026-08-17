import { createHash } from 'node:crypto'
import {
  mkdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateComponentSource } from './validate-component-source.mjs'

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const componentBounds = (hex) => {
  const bits = [...hex]
    .flatMap((digit) =>
      Number.parseInt(digit, 16).toString(2).padStart(4, '0').split(''),
    )
  let left = 16
  let top = 16
  let right = -1
  let bottom = -1
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      if (bits[row * 16 + col] !== '1') continue
      left = Math.min(left, col)
      top = Math.min(top, row)
      right = Math.max(right, col)
      bottom = Math.max(bottom, row)
    }
  }
  if (right < left || bottom < top) {
    throw new TypeError('Composition components must contain at least one set pixel.')
  }
  return [left, top, right + 1, bottom + 1]
}

const componentId = (hex) =>
  createHash('sha256').update(hex, 'ascii').digest('hex').toUpperCase()

const idsEntries = (ids) =>
  [...ids.entries()]
    .map(([codePoint, expressions]) => [
      codePoint,
      [...expressions].sort((left, right) => left.localeCompare(right, 'en')),
    ])
    .sort(([left], [right]) => left - right)

const dataVersionFor = (components, ids) => {
  const canonical = JSON.stringify({
    components: components.map(({ id, characters, hex }) => ({
      id,
      characters,
      hex,
    })),
    ids: idsEntries(ids),
  })
  return `uge-${createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 16)}`
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

export const buildCompositionData = async (sourceDirectory, outputDirectory) => {
  const decoded = await validateComponentSource(sourceDirectory)
  const output = path.resolve(outputDirectory)
  const staging = `${output}.tmp-${process.pid}`

  const components = decoded.components
    .map(({ hex, characters }) => {
      const id = componentId(hex)
      return {
        id,
        characters,
        bounds: componentBounds(hex),
        chunk: id.slice(0, 2),
        hex,
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id, 'en'))

  const dataVersion = dataVersionFor(components, decoded.ids)
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
  for (const [codePoint, expressions] of idsEntries(decoded.ids)) {
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
    dataVersion,
    componentCount: components.length,
    idsCount: decoded.ids.size,
    componentChunkFormat: 1,
    idsChunkFormat: 1,
  }

  await rm(staging, { recursive: true, force: true })
  await mkdir(path.join(staging, 'components'), { recursive: true })
  await mkdir(path.join(staging, 'ids'), { recursive: true })
  try {
    await writeJson(path.join(staging, 'index.json'), manifest)
    await writeJson(path.join(staging, 'catalog.json'), catalog)
    for (const [chunk, records] of [...componentChunks.entries()].sort()) {
      await writeJson(path.join(staging, 'components', `${chunk}.json`), records)
    }
    for (const [chunk, records] of [...idsChunks.entries()].sort()) {
      await writeJson(path.join(staging, 'ids', `${chunk}.json`), records)
    }
    await replaceDirectory(staging, output)
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }

  return {
    dataVersion,
    componentCount: components.length,
    idsCount: decoded.ids.size,
    componentChunks: componentChunks.size,
    idsChunks: idsChunks.size,
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const source = process.argv[2]
  const output = process.argv[3] ?? path.resolve('public/composition')
  if (!source) {
    console.error(
      'Usage: node build-component-data.mjs <extracted-uge-directory> [output-directory]',
    )
    process.exitCode = 2
  } else {
    try {
      const result = await buildCompositionData(source, output)
      console.log(
        `Built ${result.componentCount} components and ${result.idsCount} IDS records (${result.dataVersion}).`,
      )
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
