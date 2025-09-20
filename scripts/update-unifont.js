import {
  readFileSync,
  writeFileSync,
  readdirSync,
  createReadStream,
  createWriteStream,
  existsSync,
  unlinkSync,
} from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '../public')
const outputFile = join(__dirname, '../public/unifont-map.json')

const getLatestVersion = async () => {
  try {
    const response = await fetch('https://unifoundry.com/pub/unifont/')
    const html = await response.text()

    const dirPattern = /href="unifont-(\d+\.\d+\.\d+)\/"/g
    const matches = []
    let match

    while ((match = dirPattern.exec(html)) !== null) {
      matches.push(match[1])
    }

    if (matches.length === 0) {
      throw new Error('No version directories found')
    }

    matches.sort((a, b) => {
      const aParts = a.split('.').map(Number)
      const bParts = b.split('.').map(Number)

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0
        const bVal = bParts[i] || 0
        if (aVal !== bVal) {
          return bVal - aVal
        }
      }
      return 0
    })

    return matches[0]
  } catch (error) {
    console.error('Error fetching latest version:', error)
    throw error
  }
}

const downloadUnifont = async (version) => {
  try {
    const url = `https://unifoundry.com/pub/unifont/unifont-${version}/font-builds/unifont_all-${version}.hex.gz`
    const gzPath = join(publicDir, `unifont_all-${version}.hex.gz`)
    const hexPath = join(publicDir, `unifont_all-${version}.hex`)

    console.log(`Downloading unifont ${version}...`)
    console.log(`URL: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`,
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(gzPath, buffer)

    console.log('Extracting gzip file...')
    const gunzip = createGunzip()
    const readStream = createReadStream(gzPath)
    const writeStream = createWriteStream(hexPath)

    await pipeline(readStream, gunzip, writeStream)

    unlinkSync(gzPath)
    console.log(
      `Successfully downloaded and extracted unifont_all-${version}.hex`,
    )

    return hexPath
  } catch (error) {
    console.error('Error downloading unifont:', error)
    throw error
  }
}

const processUnifont = () => {
  try {
    const files = readdirSync(publicDir)
    const unifontFiles = files.filter(
      (file) => file.startsWith('unifont_all-') && file.endsWith('.hex'),
    )

    if (unifontFiles.length === 0) {
      console.error(
        'Error: No unifont_all-*.hex file found in the public directory.',
      )
      return
    }

    if (unifontFiles.length > 1) {
      console.warn(
        'Warning: Multiple unifont_all-*.hex files found. Using the first one:',
        unifontFiles[0],
      )
    }

    const inputFile = join(publicDir, unifontFiles[0])
    const match = unifontFiles[0].match(/unifont_all-(\d+\.\d+\.\d+)\.hex/)
    let version = 'unknown'
    if (match && match[1]) {
      version = match[1]
    } else {
      console.warn(
        'Warning: Could not extract version from filename:',
        unifontFiles[0],
      )
    }

    const content = readFileSync(inputFile, 'utf8')
    const lines = content.split('\n')

    const data = {
      meta: {
        version: version,
        source: 'unifont_all',
      },
      glyphs: {},
    }

    for (const line of lines) {
      if (line && line.includes(':')) {
        const [code, hex] = line.split(':')
        data.glyphs[parseInt(code, 16)] = hex.trim()
      }
    }

    writeFileSync(outputFile, JSON.stringify(data, null, 2))
    console.log('Unifont data processed successfully!')
  } catch (error) {
    console.error('Error processing Unifont data:', error)
  }
}

const main = async () => {
  try {
    console.log('Getting latest unifont version...')
    let latestVersion

    try {
      latestVersion = await getLatestVersion()
      console.log(`Latest version: ${latestVersion}`)
    } catch {
      console.warn(
        'Unable to fetch latest version from server. Will process existing files.',
      )
      console.log('Processing existing unifont data...')
      processUnifont()
      return
    }

    const currentFiles = readdirSync(publicDir).filter(
      (file) => file.startsWith('unifont_all-') && file.endsWith('.hex'),
    )

    const currentVersionFile = currentFiles.find((file) =>
      file.includes(latestVersion),
    )

    if (!currentVersionFile) {
      console.log(`Current version not found, downloading ${latestVersion}...`)

      currentFiles.forEach((file) => {
        const oldFile = join(publicDir, file)
        if (existsSync(oldFile)) {
          unlinkSync(oldFile)
          console.log(`Removed old file: ${file}`)
        }
      })

      await downloadUnifont(latestVersion)
    } else {
      console.log(`Already have latest version: ${latestVersion}`)
    }

    console.log('Processing unifont data...')
    processUnifont()
  } catch (error) {
    console.error('Main process failed:', error)
    process.exit(1)
  }
}

main()
