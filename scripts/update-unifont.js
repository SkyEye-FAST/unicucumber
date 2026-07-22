import { rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gunzip } from 'node:zlib'

import { writeUnifontChunks } from './chunk-unifont.js'
import { parseUnifontVersions, unifontHexToMap } from './unifont-utils.js'

const unzip = promisify(gunzip)
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const publicDirectory = join(scriptDirectory, '..', 'public')
const outputFile = join(publicDirectory, 'unifont-map.json')
const chunksDirectory = join(publicDirectory, 'unifont')
const timeoutMs = 30_000

const fetchWithTimeout = async (url) => {
  const signal = AbortSignal.timeout(timeoutMs)
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status} ${response.statusText}): ${url}`,
    )
  }
  return response
}

const getLatestVersion = async () => {
  const response = await fetchWithTimeout('https://unifoundry.com/pub/unifont/')
  const versions = parseUnifontVersions(await response.text())
  const latest = versions[0]
  if (latest === undefined)
    throw new Error('No Unifont versions were found in the release listing.')
  return latest
}

const downloadUnifontMap = async (version) => {
  const url = `https://unifoundry.com/pub/unifont/unifont-${version}/font-builds/unifont_all-${version}.hex.gz`
  const response = await fetchWithTimeout(url)
  const compressed = Buffer.from(await response.arrayBuffer())
  const source = (await unzip(compressed)).toString('utf8')
  return unifontHexToMap(source, version)
}

const replaceMapAtomically = async (map) => {
  const temporaryFile = `${outputFile}.${process.pid}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, outputFile)
  } finally {
    await rm(temporaryFile, { force: true })
  }
}

const main = async () => {
  const version = await getLatestVersion()
  console.log(`Downloading Unifont ${version}…`)
  const map = await downloadUnifontMap(version)
  await replaceMapAtomically(map)
  await writeUnifontChunks(map, chunksDirectory)
  console.log(
    `Updated ${outputFile} with ${Object.keys(map.glyphs).length} glyphs.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
