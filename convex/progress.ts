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

    return !!existing?.watchedAt
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

    if (existing) {
      await context.db.patch(existing._id, { watchedAt: now })
    } else {
      await context.db.insert('movie', {
        userId,
        tmdbId: args.tmdbId,
        watchedAt: now,
      })
    }
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

    if (existing) {
      await context.db.patch(existing._id, { watchedAt: null })
    }
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
    seasonNumber: v.optional(v.number()),
    episodeNumber: v.optional(v.number()),
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

    if (!existing) {
      await context.db.insert('episode', {
        userId,
        showTmdbId: args.showTmdbId,
        seasonNumber: args.seasonNumber,
        episodeNumber: args.episodeNumber,
        watchedAt: now,
      })
    }

    const nextEp = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .unique()

    if (nextEp) {
      const updates: any = { updatedAt: now, lastWatchedAt: now }
      if (args.seasonNumber !== undefined && args.episodeNumber !== undefined) {
        updates.seasonNumber = args.seasonNumber
        updates.episodeNumber = args.episodeNumber
      }
      await context.db.patch(nextEp._id, updates)
    }
  },
})

export const unmarkEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    seasonNumber: v.optional(v.number()),
    episodeNumber: v.optional(v.number()),
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

    if (existing) {
      await context.db.delete(existing._id)
    }

    const nextEp = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .unique()

    if (nextEp) {
      const updates: any = { updatedAt: Date.now() }
      if (args.seasonNumber !== undefined && args.episodeNumber !== undefined) {
        updates.seasonNumber = args.seasonNumber
        updates.episodeNumber = args.episodeNumber
      }
      await context.db.patch(nextEp._id, updates)
    }
  },
})
