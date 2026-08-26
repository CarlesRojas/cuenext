import { v } from 'convex/values'
import type { TmdbEpisode } from '../src/type/tmdb'
import { tmdbTvSchema } from '../src/type/tmdb'
import { api, internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { action, internalMutation, internalQuery } from './_generated/server'
import { computeNextEpisode } from './lib/nextEpisodeCompute'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

// Explicit so the action's return type doesn't circularly depend on the generated api types.
export interface NextEpisodeData {
  showTmdbId: number
  seasonEpisodeCounts: number[]
  seasonFirstEpisodeIndex: number[]
  seasonDataUpdatedAt: number | null
  numberOfSeasons: number
  status: string
  lastWatchedAt: number | null
  seasonNumber: number
  episodeNumber: number
  watchedPercentage: number
}

const airedEpisodes = (episode: TmdbEpisode) => {
  if (!episode.air_date) return false
  const airDate = new Date(episode.air_date)
  const today = new Date()

  return airDate <= today
}

// Reads the watched episodes and writes the recomputed row in one transaction, so the
// action above it only pays one internal call instead of a read query plus a write
// mutation. Takes the userId explicitly (instead of requireUser) so the widget's
// token-authenticated HTTP path can share it with the Clerk-authenticated action.
export const applyNextEpisode = internalMutation({
  args: {
    userId: v.string(),
    showTmdbId: v.number(),
    seasonEpisodeCounts: v.array(v.number()),
    seasonFirstEpisodeIndex: v.array(v.number()),
    seasonDataUpdatedAt: v.union(v.number(), v.null()),
    numberOfSeasons: v.number(),
    status: v.string(),
  },
  handler: async (context, { userId, ...args }): Promise<NextEpisodeData> => {
    const watchedEpisodes = await context.db
      .query('episode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .collect()

    const computed = computeNextEpisode(watchedEpisodes, args.seasonEpisodeCounts, args.seasonFirstEpisodeIndex)

    const updateData = { ...args, ...computed }

    const existing = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .first()

    if (existing) await context.db.patch(existing._id, updateData)
    else await context.db.insert('nextEpisode', { userId, ...updateData })

    return updateData
  },
})

// The row read the shared updater needs, keyed by an explicit userId. getNextEpisode
// stays as the auth-scoped public query for clients.
export const getNextEpisodeRow = internalQuery({
  args: { userId: v.string(), tmdbId: v.number() },
  handler: async (context, args) => {
    return await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', args.userId).eq('showTmdbId', args.tmdbId))
      .unique()
  },
})

// Shared by the public action below and the widget HTTP endpoint, which resolves its user
// from a widget token instead of the request's Clerk identity.
export async function updateNextEpisodeForUser(
  context: ActionCtx,
  userId: string,
  args: { tmdbId: number; forceFetch?: boolean },
): Promise<NextEpisodeData> {
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const existingNextEpisode = await context.runQuery(internal.nextEpisode.getNextEpisodeRow, {
    userId,
    tmdbId: args.tmdbId,
  })

  let seasonEpisodeCounts: number[] = existingNextEpisode?.seasonEpisodeCounts ?? []
  let seasonFirstEpisodeIndex: number[] = existingNextEpisode?.seasonFirstEpisodeIndex ?? []
  let status: string = existingNextEpisode?.status ?? 'ongoing'
  let numberOfSeasons = existingNextEpisode?.numberOfSeasons ?? 0

  const needsSeasonDataUpdate =
    !existingNextEpisode ||
    !existingNextEpisode.seasonDataUpdatedAt ||
    existingNextEpisode.seasonDataUpdatedAt < oneWeekAgo ||
    !!args.forceFetch

  if (needsSeasonDataUpdate) {
    const showDetails = await fetchTmdbCached(context, tmdbTvSchema, `/tv/${args.tmdbId}`)
    const nonSpecialSeasons = showDetails.seasons?.filter(season => season.season_number > 0) || []

    const seasonDetailsPromises = nonSpecialSeasons.map(season =>
      context.runAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: args.tmdbId,
        seasonNumber: season.season_number,
      }),
    )

    const allSeasonDetails = await Promise.all(seasonDetailsPromises)

    seasonEpisodeCounts = allSeasonDetails.map(
      seasonDetails => seasonDetails.episodes?.filter(airedEpisodes).length || 0,
    )

    seasonFirstEpisodeIndex = allSeasonDetails.map(seasonDetails =>
      seasonDetails.episodes && seasonDetails.episodes.length > 0 ? seasonDetails.episodes[0].episode_number - 1 : 0,
    )

    status = showDetails.status?.toLowerCase() || 'ongoing'

    numberOfSeasons = nonSpecialSeasons.length
  }

  return await context.runMutation(internal.nextEpisode.applyNextEpisode, {
    userId,
    showTmdbId: args.tmdbId,
    seasonEpisodeCounts,
    seasonFirstEpisodeIndex,
    seasonDataUpdatedAt: needsSeasonDataUpdate ? now : existingNextEpisode.seasonDataUpdatedAt,
    numberOfSeasons,
    status,
  })
}

export const updateNextEpisode = action({
  args: { tmdbId: v.number(), forceFetch: v.optional(v.boolean()) },
  handler: async (context, args): Promise<NextEpisodeData> => {
    const userId = await requireUser(context)

    return await updateNextEpisodeForUser(context, userId, args)
  },
})
