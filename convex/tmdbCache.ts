import { v } from 'convex/values'
import type { z } from 'zod'
import { api } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { fetchTmdb } from './lib/tmdbClient'

export const CACHE_DURATIONS = {
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  MIDNIGHT: 'MIDNIGHT' as const, // Special value that expires at start of next day
} as const

export function getTimeUntilNextDay(): number {
  const now = new Date()
  const nextDay = new Date(now)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0) // Set to start of day (midnight)
  return nextDay.getTime() - now.getTime()
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
  endpoint: string,
  data: any,
  customDuration?: number | typeof CACHE_DURATIONS.MIDNIGHT,
): Promise<void> {
  const now = Date.now()
  let duration: number

  if (customDuration === CACHE_DURATIONS.MIDNIGHT) duration = getTimeUntilNextDay()
  else duration = customDuration ?? getTimeUntilNextDay()

  const expiresAt = now + duration

  await context.runMutation(api.tmdbCache.setCachedData, {
    endpoint,
    data,
    createdAt: now,
    expiresAt,
  })
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

// Reports whether the data came from the cache so callers that persist derived rows
// (episode/movie runtimes) can skip the write on a hit: those rows were already saved
// when the response first entered the cache.
export async function fetchTmdbCachedWithMeta<T extends z.ZodTypeAny>(
  context: ActionCtx,
  schema: T,
  endpoint: string,
  params: Record<string, string> = {},
  cacheDurationMs?: number | typeof CACHE_DURATIONS.MIDNIGHT,
): Promise<{ data: z.infer<T>; fromCache: boolean }> {
  const paramsString = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''
  const cacheKey = `${endpoint}${paramsString}`

  const cachedData = await getCachedTmdbData(context, cacheKey)
  if (cachedData) return { data: schema.parse(cachedData), fromCache: true }

  const freshData = await fetchTmdb(schema, endpoint, params)

  await setCachedTmdbData(context, cacheKey, freshData, cacheDurationMs)

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

export const setCachedData = mutation({
  args: {
    endpoint: v.string(),
    data: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (context, args) => {
    const existing = await context.db
      .query('tmdbCache')
      .withIndex('by_endpoint', q => q.eq('endpoint', args.endpoint))
      .unique()

    if (existing)
      await context.db.patch(existing._id, { data: args.data, createdAt: args.createdAt, expiresAt: args.expiresAt })
    else await context.db.insert('tmdbCache', args)
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
