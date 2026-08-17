import type {
  CompositionDocument,
  CompositionLayer,
  CompositionOperation,
} from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { normalizeCodePointHex } from '@/utils/charUtils'
import { deepCloneGrid } from '@/utils/hexUtils'

import { StorageQuotaError, StorageUnavailableError } from './glyphRepository'

const DATABASE_NAME = 'unicucumber-composition'
const DATABASE_VERSION = 1
const DRAFT_STORE = 'drafts'
const FALLBACK_KEY = 'unicucumber_composition_drafts_v1'
const GRID_SIZE = 16

export interface StoredCompositionDraft {
  id: string
  schemaVersion: 1
  updatedAt: number
  document: CompositionDocument
}

export interface CompositionDraftRepository {
  readonly persistent: boolean
  saveDraft: (draft: StoredCompositionDraft) => Promise<void>
  loadDraft: (codePoint: string) => Promise<StoredCompositionDraft | null>
  deleteDraft: (codePoint: string) => Promise<void>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isGrid16 = (value: unknown): value is GridData =>
  Array.isArray(value) &&
  value.length === GRID_SIZE &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === GRID_SIZE &&
      row.every((cell) => cell === 0 || cell === 1),
  )

const isOperation = (value: unknown): value is CompositionOperation =>
  value === 'add' || value === 'subtract' || value === 'intersect'

const validateLayer = (value: unknown): CompositionLayer | null => {
  if (!isRecord(value)) return null
  const {
    id,
    name,
    bitmap,
    offsetX,
    offsetY,
    mask,
    operation,
    visible,
    locked,
    componentId,
  } = value
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof name !== 'string' ||
    !isGrid16(bitmap) ||
    typeof offsetX !== 'number' ||
    !Number.isInteger(offsetX) ||
    typeof offsetY !== 'number' ||
    !Number.isInteger(offsetY) ||
    (mask !== null && !isGrid16(mask)) ||
    !isOperation(operation) ||
    typeof visible !== 'boolean' ||
    typeof locked !== 'boolean' ||
    (componentId !== undefined &&
      (typeof componentId !== 'string' || componentId.length === 0))
  ) {
    return null
  }

  return {
    id,
    name,
    bitmap: deepCloneGrid(bitmap),
    offsetX,
    offsetY,
    mask: mask === null ? null : deepCloneGrid(mask),
    operation,
    visible,
    locked,
    ...(componentId === undefined ? {} : { componentId }),
  }
}

const validateDocument = (value: unknown): CompositionDocument | null => {
  if (!isRecord(value)) return null
  const codePoint =
    typeof value.codePoint === 'string'
      ? normalizeCodePointHex(value.codePoint)
      : null
  if (
    value.schemaVersion !== 1 ||
    value.width !== GRID_SIZE ||
    codePoint === null ||
    value.codePoint !== codePoint ||
    !Array.isArray(value.layers)
  ) {
    return null
  }

  const layers: CompositionLayer[] = []
  const layerIds = new Set<string>()
  for (const candidate of value.layers) {
    const layer = validateLayer(candidate)
    if (layer === null || layerIds.has(layer.id)) return null
    layerIds.add(layer.id)
    layers.push(layer)
  }

  return {
    schemaVersion: 1,
    codePoint,
    width: 16,
    layers,
  }
}

export const validateCompositionDraft = (
  value: unknown,
): StoredCompositionDraft | null => {
  if (!isRecord(value)) return null
  const id =
    typeof value.id === 'string' ? normalizeCodePointHex(value.id) : null
  const document = validateDocument(value.document)
  if (
    id === null ||
    value.id !== id ||
    value.schemaVersion !== 1 ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt) ||
    value.updatedAt < 0 ||
    document === null ||
    document.codePoint !== id
  ) {
    return null
  }

  return {
    id,
    schemaVersion: 1,
    updatedAt: value.updatedAt,
    document,
  }
}

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed.')),
      { once: true },
    )
  })

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () =>
        reject(
          transaction.error ?? new Error('IndexedDB transaction aborted.'),
        ),
      { once: true },
    )
    transaction.addEventListener(
      'error',
      () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed.')),
      { once: true },
    )
  })

const toStorageError = (error: unknown, operation: string): Error => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new StorageQuotaError(
      `Storage quota was exceeded while ${operation}.`,
      { cause: error },
    )
  }
  if (
    error instanceof StorageQuotaError ||
    error instanceof StorageUnavailableError
  ) {
    return error
  }
  return new StorageUnavailableError(`Storage failed while ${operation}.`, {
    cause: error,
  })
}

const normalizeLookup = (codePoint: string): string | null =>
  normalizeCodePointHex(codePoint)

export class IndexedDbCompositionDraftRepository implements CompositionDraftRepository {
  readonly persistent = true
  private databasePromise: Promise<IDBDatabase> | null = null

