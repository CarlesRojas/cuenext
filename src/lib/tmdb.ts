import { env } from '#/env'
import { initialSeasonNumbers, remainingSeasonChunks, seasonAppendParam } from '#/lib/showBundleChunks'
import {
  paginated,
  tmdbEpisodeMinimalSchema,
  tmdbMovieExtrasSchema,
  tmdbMovieMinimalSchema,
  tmdbMovieSchema,
  tmdbReviewsResponseSchema,
  tmdbSeasonSchema,
  tmdbTvExtrasSchema,
  tmdbTvMinimalSchema,
  tmdbTvSchema,
} from '#/type/tmdb'
import type { TmdbSeason, TmdbTv } from '#/type/tmdb'
import { z } from 'zod'

// TMDB is read through a cacheable HTTP endpoint on Convex rather than through Convex
// actions. An action is reached over the websocket, so it is billed on every call and pays a
// second billed call to read the server-side cache; an HTTP response the browser is allowed
// to cache costs nothing at all when it is reused.
//
// HTTP actions live on the deployment's `.convex.site` origin, which is the websocket URL
// with its suffix swapped. VITE_CONVEX_SITE_URL overrides it for deployments that do not
// follow that pattern.
const CONVEX_SITE_URL = env.VITE_CONVEX_SITE_URL ?? env.VITE_CONVEX_URL.replace(/\.convex\.cloud$/, '.convex.site')

const TMDB_ENDPOINT = `${CONVEX_SITE_URL}/tmdb`

export type TmdbParams = Record<string, string | number | boolean | undefined>

function buildUrl(path: string, params: TmdbParams): string {
  const url = new URL(TMDB_ENDPOINT)
  url.searchParams.set('path', path)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

// No custom headers, so this stays a "simple" cross-origin GET: no preflight, and the
// browser's HTTP cache serves repeats without asking anyone.
async function fetchTmdbJson(path: string, params: TmdbParams = {}): Promise<any> {
  const response = await fetch(buildUrl(path, params))

  if (!response.ok) throw new Error(`TMDB request failed: ${response.status} ${path}`)

  return await response.json()
}

async function fetchTmdb<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  params: TmdbParams = {},
): Promise<z.infer<T>> {
  return schema.parse(await fetchTmdbJson(path, params))
}

// A key that mirrors the request, so two callers asking for the same thing share one entry.
export function tmdbQueryKey(path: string, params: TmdbParams = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  return ['tmdb', path, Object.fromEntries(entries)] as const
}

/* -------------------------------------------------------------------------- */
/*  Show bundle                                                               */
/* -------------------------------------------------------------------------- */

// TMDB can append other requests to a show request, so the show and its seasons arrive
// together instead of as one call per season. Specials are excluded: nothing in the app
// reads them, and they are often the largest season of all.
//
// How the seasons are split across requests lives in showBundleChunks, shared with the
// Convex side so both build the same request and hit the same cache row.

export interface ShowBundle {
  show: TmdbTv
  seasons: TmdbSeason[]
}

function appendedSeasons(raw: any): TmdbSeason[] {
  const seasons: TmdbSeason[] = []

  for (const [key, value] of Object.entries(raw ?? {})) {
    if (!/^season\/\d+$/.test(key)) continue

    const parsed = tmdbSeasonSchema.safeParse(value)
    if (parsed.success) seasons.push(parsed.data)
  }

  return seasons
}

// The first request asks blindly for the opening seasons - TMDB omits the ones that do not
// exist - so most shows cost exactly one request. Its response carries every season's
// episode count, which is what sizes any further requests.
export async function fetchShowBundle(tmdbId: number): Promise<ShowBundle> {
  const raw = await fetchTmdbJson(`/tv/${tmdbId}`, {
    append_to_response: seasonAppendParam(initialSeasonNumbers()),
  })

  const show = tmdbTvSchema.parse(raw)
  const seasons = appendedSeasons(raw)

  for (const chunk of remainingSeasonChunks(show.seasons)) {
    const extra = await fetchTmdbJson(`/tv/${tmdbId}`, { append_to_response: seasonAppendParam(chunk) })

    seasons.push(...appendedSeasons(extra))
  }

  seasons.sort((a, b) => a.season_number - b.season_number)

  return { show, seasons }
}

