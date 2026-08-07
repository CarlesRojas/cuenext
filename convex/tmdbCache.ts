import { v } from 'convex/values'
import type { z } from 'zod'
import { api } from './_generated/api'
import type { ActionCtx, MutationCtx } from './_generated/server'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { CACHE_DURATIONS, getTimeUntilNextDay, resolveCacheDuration } from './lib/tmdbCacheTtl'
import type { DerivedRuntimes } from './lib/tmdbDerived'
import { deriveRuntimes } from './lib/tmdbDerived'
import { tmdbQueryString } from '../src/lib/tmdbUrl'
import { fetchTmdb } from './lib/tmdbClient'

export { CACHE_DURATIONS, getTimeUntilNextDay }

// The key mirrors the request URL, so the action helper and the HTTP proxy cache the same
// response under the same row rather than one each. Parameters are sorted for that reason
// too: the caller's key order must not matter.
export function cacheKeyFor(path: string, params: Record<string, string> = {}): string {
  const queryString = tmdbQueryString(params)

  return `${path}${queryString ? `?${queryString}` : ''}`
}

async function getCachedTmdbData(context: ActionCtx, endpoint: string): Promise<any | null> {
  const cached = await context.runQuery(api.tmdbCache.getCachedData, { endpoint })
  if (!cached) return null

  // Expired rows are not deleted here: the setCachedData upsert that follows a miss
  // overwrites them in place, and the cleanup cron removes the ones never fetched again.
  const now = Date.now()
  if (now > cached.expiresAt) return null

  return cached.data
}

async function setCachedTmdbData(
  context: ActionCtx,
  path: string,
  endpoint: string,
  data: any,
  customDuration?: number | typeof CACHE_DURATIONS.MIDNIGHT,
): Promise<void> {
  const now = Date.now()
  const expiresAt = now + resolveCacheDuration(path, data, customDuration, now)

  await context.runMutation(api.tmdbCache.setCachedData, { path, endpoint, data, createdAt: now, expiresAt })
}

export async function fetchTmdbCached<T extends z.ZodTypeAny>(
  context: ActionCtx,
  schema: T,
  endpoint: string,
  params: Record<string, string> = {},
  cacheDurationMs?: number | typeof CACHE_DURATIONS.MIDNIGHT,
): Promise<z.infer<T>> {
  const { data } = await fetchTmdbCachedWithMeta(context, schema, endpoint, params, cacheDurationMs)
  return data
}

// Reports whether the data came from the cache. The derived runtime rows are now written by
// setCachedData itself, so callers no longer need this to decide whether to persist them;
// it is kept for callers that want to know whether they paid for a TMDB round trip.
export async function fetchTmdbCachedWithMeta<T extends z.ZodTypeAny>(
  context: ActionCtx,
  schema: T,
  endpoint: string,
  params: Record<string, string> = {},
  cacheDurationMs?: number | typeof CACHE_DURATIONS.MIDNIGHT,
): Promise<{ data: z.infer<T>; fromCache: boolean }> {
  const cacheKey = cacheKeyFor(endpoint, params)

  const cachedData = await getCachedTmdbData(context, cacheKey)
  if (cachedData) return { data: schema.parse(cachedData), fromCache: true }

  const freshData = await fetchTmdb(schema, endpoint, params)

  await setCachedTmdbData(context, endpoint, cacheKey, freshData, cacheDurationMs)

  return { data: freshData, fromCache: false }
}

export const getCachedData = query({
  args: { endpoint: v.string() },
  handler: async (context, { endpoint }) => {
    return await context.db
      .query('tmdbCache')
      .withIndex('by_endpoint', q => q.eq('endpoint', endpoint))
      .unique()
  },
})

// Same read for the HTTP proxy, which is not a public entry point of its own.
export const readCache = internalQuery({
  args: { endpoint: v.string() },
  handler: async (context, { endpoint }) => {
    return await context.db
      .query('tmdbCache')
      .withIndex('by_endpoint', q => q.eq('endpoint', endpoint))
      .unique()
  },
})

