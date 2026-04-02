import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './auth.config'

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

export const toggleEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    nextSeasonNumber: v.optional(v.number()),
    nextEpisodeNumber: v.optional(v.number()),
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

    let wasWatched = false
    if (existing) {
      await context.db.delete(existing._id)
    } else {
      await context.db.insert('episode', {
        userId,
        showTmdbId: args.showTmdbId,
        seasonNumber: args.seasonNumber,
        episodeNumber: args.episodeNumber,
        watchedAt: now,
      })
      wasWatched = true
    }

    const nextEp = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .unique()

    if (nextEp) {
      const updates: any = { updatedAt: now }
      if (wasWatched) {
        updates.lastWatchedAt = now
      }
      if (args.nextSeasonNumber !== undefined && args.nextEpisodeNumber !== undefined) {
        updates.nextSeasonNumber = args.nextSeasonNumber
        updates.nextEpisodeNumber = args.nextEpisodeNumber
      }
      await context.db.patch(nextEp._id, updates)
    }
  },
})

export const markPreviousEpisodesWatched = mutation({
  args: {
    showTmdbId: v.number(),
    episodes: v.array(
      v.object({
        seasonNumber: v.number(),
        episodeNumber: v.number(),
      }),
    ),
    nextSeasonNumber: v.optional(v.number()),
    nextEpisodeNumber: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const now = Date.now()

    for (const ep of args.episodes) {
      const existing = await context.db
        .query('episode')
        .withIndex('by_user_show_season_episode', q =>
          q
            .eq('userId', userId)
            .eq('showTmdbId', args.showTmdbId)
            .eq('seasonNumber', ep.seasonNumber)
            .eq('episodeNumber', ep.episodeNumber),
        )
        .unique()

      if (!existing) {
        await context.db.insert('episode', {
          userId,
          showTmdbId: args.showTmdbId,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          watchedAt: now,
        })
      }
    }

    if (args.nextSeasonNumber !== undefined && args.nextEpisodeNumber !== undefined) {
      const nextEp = await context.db
        .query('nextEpisode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
        .unique()

      if (nextEp) {
        await context.db.patch(nextEp._id, {
          lastWatchedAt: now,
          nextSeasonNumber: args.nextSeasonNumber,
          nextEpisodeNumber: args.nextEpisodeNumber,
          updatedAt: now,
        })
      }
    }
  },
})

export const markNextEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    nextSeasonNumber: v.number(),
    nextEpisodeNumber: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)
    const now = Date.now()

    const nextEp = await context.db
      .query('nextEpisode')
      .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', args.showTmdbId))
      .unique()

    if (!nextEp) return

    const existing = await context.db
      .query('episode')
      .withIndex('by_user_show_season_episode', q =>
        q
          .eq('userId', userId)
          .eq('showTmdbId', args.showTmdbId)
          .eq('seasonNumber', nextEp.nextSeasonNumber)
          .eq('episodeNumber', nextEp.nextEpisodeNumber),
      )
      .unique()

    if (!existing) {
      await context.db.insert('episode', {
        userId,
        showTmdbId: args.showTmdbId,
        seasonNumber: nextEp.nextSeasonNumber,
        episodeNumber: nextEp.nextEpisodeNumber,
        watchedAt: now,
      })
    }

    await context.db.patch(nextEp._id, {
      lastWatchedAt: now,
      nextSeasonNumber: args.nextSeasonNumber,
      nextEpisodeNumber: args.nextEpisodeNumber,
      updatedAt: now,
    })
  },
})