/* -------------------------------------------------------------------------- */
/*  Endpoints                                                                 */
/* -------------------------------------------------------------------------- */

export const fetchShowDetails = (tmdbId: number) => fetchTmdb(tmdbTvSchema, `/tv/${tmdbId}`)

export const fetchSeasonDetails = (tmdbId: number, seasonNumber: number) =>
  fetchTmdb(tmdbSeasonSchema, `/tv/${tmdbId}/season/${seasonNumber}`)

// The detail page needs details, credits, videos, reviews, recommendations and watch
// providers at once, and append_to_response returns them in a single request.
export const DETAIL_APPEND = 'credits,videos,reviews,recommendations,watch/providers'

export const fetchShowExtras = (tmdbId: number) =>
  fetchTmdb(tmdbTvExtrasSchema, `/tv/${tmdbId}`, { append_to_response: DETAIL_APPEND })

export const fetchMovieExtras = (tmdbId: number) =>
  fetchTmdb(tmdbMovieExtrasSchema, `/movie/${tmdbId}`, { append_to_response: DETAIL_APPEND })

export const fetchDiscoverMovies = (params: TmdbParams) =>
  fetchTmdb(paginated(tmdbMovieSchema), '/discover/movie', { page: 1, ...params })

export const fetchDiscoverShows = (params: TmdbParams) =>
  fetchTmdb(paginated(tmdbTvSchema), '/discover/tv', { page: 1, ...params })

export const fetchTrendingMovies = (params: TmdbParams & { time_window?: 'day' | 'week' } = {}) => {
  const { time_window = 'week', ...rest } = params

  return fetchTmdb(paginated(tmdbMovieSchema), `/trending/movie/${time_window}`, { page: 1, ...rest })
}

export const fetchTrendingShows = (params: TmdbParams & { time_window?: 'day' | 'week' } = {}) => {
  const { time_window = 'week', ...rest } = params

  return fetchTmdb(paginated(tmdbTvSchema), `/trending/tv/${time_window}`, { page: 1, ...rest })
}

export const fetchSearchMovies = (params: TmdbParams & { query: string }) =>
  fetchTmdb(paginated(tmdbMovieMinimalSchema), '/search/movie', { page: 1, ...params })

export const fetchSearchShows = (params: TmdbParams & { query: string }) =>
  fetchTmdb(paginated(tmdbTvMinimalSchema), '/search/tv', { page: 1, ...params })

export const fetchMovieReviews = (tmdbId: number, page = 1) =>
  fetchTmdb(tmdbReviewsResponseSchema, `/movie/${tmdbId}/reviews`, { page })

export const fetchShowReviews = (tmdbId: number, page = 1) =>
  fetchTmdb(tmdbReviewsResponseSchema, `/tv/${tmdbId}/reviews`, { page })

export async function findMovieByExternalId(externalId: string) {
  const schema = z.object({ movie_results: z.array(tmdbMovieMinimalSchema) })
  const results = await fetchTmdb(schema, `/find/${externalId}`, { external_source: 'imdb_id' })

  return results.movie_results.length > 0 ? results.movie_results[0] : null
}

export async function findShowByExternalId(externalId: number) {
  const schema = z.object({ tv_results: z.array(tmdbTvMinimalSchema) })
  const results = await fetchTmdb(schema, `/find/${externalId}`, { external_source: 'tvdb_id' })

  return results.tv_results.length > 0 ? results.tv_results[0] : null
}

export async function findEpisodeByExternalId(externalId: number) {
  const schema = z.object({ tv_episode_results: z.array(tmdbEpisodeMinimalSchema).optional() })
  const results = await fetchTmdb(schema, `/find/${externalId}`, { external_source: 'tvdb_id' })

  return results.tv_episode_results?.[0] ?? null
}
