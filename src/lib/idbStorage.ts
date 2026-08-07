// Backing store for the react-query persister. localStorage was the obvious choice and the
// wrong one: it is synchronous (so every cache write blocks the main thread while the whole
// cache is re-serialized) and capped around 5 MB, which a handful of cached TMDB season
// payloads exceed. Once the quota is hit the write throws and *nothing* persists any more,
// silently, so every reload replays the full TMDB action cascade. IndexedDB is async and its
// quota is measured in hundreds of MB.
//
// Only the three methods createAsyncStoragePersister needs are implemented, over a single
// object store, so no dependency is added for what amounts to a keyed blob.

const DATABASE_NAME = 'cuenext-query-cache'
const STORE_NAME = 'keyval'

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  // A rejected promise must not be cached, or every later call reuses the same failure.
  databasePromise.catch(() => {
    databasePromise = null
  })

  return databasePromise
}

function run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    database =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const request = operation(transaction.objectStore(STORE_NAME))

        transaction.oncomplete = () => resolve(request.result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      }),
  )
}

// The persister treats a rejection as "no cache", which is the right fallback for every
// failure here (private browsing with IndexedDB blocked, quota exceeded, corrupt database):
// the app works, it just refetches.
export const idbStorage = {
  getItem: (key: string): Promise<string | null> =>
    run<string | undefined>('readonly', store => store.get(key))
      .then(value => value ?? null)
      .catch(() => null),

  setItem: (key: string, value: string): Promise<void> =>
    run('readwrite', store => store.put(value, key))
      .then(() => undefined)
      .catch(() => undefined),

  removeItem: (key: string): Promise<void> =>
    run('readwrite', store => store.delete(key))
      .then(() => undefined)
      .catch(() => undefined),
}
