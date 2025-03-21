import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const inputFile = join(__dirname, '../src/assets/unifont_all-16.0.02.hex')
const outputFile = join(__dirname, '../src/assets/unifont-map.json')

const processUnifont = () => {
  const content = readFileSync(inputFile, 'utf8')
  const lines = content.split('\n')

  const data = {
    meta: {
      version: '16.0.02',
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
}

processUnifont()