  constructor(
    private readonly indexedDb: IDBFactory,
    private readonly databaseName = DATABASE_NAME,
  ) {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    const request = new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = this.indexedDb.open(
        this.databaseName,
        DATABASE_VERSION,
      )
      openRequest.addEventListener('upgradeneeded', () => {
        const database = openRequest.result
        if (!database.objectStoreNames.contains(DRAFT_STORE)) {
          database.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
        }
      })
      openRequest.addEventListener(
        'success',
        () => resolve(openRequest.result),
        {
          once: true,
        },
      )
      openRequest.addEventListener(
        'error',
        () =>
          reject(openRequest.error ?? new Error('Unable to open IndexedDB.')),
        { once: true },
      )
      openRequest.addEventListener(
        'blocked',
        () => reject(new StorageUnavailableError('IndexedDB is blocked.')),
        { once: true },
      )
    })
    const resetOnFailure = request.catch((error: unknown) => {
      if (this.databasePromise === resetOnFailure) this.databasePromise = null
      throw error
    })
    this.databasePromise = resetOnFailure
    return resetOnFailure
  }

  async saveDraft(draft: StoredCompositionDraft): Promise<void> {
    const validated = validateCompositionDraft(draft)
    if (validated === null) {
      throw new TypeError('Refusing to store an invalid composition draft.')
    }
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readwrite')
      transaction.objectStore(DRAFT_STORE).put(validated)
      await transactionDone(transaction)
    } catch (error) {
      throw toStorageError(error, 'saving a composition draft')
    }
  }

  async loadDraft(codePoint: string): Promise<StoredCompositionDraft | null> {
    const id = normalizeLookup(codePoint)
    if (id === null) return null
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readonly')
      return validateCompositionDraft(
        await requestResult(transaction.objectStore(DRAFT_STORE).get(id)),
      )
    } catch (error) {
      throw toStorageError(error, 'loading a composition draft')
    }
  }

  async deleteDraft(codePoint: string): Promise<void> {
    const id = normalizeLookup(codePoint)
    if (id === null) return
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readwrite')
      transaction.objectStore(DRAFT_STORE).delete(id)
      await transactionDone(transaction)
    } catch (error) {
      throw toStorageError(error, 'deleting a composition draft')
    }
  }
}

const parseFallbackCollection = (
  value: unknown,
): Record<string, StoredCompositionDraft> => {
  if (!isRecord(value)) return {}
  const result: Record<string, StoredCompositionDraft> = {}
  for (const [key, candidate] of Object.entries(value)) {
    const draft = validateCompositionDraft(candidate)
    if (draft !== null && draft.id === key) result[key] = draft
  }
  return result
}

export class LocalStorageCompositionDraftRepository implements CompositionDraftRepository {
  readonly persistent = false

  constructor(private readonly storage: Storage | null) {}

  private requireStorage(): Storage {
    if (!this.storage) {
      throw new StorageUnavailableError('Local storage is unavailable.')
    }
    return this.storage
  }

  private readCollection(): Record<string, StoredCompositionDraft> {
    const raw = this.requireStorage().getItem(FALLBACK_KEY)
    if (!raw) return {}
    try {
      return parseFallbackCollection(JSON.parse(raw))
    } catch {
      return {}
    }
  }

  async saveDraft(draft: StoredCompositionDraft): Promise<void> {
    const validated = validateCompositionDraft(draft)
    if (validated === null) {
      throw new TypeError('Refusing to store an invalid composition draft.')
    }
    try {
      const collection = this.readCollection()
      collection[validated.id] = validated
      this.requireStorage().setItem(FALLBACK_KEY, JSON.stringify(collection))
    } catch (error) {
      throw toStorageError(error, 'saving a composition draft')
    }
  }

  async loadDraft(codePoint: string): Promise<StoredCompositionDraft | null> {
    const id = normalizeLookup(codePoint)
    if (id === null) return null
    try {
      return this.readCollection()[id] ?? null
    } catch (error) {
      throw toStorageError(error, 'loading a composition draft')
    }
  }

  async deleteDraft(codePoint: string): Promise<void> {
    const id = normalizeLookup(codePoint)
    if (id === null) return
    try {
      const storage = this.requireStorage()
      const collection = this.readCollection()
      delete collection[id]
      if (Object.keys(collection).length === 0) storage.removeItem(FALLBACK_KEY)
      else storage.setItem(FALLBACK_KEY, JSON.stringify(collection))
    } catch (error) {
      throw toStorageError(error, 'deleting a composition draft')
    }
  }
}

const canFallback = (error: unknown): boolean =>
  error instanceof StorageUnavailableError || error instanceof StorageQuotaError

export class FallbackCompositionDraftRepository implements CompositionDraftRepository {
  private selected: CompositionDraftRepository | null = null

  constructor(
    private readonly primary: CompositionDraftRepository,
    private readonly fallback: CompositionDraftRepository,
  ) {}

  get persistent(): boolean {
    return this.selected?.persistent ?? this.primary.persistent
  }

  private async run<T>(
    operation: (repository: CompositionDraftRepository) => Promise<T>,
  ): Promise<T> {
    if (this.selected) return operation(this.selected)
    try {
      const result = await operation(this.primary)
      this.selected = this.primary
      return result
    } catch (primaryError) {
      if (!canFallback(primaryError)) throw primaryError
      try {
        const result = await operation(this.fallback)
        this.selected = this.fallback
        return result
      } catch (fallbackError) {
        if (fallbackError instanceof StorageQuotaError) throw fallbackError
        throw new StorageUnavailableError(
          'Primary and fallback composition storage are unavailable.',
          { cause: new AggregateError([primaryError, fallbackError]) },
        )
      }
    }
  }

  saveDraft(draft: StoredCompositionDraft): Promise<void> {
    return this.run((repository) => repository.saveDraft(draft))
  }

  loadDraft(codePoint: string): Promise<StoredCompositionDraft | null> {
    return this.run((repository) => repository.loadDraft(codePoint))
  }

  deleteDraft(codePoint: string): Promise<void> {
    return this.run((repository) => repository.deleteDraft(codePoint))
  }
}

let repository: CompositionDraftRepository | null = null

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const getCompositionDraftRepository = (): CompositionDraftRepository => {
  if (repository) return repository
  const fallback = new LocalStorageCompositionDraftRepository(getLocalStorage())
  repository =
    typeof indexedDB === 'undefined'
      ? fallback
      : new FallbackCompositionDraftRepository(
          new IndexedDbCompositionDraftRepository(indexedDB),
          fallback,
        )
  return repository
}
