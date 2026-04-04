import { v } from 'convex/values'
import { tmdbTvSchema } from '../src/type/tmdb'
import { mutation, query } from './_generated/server'
import { fetchTmdb } from './lib/tmdbClient'
import { requireUser } from './requireUser'

export const checkMovieWatched = query({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    return !!existing
  },
})

export const markMovieWatched = mutation({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const now = Date.now()

    const existing = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existing) await context.db.insert('movie', { userId, ...args, watchedAt: now })
  },
})

export const unmarkMovieWatched = mutation({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (existing) await context.db.delete(existing._id)
  },
})

export const checkEpisodeWatched = query({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('episode')
      .withIndex('by_user_show_season_episode', q =>
        q
          .eq('userId', userId)
          .eq('showTmdbId', args.showTmdbId)
          .eq('seasonNumber', args.seasonNumber)
          .eq('episodeNumber', args.episodeNumber),
      )
      .unique()

    return !!existing
  },
})

export async function updateNextEpisodeInternal(context: any, args: { showTmdbId: number }) {
  const userId = await requireUser(context)
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const existingNextEpisode = await context.db
    .query('nextEpisode')
    .withIndex('by_user_show', (q: any) => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
    .unique()

  let seasonEpisodeCounts: number[] = existingNextEpisode?.seasonEpisodeCounts ?? []
  let status: 'ended' | 'ongoing' = existingNextEpisode?.status ?? 'ongoing'

  const needsSeasonDataUpdate =
    !existingNextEpisode ||
    !existingNextEpisode.seasonDataUpdatedAt ||
    existingNextEpisode.seasonDataUpdatedAt < oneWeekAgo

  if (needsSeasonDataUpdate) {
    const showDetails = await fetchTmdb(tmdbTvSchema, `/tv/${args.showTmdbId}`)

    seasonEpisodeCounts =
      showDetails.seasons
        ?.filter(season => season.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number)
        .map(season => season.episode_count) || []

    status = showDetails.status?.toLowerCase() === 'ended' ? 'ended' : 'ongoing'
  }

  const watchedEpisodes = await context.db
    .query('episode')
    .withIndex('by_user_show', (q: any) => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
    .collect()

  const totalEpisodes = seasonEpisodeCounts.reduce((sum, count) => sum + count, 0)
  const watchedPercentage = totalEpisodes > 0 ? Math.round((watchedEpisodes.length / totalEpisodes) * 100) : 0

  let nextSeasonNumber = 0
  let nextEpisodeNumber = 0

  const watchedSet = new Set(watchedEpisodes.map((ep: any) => `${ep.seasonNumber}-${ep.episodeNumber}`))
  found: for (let seasonIndex = 0; seasonIndex < seasonEpisodeCounts.length; seasonIndex++) {
    const episodeCount = seasonEpisodeCounts[seasonIndex]

    for (let episodeNumber = 0; episodeNumber < episodeCount; episodeNumber++) {
      if (!watchedSet.has(`${seasonIndex}-${episodeNumber}`)) {
        nextSeasonNumber = seasonIndex
        nextEpisodeNumber = episodeNumber
        break found
      }
    }
  }

  if (totalEpisodes === 0 || watchedEpisodes.length === totalEpisodes) {
    nextSeasonNumber = -1
    nextEpisodeNumber = -1
  }

  const updateData = {
    userId,
    showTmdbId: args.showTmdbId,
    lastWatchedAt: watchedEpisodes.length > 0 ? Math.max(...watchedEpisodes.map((ep: any) => ep.watchedAt)) : null,
    seasonNumber: nextSeasonNumber,
    episodeNumber: nextEpisodeNumber,
    seasonEpisodeCounts,
    seasonDataUpdatedAt: needsSeasonDataUpdate ? now : existingNextEpisode.seasonDataUpdatedAt,
    watchedPercentage,
    status,
  }

  if (!existingNextEpisode) await context.db.insert('nextEpisode', updateData)
  else await context.db.patch(existingNextEpisode._id, updateData)
}

export const markEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const now = Date.now()

    const existing = await context.db
      .query('episode')
      .withIndex('by_user_show_season_episode', q =>
        q
          .eq('userId', userId)
          .eq('showTmdbId', args.showTmdbId)
          .eq('seasonNumber', args.seasonNumber)
          .eq('episodeNumber', args.episodeNumber),
      )
      .unique()

    if (!existing) await context.db.insert('episode', { userId, ...args, watchedAt: now })

    await updateNextEpisodeInternal(context, { showTmdbId: args.showTmdbId })
  },
})

export const unmarkEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('episode')
      .withIndex('by_user_show_season_episode', q =>
        q
          .eq('userId', userId)
          .eq('showTmdbId', args.showTmdbId)
          .eq('seasonNumber', args.seasonNumber)
          .eq('episodeNumber', args.episodeNumber),
      )
      .unique()

    if (!existing) return

    await context.db.delete(existing._id)
    await updateNextEpisodeInternal(context, { showTmdbId: args.showTmdbId })
  },
})
