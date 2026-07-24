import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')

const localesDir = resolve(projectRoot, 'src/locales')
const localeFiles = ['en.json', 'zh-cn.json', 'zh-tw.json']
const sourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = new Set(['.vue', '.ts', '.js', '.mjs'])

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const getLocalePath = (fileName) => resolve(localesDir, fileName)

const getLocaleKeys = (locale) => {
  const keys = new Set()

  const walk = (node, parts = []) => {
    if (typeof node === 'string') {
      keys.add(parts.join('.'))
      return
    }

    if (!node || typeof node !== 'object' || Array.isArray(node)) return

    for (const [key, value] of Object.entries(node)) {
      walk(value, [...parts, key])
    }
  }

  walk(locale)
  return keys
}

function* walkSourceFiles(directory) {
  let entries
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const path = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'locales' || entry.name === 'node_modules') continue
      yield* walkSourceFiles(path)
      continue
    }

    if (sourceExtensions.has(extname(entry.name))) yield path
  }
}

const getSourcePaths = () => [...walkSourceFiles(sourceRoot)]

const readAllSourceCode = () =>
  getSourcePaths()
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')

const findStaticKeys = (sourceCode) => {
  const keys = new Set()
  const patterns = [
    /\$t\s*\(\s*(["'])([^"']+)\1/g,
    /i18n\.global\.t\s*\(\s*(["'])([^"']+)\1/g,
    /(?<![\w$.])t\s*\(\s*(["'])([^"']+)\1/g,
  ]

  for (const pattern of patterns) {
    for (const match of sourceCode.matchAll(pattern)) keys.add(match[2])
  }

  return keys
}

const findTemplateKeys = (sourceCode) => {
  const templates = []
  const patterns = [
    /\$t\s*\(\s*`([^`]+)`/g,
    /i18n\.global\.t\s*\(\s*`([^`]+)`/g,
    /(?<![\w$.])t\s*\(\s*`([^`]+)`/g,
  ]

  for (const pattern of patterns) {
    for (const match of sourceCode.matchAll(pattern)) templates.push(match[1])
  }

  return templates
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getTemplateKeyPatterns = (sourceCode) =>
  findTemplateKeys(sourceCode).map(
    (template) =>
      new RegExp(
        `^${template
          .split(/\$\{[^}]*\}/)
          .map(escapeRegExp)
          .join('.*')}$`,
      ),
  )

const findUsedKeys = (allKeys, sourceCode) => {
  const usedKeys = new Set(findStaticKeys(sourceCode))

  for (const pattern of getTemplateKeyPatterns(sourceCode)) {
    for (const key of allKeys) {
      if (pattern.test(key)) usedKeys.add(key)
    }
  }

  for (const key of allKeys) {
    if (usedKeys.has(key)) continue

    const literalPattern = new RegExp(`["]${escapeRegExp(key)}["]`)
    const singleQuotePattern = new RegExp(`[']${escapeRegExp(key)}[']`)
    if (
      literalPattern.test(sourceCode) ||
      singleQuotePattern.test(sourceCode)
    ) {
      usedKeys.add(key)
    }
  }

  return usedKeys
}

const pruneLocale = (locale, unusedKeys) => {
  const walk = (node, parts = []) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false

    for (const [key, value] of Object.entries(node)) {
      const keyPath = [...parts, key]
      const localeKey = keyPath.join('.')

      if (typeof value === 'string' && unusedKeys.has(localeKey)) {
        delete node[key]
        continue
      }

      if (value && typeof value === 'object' && walk(value, keyPath)) {
        delete node[key]
      }
    }

    return Object.keys(node).length === 0
  }

  walk(locale)
  return locale
}

const getMissingKeys = (referenceKeys, otherKeys) =>
  [...referenceKeys].filter((key) => !otherKeys.has(key))

const verifyLocales = (keysByFile) => {
  const referenceFile = localeFiles[0]
  const referenceKeys = keysByFile.get(referenceFile)
  let hasError = false

  for (const fileName of localeFiles.slice(1)) {
    const localeKeys = keysByFile.get(fileName)
    const missingFromLocale = getMissingKeys(referenceKeys, localeKeys)
    const missingFromReference = getMissingKeys(localeKeys, referenceKeys)

    if (missingFromLocale.length > 0) {
      console.error(`Keys in ${referenceFile} but missing from ${fileName}:`)
      for (const key of missingFromLocale) console.error(`  - ${key}`)
      hasError = true
    }

    if (missingFromReference.length > 0) {
      console.error(`Keys in ${fileName} but missing from ${referenceFile}:`)
      for (const key of missingFromReference) console.error(`  - ${key}`)
      hasError = true
    }
  }

  if (!hasError) {
    console.log(`Done: ${localeFiles.length} locale files are in sync`)
  }

  return !hasError
}

const localesByFile = new Map(
  localeFiles.map((fileName) => [fileName, readJson(getLocalePath(fileName))]),
)
const keysByFile = new Map(
  [...localesByFile].map(([fileName, locale]) => [
    fileName,
    getLocaleKeys(locale),
  ]),
)

if (!verifyLocales(keysByFile)) process.exit(1)

const allKeys = keysByFile.get(localeFiles[0])
const sourceCode = readAllSourceCode()
const usedKeys = findUsedKeys(allKeys, sourceCode)
const unusedKeys = new Set([...allKeys].filter((key) => !usedKeys.has(key)))

console.log(`Found ${allKeys.size} keys in ${localeFiles[0]}`)
console.log(`Found ${usedKeys.size} referenced locale keys`)

if (unusedKeys.size === 0) {
  console.log('Done: no unused locale keys found')
  process.exit(0)
}

console.log(`Found ${unusedKeys.size} unused locale keys:`)
for (const key of [...unusedKeys].sort()) console.log(`  - ${key}`)

if (dryRun) {
  console.log('Done: dry run only; no files were modified')
  process.exit(0)
}

for (const fileName of localeFiles) {
  const localePath = getLocalePath(fileName)
  const locale = pruneLocale(readJson(localePath), unusedKeys)
  writeJson(localePath, locale)
  console.log(`Done: removed unused keys from ${fileName}`)
}

const finalKeysByFile = new Map(
  localeFiles.map((fileName) => [
    fileName,
    getLocaleKeys(readJson(getLocalePath(fileName))),
  ]),
)

if (!verifyLocales(finalKeysByFile)) process.exit(1)
