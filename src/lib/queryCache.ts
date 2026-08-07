// Must match the key used by createAsyncStoragePersister in router.tsx, so existing
// persisted caches keep working and can be cleared on sign-out.
export const QUERY_CACHE_STORAGE_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export const LAST_USER_ID_STORAGE_KEY = 'CUENEXT_LAST_USER_ID'

// How long a persisted entry may survive on disk. gcTime below must be at least this long:
// the persister only ever writes queries that are still in the in-memory cache, so a query
// garbage collected between two mounts is dropped from the persisted cache as well, no
// matter how generous maxAge is.
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7 // 7 days

export const QUERY_GC_TIME = QUERY_CACHE_MAX_AGE
