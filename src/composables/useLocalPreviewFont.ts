import { computed, readonly, ref, shallowRef } from 'vue'

import {
  getLocalPreviewFontRepository,
  type StoredLocalPreviewFont,
} from '@/storage/localPreviewFontRepository'

export const LOCAL_PREVIEW_FONT_FAMILY = 'UniCucumber Local Preview'
export const LOCAL_PREVIEW_FONT_ACCEPT = '.ttf,.otf,.woff,.woff2'

const SUPPORTED_EXTENSIONS = /\.(?:ttf|otf|woff2?)$/i

const localPreviewFontName = ref<string | null>(null)
const localPreviewFontActive = ref(false)
const localPreviewFontLoading = ref(false)
const localPreviewFontPersisted = ref(false)
const localPreviewFontError = shallowRef<Error | null>(null)

let activeFontFace: FontFace | null = null
let initialized = false
let initializationPromise: Promise<void> | null = null

const toError = (error: unknown, message: string): Error =>
  error instanceof Error ? error : new Error(message)

const requireFontFaceApi = (): FontFaceSet => {
  if (
    typeof FontFace === 'undefined' ||
    typeof document === 'undefined' ||
    !document.fonts
  ) {
    throw new Error('The browser does not support loading local font files.')
  }
  return document.fonts
}

const prepareFontFace = async (source: ArrayBuffer): Promise<FontFace> => {
  requireFontFaceApi()
  const fontFace = new FontFace(LOCAL_PREVIEW_FONT_FAMILY, source)
  return fontFace.load()
}

const activateFontFace = (fontFace: FontFace): void => {
  const fontSet = requireFontFaceApi()
  fontSet.add(fontFace)
  if (activeFontFace) fontSet.delete(activeFontFace)
  activeFontFace = fontFace
  localPreviewFontActive.value = true
}

const deactivateFontFace = (): void => {
  if (activeFontFace && typeof document !== 'undefined' && document.fonts) {
    document.fonts.delete(activeFontFace)
  }
  activeFontFace = null
  localPreviewFontActive.value = false
}

export const createPreviewFontStack = (
  fallback: string,
  hasLocalFont: boolean,
): string =>
  hasLocalFont ? `"${LOCAL_PREVIEW_FONT_FAMILY}", ${fallback}` : fallback

export const isSupportedLocalPreviewFontFile = (file: File): boolean =>
  file.size > 0 && SUPPORTED_EXTENSIONS.test(file.name)

export const initializeLocalPreviewFont = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (initializationPromise) return initializationPromise

  localPreviewFontLoading.value = true
  localPreviewFontError.value = null
  const request = (async () => {
    const repository = getLocalPreviewFontRepository()
    if (!repository) return
    const stored = await repository.load()
    if (!stored) return
    let fontFace: FontFace
    try {
      fontFace = await prepareFontFace(stored.data)
    } catch (error) {
      await repository.clear().catch(() => undefined)
      throw error
    }
    activateFontFace(fontFace)
    localPreviewFontName.value = stored.fileName
    localPreviewFontPersisted.value = true
  })()
    .catch((error: unknown) => {
      localPreviewFontError.value = toError(
        error,
        'Unable to restore the local preview font.',
      )
    })
    .finally(() => {
      initialized = true
      localPreviewFontLoading.value = false
      if (initializationPromise === request) initializationPromise = null
    })

  initializationPromise = request
  return request
}

export const importLocalPreviewFont = async (
  file: File,
): Promise<{ persisted: boolean }> => {
  if (!isSupportedLocalPreviewFontFile(file)) {
    throw new TypeError('Select a non-empty .ttf, .otf, .woff, or .woff2 file.')
  }

  await initializeLocalPreviewFont()
  localPreviewFontLoading.value = true
  localPreviewFontError.value = null

  try {
    const source = await file.arrayBuffer()
    const fontFace = await prepareFontFace(source)
    activateFontFace(fontFace)
    localPreviewFontName.value = file.name
    const repository = getLocalPreviewFontRepository()
    let persisted = false
    if (repository) {
      const record: StoredLocalPreviewFont = {
        id: 'current',
        fileName: file.name,
        mimeType: file.type,
        data: source,
        updatedAt: Date.now(),
      }
      try {
        await repository.save(record)
        persisted = true
      } catch (error) {
        await repository.clear().catch(() => undefined)
        localPreviewFontError.value = toError(
          error,
          'The local preview font could not be persisted.',
        )
      }
    }

    localPreviewFontPersisted.value = persisted
    return { persisted }
  } catch (error) {
    const normalized = toError(error, 'Unable to load the local preview font.')
    localPreviewFontError.value = normalized
    throw normalized
  } finally {
    localPreviewFontLoading.value = false
  }
}

export const removeLocalPreviewFont = async (): Promise<void> => {
  await initializeLocalPreviewFont()
  localPreviewFontError.value = null

  const repository = getLocalPreviewFontRepository()
  if (repository) {
    try {
      await repository.clear()
    } catch (error) {
      const normalized = toError(
        error,
        'Unable to remove the saved local font.',
      )
      localPreviewFontError.value = normalized
      throw normalized
    }
  }

  deactivateFontFace()
  localPreviewFontName.value = null
  localPreviewFontPersisted.value = false
}

export const useLocalPreviewFont = () => {
  void initializeLocalPreviewFont()
  return {
    localPreviewFontName: readonly(localPreviewFontName),
    localPreviewFontActive: readonly(localPreviewFontActive),
    localPreviewFontLoading: readonly(localPreviewFontLoading),
    localPreviewFontPersisted: readonly(localPreviewFontPersisted),
    localPreviewFontError: readonly(localPreviewFontError),
    effectivePreviewFont: (fallback: () => string) =>
      computed(() =>
        createPreviewFontStack(fallback(), localPreviewFontActive.value),
      ),
    importLocalPreviewFont,
    removeLocalPreviewFont,
  }
}

export const __resetLocalPreviewFontForTests = (): void => {
  deactivateFontFace()
  localPreviewFontName.value = null
  localPreviewFontLoading.value = false
  localPreviewFontPersisted.value = false
  localPreviewFontError.value = null
  initialized = false
  initializationPromise = null
}
