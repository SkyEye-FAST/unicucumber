import type { EditorDocumentSnapshot } from '@/types/editor'
import type { Glyph, GlyphWidth, GridData } from '@/types/glyph'
import { normalizeCodePointHex } from '@/utils/charUtils'
import {
  deepCloneGrid,
  GRID_HEIGHT,
  gridToHex,
  isGlyphWidth,
  normalizeHex,
} from '@/utils/hexUtils'

const DATABASE_NAME = 'unicucumber'
const DATABASE_VERSION = 1
const GLYPH_STORE = 'glyphs'
const DRAFT_STORE = 'drafts'
const META_STORE = 'meta'
const LEGACY_GLYPHS_KEY = 'unicucumber_glyphs'
const FALLBACK_DRAFT_KEY = 'unicucumber_draft_v1'
const MIGRATION_KEY = 'legacy-local-storage-v1'

export interface StoredDraft {
  id: 'current'
  schemaVersion: 1
  updatedAt: number
  snapshot: EditorDocumentSnapshot
}

export interface MigrationResult {
  migrated: number
  rejected: number
  alreadyComplete: boolean
}

export interface GlyphRepository {
  readonly persistent: boolean
  migrateLegacyGlyphs: () => Promise<MigrationResult>
  listGlyphs: () => Promise<Glyph[]>
  replaceGlyphs: (glyphs: readonly Glyph[]) => Promise<void>
  saveDraft: (draft: StoredDraft) => Promise<void>
  loadDraft: () => Promise<StoredDraft | null>
  deleteDraft: () => Promise<void>
}

export class StorageUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageUnavailableError'
  }
}

export class StorageQuotaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageQuotaError'
  }
}

const toStorageError = (error: unknown, operation: string): Error => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new StorageQuotaError(
      `Storage quota was exceeded while ${operation}.`,
      {
        cause: error,
      },
    )
  }
  return error instanceof Error
    ? error
    : new StorageUnavailableError(`Storage failed while ${operation}.`)
}

export const validateGlyph = (value: unknown): Glyph | null => {
  if (value === null || typeof value !== 'object') return null
  const candidate = value as Partial<Glyph>
  if (
    typeof candidate.codePoint !== 'string' ||
    typeof candidate.hexValue !== 'string'
  ) {
    return null
  }
  const codePoint = normalizeCodePointHex(candidate.codePoint)
  const hexValue = normalizeHex(candidate.hexValue)
  if (codePoint === null || hexValue === null) return null
  return { codePoint, hexValue }
}

export const validateGlyphCollection = (
  value: unknown,
): { glyphs: Glyph[]; rejected: number } => {
  if (!Array.isArray(value))
    return { glyphs: [], rejected: value == null ? 0 : 1 }
  const glyphs = new Map<string, Glyph>()
  let rejected = 0
  for (const item of value) {
    const glyph = validateGlyph(item)
    if (glyph === null) {
      rejected += 1
      continue
    }
    glyphs.set(glyph.codePoint, glyph)
  }
  return {
    glyphs: [...glyphs.values()].sort(
      (left, right) =>
        Number.parseInt(left.codePoint, 16) -
        Number.parseInt(right.codePoint, 16),
    ),
    rejected,
  }
}

const isValidGrid = (value: unknown, width: GlyphWidth): value is GridData =>
  Array.isArray(value) &&
  value.length === GRID_HEIGHT &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === width &&
      row.every((cell) => cell === 0 || cell === 1),
  )

const validateSnapshot = (value: unknown): EditorDocumentSnapshot | null => {
  if (value === null || typeof value !== 'object') return null
  const candidate = value as Partial<EditorDocumentSnapshot>
  const codePoint =
    typeof candidate.codePoint === 'string'
      ? normalizeCodePointHex(candidate.codePoint)
      : null
  if (
    codePoint === null ||
    !isGlyphWidth(candidate.width) ||
    !isValidGrid(candidate.grid, candidate.width)
  ) {
    return null
  }
  const hex = gridToHex(candidate.grid)
  if (
    normalizeHex(hex) === null ||
    candidate.grid[0]?.length !== candidate.width
  ) {
    return null
  }
  return {
    codePoint,
    width: candidate.width,
    grid: deepCloneGrid(candidate.grid),
    activeGlyphId:
      typeof candidate.activeGlyphId === 'string'
        ? candidate.activeGlyphId
        : null,
  }
}

