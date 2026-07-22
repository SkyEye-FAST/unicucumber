import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const UNIFONT_CHUNK_SIZE = 0x1000
const MAX_CHUNK_ID = 0x10f

export const writeUnifontChunks = async (map, outputDirectory) => {
  await mkdir(outputDirectory, { recursive: true })
  const chunks = Array.from({ length: MAX_CHUNK_ID + 1 }, () => ({}))
  for (const [codePoint, hexValue] of Object.entries(map.glyphs)) {
    const chunkId = Math.floor(Number(codePoint) / UNIFONT_CHUNK_SIZE)
    if (chunks[chunkId]) chunks[chunkId][codePoint] = hexValue
  }

  for (let chunkId = 0; chunkId <= MAX_CHUNK_ID; chunkId += 1) {
    const name = chunkId.toString(16).toUpperCase().padStart(3, '0')
    const target = join(outputDirectory, `${name}.json`)
    const temporary = `${target}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(chunks[chunkId]), 'utf8')
    await rename(temporary, target)
  }

  const indexTarget = join(outputDirectory, 'index.json')
  const indexTemporary = `${indexTarget}.${process.pid}.tmp`
  await writeFile(
    indexTemporary,
    `${JSON.stringify({ ...map.meta, chunkSize: UNIFONT_CHUNK_SIZE, chunkCount: MAX_CHUNK_ID + 1 }, null, 2)}\n`,
    'utf8',
  )
  await rename(indexTemporary, indexTarget)
}

const invokedPath = process.argv[1]
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const source = JSON.parse(
    await readFile(join(repositoryRoot, 'public', 'unifont-map.json'), 'utf8'),
  )
  await writeUnifontChunks(source, join(repositoryRoot, 'public', 'unifont'))
  console.log(
    `Generated range chunks for ${Object.keys(source.glyphs).length} glyphs.`,
  )
}
