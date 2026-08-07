import type { TmdbParams } from '#/lib/tmdb'
import {
  fetchDiscoverMovies,
  fetchDiscoverShows,
  fetchSearchMovies,
  fetchSearchShows,
  fetchTrendingMovies,
  fetchTrendingShows,
  tmdbQueryKey,
} from '#/lib/tmdb'

export const TMDB_STALE_TIME = {
  SIX_HOURS: 6 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

// TMDB reads are immutable for hours at a time and are served over HTTP with a matching
// Cache-Control, so a remount should use what is already in the cache rather than re-ask.
// Keep the staleTime no longer than the endpoint's server-side cache duration, so the data
// stays as fresh as the server would serve it.
export function tmdbStale(staleTime: number = TMDB_STALE_TIME.ONE_DAY) {
  return { staleTime, refetchOnMount: true as const }
}

// Query options for a TMDB read. The key mirrors the request, so every component asking for
// the same thing shares one entry instead of issuing its own fetch.
export function tmdbQuery<T>(
  path: string,
  params: TmdbParams,
  queryFn: () => Promise<T>,
  staleTime: number = TMDB_STALE_TIME.ONE_DAY,
) {
  return { queryKey: tmdbQueryKey(path, params), queryFn, ...tmdbStale(staleTime) }
}

/* -------------------------------------------------------------------------- */
/*  Browse lists                                                              */
/* -------------------------------------------------------------------------- */

// Parameters are TMDB's own names now (`vote_count.gte` rather than `vote_count_gte`): the
// Convex actions that used to translate between the two are gone, since these are plain
// cacheable requests.

export function discoverShowsQuery(params: TmdbParams) {
  return tmdbQuery('/discover/tv', params, () => fetchDiscoverShows(params), TMDB_STALE_TIME.SIX_HOURS)
}

export function discoverMoviesQuery(params: TmdbParams) {
  return tmdbQuery('/discover/movie', params, () => fetchDiscoverMovies(params), TMDB_STALE_TIME.SIX_HOURS)
}

export function trendingShowsQuery(params: TmdbParams & { time_window?: 'day' | 'week' } = {}) {
  const { time_window = 'week', ...rest } = params

  return tmdbQuery(`/trending/tv/${time_window}`, rest, () => fetchTrendingShows(params), TMDB_STALE_TIME.SIX_HOURS)
}

export function trendingMoviesQuery(params: TmdbParams & { time_window?: 'day' | 'week' } = {}) {
  const { time_window = 'week', ...rest } = params

  return tmdbQuery(`/trending/movie/${time_window}`, rest, () => fetchTrendingMovies(params), TMDB_STALE_TIME.SIX_HOURS)
}

export function searchShowsQuery(params: TmdbParams & { query: string }) {
  return tmdbQuery('/search/tv', params, () => fetchSearchShows(params), TMDB_STALE_TIME.SIX_HOURS)
}

export function searchMoviesQuery(params: TmdbParams & { query: string }) {
  return tmdbQuery('/search/movie', params, () => fetchSearchMovies(params), TMDB_STALE_TIME.SIX_HOURS)
}
