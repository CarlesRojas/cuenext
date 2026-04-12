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

  const now = Date.now()
  if (now > cached.expiresAt) {
    await context.runMutation(api.tmdbCache.deleteCachedData, { id: cached._id })
    return null
  }

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
  const paramsString = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''
  const cacheKey = `${endpoint}${paramsString}`

  const cachedData = await getCachedTmdbData(context, cacheKey)
  if (cachedData) {
    // console.log(`Cache hit for ${cacheKey}`)
    return schema.parse(cachedData)
  }

  // console.log(`Cache miss ${cacheKey}, call TMDB`)
  const freshData = await fetchTmdb(schema, endpoint, params)

  await setCachedTmdbData(context, cacheKey, freshData, cacheDurationMs)

  return freshData
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

export const cleanupExpiredCache = mutation({
  args: {},
  handler: async context => {
    const now = Date.now()

    const expiredEntries = await context.db
      .query('tmdbCache')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect()

    for (const entry of expiredEntries) await context.db.delete(entry._id)

    return { deletedCount: expiredEntries.length }
  },
})
