import { readonly, ref, shallowRef } from 'vue'

import {
  getGlyphRepository,
  validateGlyphCollection,
  type GlyphRepository,
} from '@/storage/glyphRepository'
import type { Glyph } from '@/types/glyph'
import { scheduleIdleTask } from '@/utils/idleTask'

const glyphs = shallowRef<Glyph[]>([])
const loading = ref(false)
const loaded = ref(false)
const loadError = shallowRef<Error | null>(null)

let loadPromise: Promise<Glyph[]> | null = null
let revision = 0
let writeQueue: Promise<void> = Promise.resolve()
let repositoryOverride: GlyphRepository | null = null

const repository = (): GlyphRepository =>
  repositoryOverride ?? getGlyphRepository()

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Unable to load saved glyphs.')

export const loadGlyphLibrary = (force = false): Promise<Glyph[]> => {
  if (!force && loaded.value) return Promise.resolve(glyphs.value)
  if (loadPromise) return loadPromise

  const startedAtRevision = revision
  loading.value = true
  loadError.value = null
  const request = repository()
    .listGlyphs()
    .then((storedGlyphs) => {
      if (revision === startedAtRevision) {
        glyphs.value = storedGlyphs
        loaded.value = true
      }
      return glyphs.value
    })
    .catch((error: unknown) => {
      if (revision === startedAtRevision) {
        loaded.value = false
        loadError.value = toError(error)
      }
      throw error
    })
    .finally(() => {
      if (loadPromise === request) loadPromise = null
      loading.value = false
    })

  loadPromise = request
  return request
}

export const preloadGlyphLibrary = (): Promise<Glyph[]> => loadGlyphLibrary()

export const scheduleGlyphLibraryPreload = (): (() => void) =>
  scheduleIdleTask(() => void preloadGlyphLibrary().catch(() => undefined), {
    timeout: 1_500,
    fallbackDelay: 32,
  })

export const replaceGlyphLibrary = (
  nextGlyphs: readonly Glyph[],
): Promise<void> => {
  const validated = validateGlyphCollection(nextGlyphs)
  if (validated.rejected > 0 || validated.glyphs.length !== nextGlyphs.length) {
    return Promise.reject(
      new TypeError('Refusing to store an invalid glyph collection.'),
    )
  }

  revision += 1
  glyphs.value = validated.glyphs
  loaded.value = true
  loadError.value = null

  const snapshot = validated.glyphs
  const write = writeQueue
    .catch(() => undefined)
    .then(() => repository().replaceGlyphs(snapshot))
  writeQueue = write
  return write
}

export const useGlyphLibrary = () => ({
  glyphs,
  loading: readonly(loading),
  loaded: readonly(loaded),
  loadError: readonly(loadError),
  load: loadGlyphLibrary,
  preload: preloadGlyphLibrary,
  replaceGlyphs: replaceGlyphLibrary,
  schedulePreload: scheduleGlyphLibraryPreload,
})

export const __resetGlyphLibraryForTests = (
  nextRepository: GlyphRepository | null = null,
): void => {
  glyphs.value = []
  loading.value = false
  loaded.value = false
  loadError.value = null
  loadPromise = null
  revision = 0
  writeQueue = Promise.resolve()
  repositoryOverride = nextRepository
}
