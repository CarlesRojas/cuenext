import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalAction, internalMutation, internalQuery } from './_generated/server'
import type { NextEpisodeState } from './lib/nextEpisodeCompute'
import { computeNextEpisode, recomputeNextEpisodeInDb } from './lib/nextEpisodeCompute'
import type { ShowSeasonsLayout } from './lib/showSeasonsShared'
import {
  isLayoutUsable,
  isShowSeasonsFresh,
  readShowSeasons,
  shortestShowSeasonsTtl,
  writeShowSeasons,
} from './lib/showSeasonsShared'
import { fetchShowSeasonsLayout } from './lib/tmdbShowBundle'
import { requireUser } from './requireUser'

const layoutValidator = v.object({
  seasonEpisodeCounts: v.array(v.number()),
  seasonFirstEpisodeIndex: v.array(v.number()),
  numberOfSeasons: v.number(),
  status: v.string(),
  nextEpisodeAirDate: v.union(v.number(), v.null()),
})

// Writes the caller's row from whatever layout is already known - their own copy or, far
// more often, the shared one. This is the whole job in the common case, so the action above
// pays one mutation instead of a query to read the current row plus a mutation to write it.
export const applyNextEpisode = internalMutation({
  args: { showTmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    return await recomputeNextEpisodeInDb(context, userId, args.showTmdbId)
  },
})

// The slow path's landing point: store the freshly fetched layout where everyone can use it,
// then write the caller's row from it, in one transaction.
export const saveLayoutAndApply = internalMutation({
  args: { showTmdbId: v.number(), layout: layoutValidator },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    await writeShowSeasons(context, args.showTmdbId, args.layout)

    return await recomputeNextEpisodeInDb(context, userId, args.showTmdbId, { trustEmptyLayout: true })
  },
})

export const updateNextEpisode = action({
  args: { tmdbId: v.number(), forceFetch: v.optional(v.boolean()) },
  handler: async (context, args): Promise<NextEpisodeState | null> => {
    if (!args.forceFetch) {
      const applied = await context.runMutation(internal.nextEpisode.applyNextEpisode, { showTmdbId: args.tmdbId })
      if (applied.recomputed) return applied.nextEpisode
    }

    const layout: ShowSeasonsLayout = await fetchShowSeasonsLayout(context, args.tmdbId)

    const applied = await context.runMutation(internal.nextEpisode.saveLayoutAndApply, {
      showTmdbId: args.tmdbId,
      layout,
    })

    return applied.nextEpisode
  },
})

/* -------------------------------------------------------------------------- */
/*  Shared refresh                                                            */
/* -------------------------------------------------------------------------- */

// How many shows one pass of the refresh handles before rescheduling itself, so a single
// action never runs long enough to hit the time limit.
const REFRESH_BATCH_SIZE = 20

// Rows examined in one pass. A show that finished airing keeps its layout for a month, so
// the oldest-first scan walks past plenty of rows that are old but not stale; this bounds
// how far it looks before handing the rest to the next pass.
const REFRESH_SCAN_LIMIT = 500

export const listShowsNeedingRefresh = internalQuery({
  args: { limit: v.number() },
  handler: async (context, args) => {
    const now = Date.now()
    const stale: number[] = []

    // Nothing updated within the shortest TTL can be stale, so the index range excludes it
    // and the scan starts at the oldest row.
    const candidates = context.db
      .query('showSeasons')
      .withIndex('by_updatedAt', q => q.lt('updatedAt', now - shortestShowSeasonsTtl()))

    let scanned = 0

    for await (const row of candidates) {
      scanned++
      // A finished show inside the range can still be fresh, so this skips rather than
      // stops: the rows behind it are older, not newer.
      if (!isShowSeasonsFresh(row, now)) stale.push(row.tmdbId)

      if (stale.length >= args.limit || scanned >= REFRESH_SCAN_LIMIT) break
    }

    return stale
  },
})

