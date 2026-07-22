import type { EditorDocumentSnapshot } from '@/types/editor'
import type { Glyph } from '@/types/glyph'
import { normalizeCodePointHex } from '@/utils/charUtils'
import { deepCloneGrid, gridToHex, normalizeHex } from '@/utils/hexUtils'

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

const validateSnapshot = (value: unknown): EditorDocumentSnapshot | null => {
  if (value === null || typeof value !== 'object') return null
  const candidate = value as Partial<EditorDocumentSnapshot>
  const codePoint =
    typeof candidate.codePoint === 'string'
      ? normalizeCodePointHex(candidate.codePoint)
      : null
  if (
    codePoint === null ||
    (candidate.width !== 8 && candidate.width !== 16) ||
    !Array.isArray(candidate.grid)
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
    this.databasePromise ??= new Promise((resolve, reject) => {
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
    return this.databasePromise
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

  async migrateLegacyGlyphs(): Promise<MigrationResult> {
    const raw = this.storage?.getItem(LEGACY_GLYPHS_KEY)
    if (!raw) return { migrated: 0, rejected: 0, alreadyComplete: true }
    try {
      const result = validateGlyphCollection(JSON.parse(raw))
      return {
        migrated: result.glyphs.length,
        rejected: result.rejected,
        alreadyComplete: true,
      }
    } catch {
      return { migrated: 0, rejected: 1, alreadyComplete: true }
    }
  }

  async listGlyphs(): Promise<Glyph[]> {
    const raw = this.storage?.getItem(LEGACY_GLYPHS_KEY)
    if (!raw) return []
    try {
      return validateGlyphCollection(JSON.parse(raw)).glyphs
    } catch {
      return []
    }
  }

  async replaceGlyphs(glyphs: readonly Glyph[]): Promise<void> {
    const validated = validateGlyphCollection(glyphs)
    if (validated.rejected > 0 || validated.glyphs.length !== glyphs.length) {
      throw new TypeError('Refusing to store an invalid glyph collection.')
    }
    try {
      this.storage?.setItem(LEGACY_GLYPHS_KEY, JSON.stringify(validated.glyphs))
    } catch (error) {
      throw toStorageError(error, 'saving glyphs')
    }
  }

  async saveDraft(draft: StoredDraft): Promise<void> {
    const validated = validateDraft(draft)
    if (validated === null)
      throw new TypeError('Refusing to store an invalid draft.')
    try {
      this.storage?.setItem(FALLBACK_DRAFT_KEY, JSON.stringify(validated))
    } catch (error) {
      throw toStorageError(error, 'saving the current draft')
    }
  }

  async loadDraft(): Promise<StoredDraft | null> {
    const raw = this.storage?.getItem(FALLBACK_DRAFT_KEY)
    if (!raw) return null
    try {
      return validateDraft(JSON.parse(raw))
    } catch {
      return null
    }
  }

  async deleteDraft(): Promise<void> {
    this.storage?.removeItem(FALLBACK_DRAFT_KEY)
  }
}

let repository: GlyphRepository | null = null

export const getGlyphRepository = (): GlyphRepository => {
  if (repository) return repository
  const storage = typeof window === 'undefined' ? null : window.localStorage
  repository =
    typeof indexedDB === 'undefined'
      ? new LocalStorageGlyphRepository(storage)
      : new IndexedDbGlyphRepository(indexedDB, storage)
  return repository
}