export const validateDraft = (value: unknown): StoredDraft | null => {
  if (value === null || typeof value !== 'object') return null
  const candidate = value as Partial<StoredDraft>
  const snapshot = validateSnapshot(candidate.snapshot)
  if (
    candidate.id !== 'current' ||
    candidate.schemaVersion !== 1 ||
    typeof candidate.updatedAt !== 'number' ||
    !Number.isFinite(candidate.updatedAt) ||
    snapshot === null
  ) {
    return null
  }
  return {
    id: 'current',
    schemaVersion: 1,
    updatedAt: candidate.updatedAt,
    snapshot,
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

export class IndexedDbGlyphRepository implements GlyphRepository {
  readonly persistent = true
  private databasePromise: Promise<IDBDatabase> | null = null
  private migrationPromise: Promise<MigrationResult> | null = null
  private migrationComplete = false

  constructor(
    private readonly indexedDb: IDBFactory,
    private readonly legacyStorage: Storage | null,
    private readonly databaseName = DATABASE_NAME,
  ) {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    const request = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDb.open(this.databaseName, DATABASE_VERSION)
      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        if (!database.objectStoreNames.contains(GLYPH_STORE)) {
          database.createObjectStore(GLYPH_STORE, { keyPath: 'codePoint' })
        }
        if (!database.objectStoreNames.contains(DRAFT_STORE)) {
          database.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' })
        }
      })
      request.addEventListener('success', () => resolve(request.result), {
        once: true,
      })
      request.addEventListener(
        'error',
        () => reject(request.error ?? new Error('Unable to open IndexedDB.')),
        { once: true },
      )
      request.addEventListener(
        'blocked',
        () =>
          reject(new StorageUnavailableError('IndexedDB upgrade is blocked.')),
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

  private async runLegacyMigration(): Promise<MigrationResult> {
    try {
      const database = await this.open()
      const checkTransaction = database.transaction(META_STORE, 'readonly')
      const marker = await requestResult(
        checkTransaction.objectStore(META_STORE).get(MIGRATION_KEY),
      )
      if (marker) return { migrated: 0, rejected: 0, alreadyComplete: true }

      let parsed: unknown = []
      const raw = this.legacyStorage?.getItem(LEGACY_GLYPHS_KEY)
      if (raw) {
        try {
          parsed = JSON.parse(raw)
        } catch {
          parsed = Symbol('corrupted')
        }
      }
      const { glyphs, rejected } = validateGlyphCollection(parsed)
      const transaction = database.transaction(
        [GLYPH_STORE, META_STORE],
        'readwrite',
      )
      const glyphStore = transaction.objectStore(GLYPH_STORE)
      for (const glyph of glyphs) glyphStore.put(glyph)
      transaction.objectStore(META_STORE).put({
        key: MIGRATION_KEY,
        completedAt: Date.now(),
        migrated: glyphs.length,
        rejected,
      })
      await transactionDone(transaction)
      return { migrated: glyphs.length, rejected, alreadyComplete: false }
    } catch (error) {
      throw toStorageError(error, 'migrating saved glyphs')
    }
  }

  migrateLegacyGlyphs(): Promise<MigrationResult> {
    if (this.migrationComplete) {
      return Promise.resolve({
        migrated: 0,
        rejected: 0,
        alreadyComplete: true,
      })
    }
    if (this.migrationPromise) return this.migrationPromise
    const request = this.runLegacyMigration()
      .then((result) => {
        this.migrationComplete = true
        return result
      })
      .catch((error) => {
        if (this.migrationPromise === request) this.migrationPromise = null
        throw error
      })
    this.migrationPromise = request
    return request
  }

  async listGlyphs(): Promise<Glyph[]> {
    await this.migrateLegacyGlyphs()
    try {
      const database = await this.open()
      const transaction = database.transaction(GLYPH_STORE, 'readonly')
      const values = await requestResult(
        transaction.objectStore(GLYPH_STORE).getAll(),
      )
      return validateGlyphCollection(values).glyphs
    } catch (error) {
      throw toStorageError(error, 'loading saved glyphs')
    }
  }

  async replaceGlyphs(glyphs: readonly Glyph[]): Promise<void> {
    const validated = validateGlyphCollection(glyphs)
    if (validated.rejected > 0 || validated.glyphs.length !== glyphs.length) {
      throw new TypeError('Refusing to store an invalid glyph collection.')
    }
    try {
      const database = await this.open()
      const transaction = database.transaction(GLYPH_STORE, 'readwrite')
      const store = transaction.objectStore(GLYPH_STORE)
      store.clear()
      for (const glyph of validated.glyphs) store.put(glyph)
      await transactionDone(transaction)
    } catch (error) {
      throw toStorageError(error, 'saving glyphs')
    }
  }

  async saveDraft(draft: StoredDraft): Promise<void> {
    const validated = validateDraft(draft)
    if (validated === null)
      throw new TypeError('Refusing to store an invalid draft.')
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readwrite')
      transaction.objectStore(DRAFT_STORE).put(validated)
      await transactionDone(transaction)
    } catch (error) {
      throw toStorageError(error, 'saving the current draft')
    }
  }

  async loadDraft(): Promise<StoredDraft | null> {
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readonly')
      return validateDraft(
        await requestResult(
          transaction.objectStore(DRAFT_STORE).get('current'),
        ),
      )
    } catch (error) {
      throw toStorageError(error, 'loading the current draft')
    }
  }

  async deleteDraft(): Promise<void> {
    try {
      const database = await this.open()
      const transaction = database.transaction(DRAFT_STORE, 'readwrite')
      transaction.objectStore(DRAFT_STORE).delete('current')
      await transactionDone(transaction)
    } catch (error) {
      throw toStorageError(error, 'deleting the current draft')
    }
  }
}