// The runtime rows a cached payload implies, written in the same transaction as the cache
// row so a miss costs one mutation instead of one per derived table.
async function writeDerivedRuntimes(context: MutationCtx, { episodes, movies }: DerivedRuntimes) {
  for (const episode of episodes) {
    const existing = await context.db
      .query('episodeInfo')
      .withIndex('by_showTmdbId_season_episode', q =>
        q
          .eq('showTmdbId', episode.showTmdbId)
          .eq('seasonNumber', episode.seasonNumber)
          .eq('episodeNumber', episode.episodeNumber),
      )
      .unique()

    if (!existing) await context.db.insert('episodeInfo', { ...episode, updatedAt: Date.now() })
  }

  for (const movie of movies) {
    const existing = await context.db
      .query('movieInfo')
      .withIndex('by_tmdbId', q => q.eq('tmdbId', movie.tmdbId))
      .unique()

    if (!existing) await context.db.insert('movieInfo', { ...movie, updatedAt: Date.now() })
  }
}

async function upsertCache(
  context: MutationCtx,
  args: { path?: string; endpoint: string; data: any; createdAt: number; expiresAt: number },
) {
  const existing = await context.db
    .query('tmdbCache')
    .withIndex('by_endpoint', q => q.eq('endpoint', args.endpoint))
    .unique()

  const row = { endpoint: args.endpoint, data: args.data, createdAt: args.createdAt, expiresAt: args.expiresAt }

  if (existing) await context.db.patch(existing._id, row)
  else await context.db.insert('tmdbCache', row)

  // `path` is the endpoint without its query string; fall back to the key for callers that
  // predate it (a rescheduled call queued by the previous version).
  await writeDerivedRuntimes(context, deriveRuntimes(args.path ?? args.endpoint.split('?')[0], args.data))
}

export const setCachedData = mutation({
  args: {
    path: v.optional(v.string()),
    endpoint: v.string(),
    data: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (context, args) => {
    await upsertCache(context, args)
  },
})

export const writeCache = internalMutation({
  args: {
    path: v.string(),
    endpoint: v.string(),
    data: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (context, args) => {
    await upsertCache(context, args)
  },
})

export const deleteCachedData = mutation({
  args: { id: v.id('tmdbCache') },
  handler: async (context, { id }) => {
    await context.db.delete(id)
  },
})

// Each tmdbCache row stores an arbitrary `data` payload (whole TMDB responses), and a
// single Convex transaction fails once it reads more than 16 MiB, so one cleanup
// transaction cannot delete unboundedly many rows. Instead of a fixed 10-row batch
// (which chained ~90 rescheduled mutations a day), stream the expired rows lazily and
// stop when the accumulated payload size approaches the limit: the budget check runs
// after each row, so with Convex's 1 MiB document cap the worst case is
// budget + 1 MiB, well below 16 MiB. The delete count stays under Convex's 8192
// writes-per-transaction limit.
const CLEANUP_READ_BUDGET_BYTES = 8 * 1024 * 1024
const CLEANUP_MAX_DELETES = 4000

export const cleanupExpiredCache = mutation({
  // batchSize is unused but kept so reschedules queued by the previous version still parse.
  args: { batchSize: v.optional(v.number()) },
  handler: async context => {
    const now = Date.now()

    let deletedCount = 0
    let approximateBytesRead = 0
    let hasMore = false

    const expiredEntries = context.db.query('tmdbCache').withIndex('by_expiresAt', q => q.lt('expiresAt', now))

    for await (const entry of expiredEntries) {
      await context.db.delete(entry._id)
      deletedCount++
      approximateBytesRead += JSON.stringify(entry.data).length

      if (deletedCount >= CLEANUP_MAX_DELETES || approximateBytesRead >= CLEANUP_READ_BUDGET_BYTES) {
        hasMore = true
        break
      }
    }

    if (hasMore) {
      await context.scheduler.runAfter(0, api.tmdbCache.cleanupExpiredCache, {})
    }

    return { deletedCount }
  },
})