// Applies a refreshed layout to everyone tracking the show. Recomputing here rather than
// waiting for each user's next visit is the point of the cron: a show that gained an
// episode overnight is already correct when they open the app.
export const saveLayoutAndRecomputeAll = internalMutation({
  args: { showTmdbId: v.number(), layout: layoutValidator },
  handler: async (context, args) => {
    await writeShowSeasons(context, args.showTmdbId, args.layout)

    const rows = await context.db
      .query('nextEpisode')
      .withIndex('by_show', q => q.eq('showTmdbId', args.showTmdbId))
      .collect()

    const now = Date.now()

    for (const row of rows) {
      const watchedEpisodes = await context.db
        .query('episode')
        .withIndex('by_user_show', q => q.eq('userId', row.userId).eq('showTmdbId', args.showTmdbId))
        .collect()

      const computed = computeNextEpisode(
        watchedEpisodes,
        args.layout.seasonEpisodeCounts,
        args.layout.seasonFirstEpisodeIndex,
      )

      await context.db.patch(row._id, {
        seasonEpisodeCounts: args.layout.seasonEpisodeCounts,
        seasonFirstEpisodeIndex: args.layout.seasonFirstEpisodeIndex,
        numberOfSeasons: args.layout.numberOfSeasons,
        status: args.layout.status,
        seasonDataUpdatedAt: now,
        ...computed,
      })
    }

    return rows.length
  },
})

// Replaces the hourly per-device sweep that force-fetched every show a user was waiting on.
// That cost the full TMDB fan-out per show, per device, per hour; this pays for each show
// once for everybody.
export const refreshStaleShowSeasons = internalAction({
  args: {},
  handler: async (context): Promise<{ refreshed: number }> => {
    const stale: number[] = await context.runQuery(internal.nextEpisode.listShowsNeedingRefresh, {
      limit: REFRESH_BATCH_SIZE,
    })

    for (const tmdbId of stale) {
      try {
        const layout = await fetchShowSeasonsLayout(context, tmdbId)
        await context.runMutation(internal.nextEpisode.saveLayoutAndRecomputeAll, { showTmdbId: tmdbId, layout })
      } catch (error) {
        console.error(`Failed to refresh season layout for ${tmdbId}:`, error)
        // Touch the row so a show that keeps failing does not block the queue forever.
        await context.runMutation(internal.nextEpisode.touchShowSeasons, { tmdbId })
      }
    }

    if (stale.length >= REFRESH_BATCH_SIZE)
      await context.scheduler.runAfter(0, internal.nextEpisode.refreshStaleShowSeasons, {})

    return { refreshed: stale.length }
  },
})

export const touchShowSeasons = internalMutation({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const existing = await readShowSeasons(context, args.tmdbId)
    if (existing) await context.db.patch(existing._id, { updatedAt: Date.now() })
  },
})

/* -------------------------------------------------------------------------- */
/*  On-demand refresh                                                         */
/* -------------------------------------------------------------------------- */

export const listStaleWaitingShows = internalQuery({
  args: {},
  handler: async context => {
    const now = Date.now()
    // ctx.runQuery from an action carries the caller's identity, so this resolves the user
    // itself rather than costing a separate call to look it up.
    const userId = await requireUser(context)

    const rows = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId))
      .collect()

    const stale: number[] = []

    for (const row of rows) {
      // Only shows the user has caught up on can gain something by refreshing.
      const isWaiting = row.seasonNumber === -1 && row.episodeNumber === -1
      if (!isWaiting) continue

      const shared = await readShowSeasons(context, row.showTmdbId)
      if (isShowSeasonsFresh(shared, now) && isLayoutUsable(shared)) continue

      stale.push(row.showTmdbId)
    }

    return stale
  },
})

// Called when the app opens, at most once an hour. It used to force-fetch every show the
// user was waiting on; now it only touches the ones the shared refresh has not already
// covered, which is usually none, so the whole check costs two function calls.
export const refreshWaitingShows = action({
  args: {},
  handler: async (context): Promise<{ refreshed: number }> => {
    const stale: number[] = await context.runQuery(internal.nextEpisode.listStaleWaitingShows, {})

    for (const tmdbId of stale.slice(0, REFRESH_BATCH_SIZE)) {
      try {
        const layout = await fetchShowSeasonsLayout(context, tmdbId)
        await context.runMutation(internal.nextEpisode.saveLayoutAndRecomputeAll, { showTmdbId: tmdbId, layout })
      } catch (error) {
        console.error(`Failed to refresh season layout for ${tmdbId}:`, error)
      }
    }

    return { refreshed: Math.min(stale.length, REFRESH_BATCH_SIZE) }
  },
})