export class LocalStorageGlyphRepository implements GlyphRepository {
  readonly persistent = false

  constructor(private readonly storage: Storage | null) {}

  private requireStorage(): Storage {
    if (!this.storage) {
      throw new StorageUnavailableError('Local storage is unavailable.')
    }
    return this.storage
  }

  async migrateLegacyGlyphs(): Promise<MigrationResult> {
    try {
      const raw = this.requireStorage().getItem(LEGACY_GLYPHS_KEY)
      if (!raw) return { migrated: 0, rejected: 0, alreadyComplete: true }
      const result = validateGlyphCollection(JSON.parse(raw))
      return {
        migrated: result.glyphs.length,
        rejected: result.rejected,
        alreadyComplete: true,
      }
    } catch (error) {
      if (error instanceof StorageUnavailableError) throw error
      if (error instanceof DOMException) {
        throw toStorageError(error, 'reading saved glyphs')
      }
      return { migrated: 0, rejected: 1, alreadyComplete: true }
    }
  }

  async listGlyphs(): Promise<Glyph[]> {
    try {
      const raw = this.requireStorage().getItem(LEGACY_GLYPHS_KEY)
      if (!raw) return []
      return validateGlyphCollection(JSON.parse(raw)).glyphs
    } catch (error) {
      if (error instanceof StorageUnavailableError) throw error
      if (error instanceof DOMException) {
        throw toStorageError(error, 'loading saved glyphs')
      }
      return []
    }
  }

  async replaceGlyphs(glyphs: readonly Glyph[]): Promise<void> {
    const validated = validateGlyphCollection(glyphs)
    if (validated.rejected > 0 || validated.glyphs.length !== glyphs.length) {
      throw new TypeError('Refusing to store an invalid glyph collection.')
    }
    try {
      this.requireStorage().setItem(
        LEGACY_GLYPHS_KEY,
        JSON.stringify(validated.glyphs),
      )
    } catch (error) {
      throw toStorageError(error, 'saving glyphs')
    }
  }

