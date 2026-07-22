export interface UnifontManifest {
  version: string
  source: string
  chunkSize: number
  chunkCount: number
}

export const parseUnifontManifest = (
  value: unknown,
): UnifontManifest | null => {
  if (value === null || typeof value !== 'object') return null
  const manifest = value as Partial<UnifontManifest>
  if (
    typeof manifest.version !== 'string' ||
    !manifest.version.trim() ||
    typeof manifest.source !== 'string' ||
    !Number.isInteger(manifest.chunkSize) ||
    (manifest.chunkSize ?? 0) <= 0 ||
    !Number.isInteger(manifest.chunkCount) ||
    (manifest.chunkCount ?? 0) <= 0
  ) {
    return null
  }
  return {
    version: manifest.version,
    source: manifest.source,
    chunkSize: manifest.chunkSize,
    chunkCount: manifest.chunkCount,
  } as UnifontManifest
}

const cacheVersion = (version: string): string =>
  version.trim().replace(/[^a-z0-9._-]+/gi, '-') || 'unknown'

export const getUnifontRuntimeCacheNames = (version: string) => {
  const suffix = cacheVersion(version)
  return {
    manifest: `unicucumber-unifont-manifest-${suffix}`,
    chunks: `unicucumber-unifont-chunks-${suffix}`,
  }
}

export const cleanupStaleUnifontCaches = async (
  version: string,
): Promise<void> => {
  const cacheStorage = (
    globalThis as typeof globalThis & {
      caches?: {
        keys: () => Promise<string[]>
        delete: (name: string) => Promise<boolean>
      }
    }
  ).caches
  if (!version.trim() || !cacheStorage) return
  const current = new Set(Object.values(getUnifontRuntimeCacheNames(version)))
  const names = await cacheStorage.keys()
  await Promise.all(
    names
      .filter(
        (name) => name.startsWith('unicucumber-unifont-') && !current.has(name),
      )
      .map((name) => cacheStorage.delete(name)),
  )
}
