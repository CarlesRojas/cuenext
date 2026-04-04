import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
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

    const followEntry = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
      .unique()

    if (followEntry && followEntry.manuallyStopped) await context.db.patch(followEntry._id, { manuallyStopped: false })

    return followEntry && followEntry.manuallyStopped
  },
})

export const unmarkEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    wasManuallyStopped: v.optional(v.boolean()),
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

    if (args.wasManuallyStopped) {
      const followEntry = await context.db
        .query('follow')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
        .unique()

      if (followEntry) await context.db.patch(followEntry._id, { manuallyStopped: true })
    }
  },
})

export const getWatchedShowEpisodes = query({
  args: { showTmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const episodes = await context.db
      .query('episode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .collect()

    return episodes
  },
})

export const getNextEpisode = query({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const nextEpisode = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.tmdbId))
      .unique()

    return nextEpisode
  },
})

export const upsertNextEpisode = mutation({
  args: {
    showTmdbId: v.number(),
    lastWatchedAt: v.union(v.number(), v.null()),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    seasonEpisodeCounts: v.array(v.number()),
    seasonDataUpdatedAt: v.union(v.number(), v.null()),
    watchedPercentage: v.number(),
    status: v.union(v.literal('ended'), v.literal('ongoing')),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .first()

    if (existing) await context.db.patch(existing._id, { ...args })
    else await context.db.insert('nextEpisode', { userId, ...args })
  },
})
