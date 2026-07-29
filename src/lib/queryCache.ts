// Must match the key used by createAsyncStoragePersister in router.tsx (its default key),
// so existing persisted caches keep working and can be cleared on sign-out.
export const QUERY_CACHE_STORAGE_KEY = 'REACT_QUERY_OFFLINE_CACHE'

export const LAST_USER_ID_STORAGE_KEY = 'CUENEXT_LAST_USER_ID'
