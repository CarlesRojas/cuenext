export const TMDB_STALE_TIME = {
  SIX_HOURS: 6 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
} as const

// The query client's global refetchOnMount 'always' exists for user-data queries, but for
// TMDB-backed actions it re-runs the whole action + server-cache-read chain on every mount
// for data that is already cached server-side with TTLs of a day or more. Spread this after
// convexAction(...) so mounts respect staleness instead. Pick a staleTime no longer than the
// endpoint's server-side cache duration to keep the data as fresh as the server would serve.
export function tmdbStale(staleTime: number = TMDB_STALE_TIME.ONE_DAY) {
  return { staleTime, refetchOnMount: true as const }
}