  async saveDraft(draft: StoredDraft): Promise<void> {
    const validated = validateDraft(draft)
    if (validated === null)
      throw new TypeError('Refusing to store an invalid draft.')
    try {
      this.requireStorage().setItem(
        FALLBACK_DRAFT_KEY,
        JSON.stringify(validated),
      )
    } catch (error) {
      throw toStorageError(error, 'saving the current draft')
    }
  }

  async loadDraft(): Promise<StoredDraft | null> {
    try {
      const raw = this.requireStorage().getItem(FALLBACK_DRAFT_KEY)
      if (!raw) return null
      return validateDraft(JSON.parse(raw))
    } catch (error) {
      if (error instanceof StorageUnavailableError) throw error
      if (error instanceof DOMException) {
        throw toStorageError(error, 'loading the current draft')
      }
      return null
    }
  }

  async deleteDraft(): Promise<void> {
    try {
      this.requireStorage().removeItem(FALLBACK_DRAFT_KEY)
    } catch (error) {
      throw toStorageError(error, 'deleting the current draft')
    }
  }
}

export class FallbackGlyphRepository implements GlyphRepository {
  private selected: GlyphRepository | null = null
  private selectionPromise: Promise<GlyphRepository> | null = null
  private migrationResult: MigrationResult | null = null

  constructor(
    private readonly primary: GlyphRepository,
    private readonly fallback: GlyphRepository,
  ) {}

  get persistent(): boolean {
    return this.selected?.persistent ?? this.primary.persistent
  }

  private selectRepository(): Promise<GlyphRepository> {
    if (this.selected) return Promise.resolve(this.selected)
    if (this.selectionPromise) return this.selectionPromise

    const request = this.primary
      .migrateLegacyGlyphs()
      .then((result) => {
        this.selected = this.primary
        this.migrationResult = result
        return this.primary
      })
      .catch(async (primaryError: unknown) => {
        try {
          const result = await this.fallback.migrateLegacyGlyphs()
          this.selected = this.fallback
          this.migrationResult = result
          return this.fallback
        } catch (fallbackError) {
          throw new StorageUnavailableError(
            'Primary and fallback glyph storage are unavailable.',
            {
              cause: new AggregateError(
                [primaryError, fallbackError],
                'Unable to select a glyph storage backend.',
              ),
            },
          )
        }
      })
      .finally(() => {
        if (this.selectionPromise === request) this.selectionPromise = null
      })

    this.selectionPromise = request
    return request
  }

  async migrateLegacyGlyphs(): Promise<MigrationResult> {
    const repository = await this.selectRepository()
    return this.migrationResult ?? repository.migrateLegacyGlyphs()
  }

  async listGlyphs(): Promise<Glyph[]> {
    return (await this.selectRepository()).listGlyphs()
  }

  async replaceGlyphs(glyphs: readonly Glyph[]): Promise<void> {
    return (await this.selectRepository()).replaceGlyphs(glyphs)
  }

  async saveDraft(draft: StoredDraft): Promise<void> {
    return (await this.selectRepository()).saveDraft(draft)
  }

  async loadDraft(): Promise<StoredDraft | null> {
    return (await this.selectRepository()).loadDraft()
  }

  async deleteDraft(): Promise<void> {
    return (await this.selectRepository()).deleteDraft()
  }
}

let repository: GlyphRepository | null = null

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const getGlyphRepository = (): GlyphRepository => {
  if (repository) return repository
  const storage = getLocalStorage()
  const fallback = new LocalStorageGlyphRepository(storage)
  repository =
    typeof indexedDB === 'undefined'
      ? fallback
      : new FallbackGlyphRepository(
          new IndexedDbGlyphRepository(indexedDB, storage),
          fallback,
        )
  return repository
}
