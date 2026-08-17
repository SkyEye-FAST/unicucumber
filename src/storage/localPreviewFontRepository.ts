export interface StoredLocalPreviewFont {
  id: 'current'
  fileName: string
  mimeType: string
  data: ArrayBuffer
  updatedAt: number
}

const DATABASE_NAME = 'unicucumber-local-preview-font'
const DATABASE_VERSION = 1
const STORE_NAME = 'font'
const RECORD_ID = 'current'

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

const requestValue = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const isArrayBuffer = (value: unknown): value is ArrayBuffer => {
  if (value === null || typeof value !== 'object') return false
  const buffer = value as Partial<ArrayBuffer>
  return (
    Object.prototype.toString.call(value) === '[object ArrayBuffer]' &&
    typeof buffer.byteLength === 'number' &&
    buffer.byteLength > 0 &&
    typeof buffer.slice === 'function'
  )
}

const isStoredLocalPreviewFont = (
  value: unknown,
): value is StoredLocalPreviewFont => {
  if (value === null || typeof value !== 'object') return false
  const record = value as Partial<StoredLocalPreviewFont>
  return (
    record.id === RECORD_ID &&
    typeof record.fileName === 'string' &&
    record.fileName.trim().length > 0 &&
    typeof record.mimeType === 'string' &&
    isArrayBuffer(record.data) &&
    typeof record.updatedAt === 'number' &&
    Number.isFinite(record.updatedAt)
  )
}

export class IndexedDbLocalPreviewFontRepository {
  private databasePromise: Promise<IDBDatabase> | null = null

  constructor(private readonly factory: IDBFactory) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION)
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () =>
        reject(new Error('Local preview font storage is blocked.'))
    }).catch((error) => {
      if (this.databasePromise === promise) this.databasePromise = null
      throw error
    })
    this.databasePromise = promise
    return promise
  }

  async load(): Promise<StoredLocalPreviewFont | null> {
    const database = await this.openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const value = await requestValue(
      transaction.objectStore(STORE_NAME).get(RECORD_ID),
    )
    return isStoredLocalPreviewFont(value) ? value : null
  }

  async save(record: StoredLocalPreviewFont): Promise<void> {
    if (!isStoredLocalPreviewFont(record)) {
      throw new TypeError('Refusing to store an invalid local preview font.')
    }
    const database = await this.openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(record)
    await transactionDone(transaction)
  }

  async clear(): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(RECORD_ID)
    await transactionDone(transaction)
  }
}

let repository: IndexedDbLocalPreviewFontRepository | null = null

export const getLocalPreviewFontRepository = () => {
  if (typeof indexedDB === 'undefined') return null
  repository ??= new IndexedDbLocalPreviewFontRepository(indexedDB)
  return repository
}

export const __resetLocalPreviewFontRepositoryForTests = (): void => {
  repository = null
}
