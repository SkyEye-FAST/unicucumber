import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '../public')
const outputFile = join(__dirname, '../public/unifont-map.json')

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

processUnifont()
