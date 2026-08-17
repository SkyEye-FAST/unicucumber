import type {
  CompositionComponentRecord,
  CompositionComponentSummary,
  CompositionDataManifest,
  CompositionIdsChunk,
} from '@/types/composition'
import { isUnicodeScalarValue } from '@/utils/charUtils'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

const isSemanticCharacter = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const characters = [...value]
  if (characters.length !== 1) return false
  const codePoint = characters[0]?.codePointAt(0)
  return codePoint !== undefined && isUnicodeScalarValue(codePoint)
}

const parseBounds = (
  value: unknown,
): CompositionComponentSummary['bounds'] | null => {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((entry) => Number.isInteger(entry))
  ) {
    return null
  }
  const [left, top, right, bottom] = value as number[]
  if (
    left === undefined ||
    top === undefined ||
    right === undefined ||
    bottom === undefined ||
    left < 0 ||
    top < 0 ||
    right > 16 ||
    bottom > 16 ||
    left >= right ||
    top >= bottom
  ) {
    return null
  }
  return [left, top, right, bottom]
}

const parseSummary = (
  value: unknown,
  expectedChunk?: string,
): CompositionComponentSummary | null => {
  if (!isRecord(value)) return null
  const { id, characters, bounds, chunk } = value
  if (
    typeof id !== 'string' ||
    !/^[0-9A-F]{16,64}$/.test(id) ||
    !Array.isArray(characters) ||
    characters.length === 0 ||
    !characters.every(isSemanticCharacter) ||
    new Set(characters).size !== characters.length ||
    typeof chunk !== 'string' ||
    !/^[0-9A-F]{2}$/.test(chunk) ||
    !id.startsWith(chunk) ||
    (expectedChunk !== undefined && chunk !== expectedChunk)
  ) {
    return null
  }
  const parsedBounds = parseBounds(bounds)
  if (parsedBounds === null) return null
  return {
    id,
    characters: [...characters],
    bounds: parsedBounds,
    chunk,
  }
}

export const parseCompositionManifest = (
  value: unknown,
): CompositionDataManifest | null => {
  if (!isRecord(value)) return null
  const {
    schemaVersion,
    dataVersion,
    componentCount,
    idsCount,
    componentChunkFormat,
    idsChunkFormat,
  } = value
  if (
    schemaVersion !== 1 ||
    typeof dataVersion !== 'string' ||
    !dataVersion.trim() ||
    !isCount(componentCount) ||
    !isCount(idsCount) ||
    componentChunkFormat !== 1 ||
    idsChunkFormat !== 1
  ) {
    return null
  }
  return {
    schemaVersion: 1,
    dataVersion,
    componentCount,
    idsCount,
    componentChunkFormat: 1,
    idsChunkFormat: 1,
  }
}

export const parseCompositionCatalog = (
  value: unknown,
): CompositionComponentSummary[] | null => {
  if (!Array.isArray(value)) return null
  const result: CompositionComponentSummary[] = []
  const ids = new Set<string>()
  for (const entry of value) {
    const parsed = parseSummary(entry)
    if (parsed === null || ids.has(parsed.id)) return null
    ids.add(parsed.id)
    result.push(parsed)
  }
  return result
}

export const parseCompositionComponentChunk = (
  chunk: string,
  value: unknown,
): CompositionComponentRecord[] | null => {
  const normalizedChunk = chunk.trim().toUpperCase()
  if (!/^[0-9A-F]{2}$/.test(normalizedChunk) || !Array.isArray(value)) {
    return null
  }
  const result: CompositionComponentRecord[] = []
  const ids = new Set<string>()
  for (const entry of value) {
    const summary = parseSummary(entry, normalizedChunk)
    if (
      summary === null ||
      !isRecord(entry) ||
      typeof entry.hex !== 'string' ||
      !/^[0-9A-F]{64}$/.test(entry.hex) ||
      ids.has(summary.id)
    ) {
      return null
    }
    ids.add(summary.id)
    result.push({ ...summary, hex: entry.hex })
  }
  return result
}

export const getCompositionIdsChunkId = (codePoint: number): string => {
  if (!isUnicodeScalarValue(codePoint)) {
    throw new RangeError('Invalid Unicode code point.')
  }
  return Math.floor(codePoint / 0x1000)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0')
}

export const parseCompositionIdsChunk = (
  chunk: string,
  value: unknown,
): CompositionIdsChunk | null => {
  const normalizedChunk = chunk.trim().toUpperCase()
  if (!/^[0-9A-F]{3}$/.test(normalizedChunk) || !isRecord(value)) return null

  const result: CompositionIdsChunk = {}
  for (const [decimal, expressions] of Object.entries(value)) {
    const codePoint = /^\d+$/.test(decimal)
      ? Number.parseInt(decimal, 10)
      : Number.NaN
    if (
      !isUnicodeScalarValue(codePoint) ||
      getCompositionIdsChunkId(codePoint) !== normalizedChunk ||
      !Array.isArray(expressions) ||
      expressions.length === 0 ||
      !expressions.every(
        (expression) => typeof expression === 'string' && expression.trim(),
      ) ||
      new Set(expressions).size !== expressions.length
    ) {
      return null
    }
    result[String(codePoint)] = [...expressions] as string[]
  }
  return result
}

const cacheVersion = (version: string): string =>
  version.trim().replace(/[^a-z0-9._-]+/gi, '-') || 'unknown'

export const getCompositionRuntimeCacheNames = (dataVersion: string) => {
  const suffix = cacheVersion(dataVersion)
  return {
    manifest: `unicucumber-composition-manifest-${suffix}`,
    catalog: `unicucumber-composition-catalog-${suffix}`,
    components: `unicucumber-composition-components-${suffix}`,
    ids: `unicucumber-composition-ids-${suffix}`,
  }
}

export const cleanupStaleCompositionCaches = async (
  dataVersion: string,
  cacheStorage: {
    keys: () => Promise<string[]>
    delete: (name: string) => Promise<boolean>
  } | null = (
    globalThis as typeof globalThis & {
      caches?: {
        keys: () => Promise<string[]>
        delete: (name: string) => Promise<boolean>
      }
    }
  ).caches ?? null,
): Promise<void> => {
  if (!dataVersion.trim() || !cacheStorage) return
  const current = new Set(
    Object.values(getCompositionRuntimeCacheNames(dataVersion)),
  )
  const managedPrefixes = [
    'unicucumber-composition-manifest-',
    'unicucumber-composition-catalog-',
    'unicucumber-composition-components-',
    'unicucumber-composition-ids-',
  ]
  const names = await cacheStorage.keys()
  await Promise.all(
    names
      .filter(
        (name) =>
          managedPrefixes.some((prefix) => name.startsWith(prefix)) &&
          !current.has(name),
      )
      .map((name) => cacheStorage.delete(name)),
  )
}
