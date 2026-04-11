import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

export const getWatchedMovies = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const movies = await context.db
      .query('movie')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return movies
  },
})

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
  args: {
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
    watchedAt: v.optional(v.number()),
  },
  handler: async (context, { name, poster, backdrop, watchedAt, ...args }) => {
    const userId = await requireUser(context)
    const watchTimestamp = watchedAt ?? Date.now()

    const existing = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existing) await context.db.insert('movie', { userId, tmdbId: args.tmdbId, watchedAt: watchTimestamp })

    const followEntry = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'movie').eq('tmdbId', args.tmdbId))
      .unique()

    const wasNotFollowed = !followEntry

    if (wasNotFollowed)
      await context.db.insert('follow', {
        userId,
        type: 'movie' as const,
        tmdbId: args.tmdbId,
        name,
        poster,
        backdrop,
        followedAt: watchTimestamp,
        releaseDate: args.releaseDate,
      })

    return { wasNotFollowed }
  },
})

export const unmarkMovieWatched = mutation({
  args: {
    tmdbId: v.number(),
    wasNotFollowed: v.optional(v.boolean()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existing) return

    await context.db.delete(existing._id)

    if (args.wasNotFollowed) {
      const followEntry = await context.db
        .query('follow')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'movie').eq('tmdbId', args.tmdbId))
        .unique()

      if (followEntry) await context.db.delete(followEntry._id)
    }
  },
})

export const getWatchedEpisodes = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const episodes = await context.db
      .query('episode')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return episodes
  },
})

export const getWatchedEpisodesForShow = query({
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
    showName: v.string(),
    showPoster: v.union(v.string(), v.null()),
    showBackdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
  },
  handler: async (context, { showName, showPoster, showBackdrop, ...args }) => {
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

    if (!existing)
      await context.db.insert('episode', {
        userId,
        watchedAt: now,
        showTmdbId: args.showTmdbId,
        seasonNumber: args.seasonNumber,
        episodeNumber: args.episodeNumber,
      })

    const stoppedEntry = await context.db
      .query('stopped')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.showTmdbId))
      .unique()

    const wasStopped = !!stoppedEntry

    if (stoppedEntry) await context.db.delete(stoppedEntry._id)

    const followEntry = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
      .unique()

    const wasNotFollowed = !followEntry

    if (wasNotFollowed)
      await context.db.insert('follow', {
        userId,
        type: 'tv' as const,
        tmdbId: args.showTmdbId,
        name: showName,
        poster: showPoster,
        backdrop: showBackdrop,
        followedAt: now,
        releaseDate: args.releaseDate,
      })

    return { wasStopped, wasNotFollowed }
  },
})

export const unmarkEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    wasStopped: v.optional(v.boolean()),
    wasNotFollowed: v.optional(v.boolean()),
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

    if (args.wasStopped) {
      const stoppedEntry = await context.db
        .query('stopped')
        .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.showTmdbId))
        .unique()

      if (!stoppedEntry) await context.db.insert('stopped', { userId, tmdbId: args.showTmdbId, stoppedAt: Date.now() })
    }

    if (args.wasNotFollowed) {
      const followEntry = await context.db
        .query('follow')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
        .unique()

      if (followEntry) await context.db.delete(followEntry._id)
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
    seasonFirstEpisodeIndex: v.array(v.number()),
    seasonDataUpdatedAt: v.union(v.number(), v.null()),
    watchedPercentage: v.number(),
    numberOfSeasons: v.number(),
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

export const markMultipleEpisodesAsWatched = mutation({
  args: {
    showTmdbId: v.number(),
    episodes: v.array(
      v.object({
        seasonNumber: v.number(),
        episodeNumber: v.number(),
      }),
    ),
    showName: v.string(),
    showPoster: v.union(v.string(), v.null()),
    showBackdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
  },
  handler: async (context, { showName, showPoster, showBackdrop, ...args }) => {
    const userId = await requireUser(context)
    const now = Date.now()

    for (const episode of args.episodes) {
      const existing = await context.db
        .query('episode')
        .withIndex('by_user_show_season_episode', q =>
          q
            .eq('userId', userId)
            .eq('showTmdbId', args.showTmdbId)
            .eq('seasonNumber', episode.seasonNumber)
            .eq('episodeNumber', episode.episodeNumber),
        )
        .unique()

      if (!existing)
        await context.db.insert('episode', {
          userId,
          showTmdbId: args.showTmdbId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          watchedAt: now,
        })
    }

    const stoppedEntry = await context.db
      .query('stopped')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.showTmdbId))
      .unique()

    const wasStopped = !!stoppedEntry

    if (stoppedEntry) await context.db.delete(stoppedEntry._id)

    const followEntry = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
      .unique()

    const wasNotFollowed = !followEntry

    if (wasNotFollowed)
      await context.db.insert('follow', {
        userId,
        type: 'tv' as const,
        tmdbId: args.showTmdbId,
        name: showName,
        poster: showPoster,
        backdrop: showBackdrop,
        followedAt: now,
        releaseDate: args.releaseDate,
      })

    return { wasStopped, wasNotFollowed }
  },
})

export const unmarkMultipleEpisodesAsWatched = mutation({
  args: {
    showTmdbId: v.number(),
    episodes: v.array(
      v.object({
        seasonNumber: v.number(),
        episodeNumber: v.number(),
      }),
    ),
    wasStopped: v.optional(v.boolean()),
    wasNotFollowed: v.optional(v.boolean()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    for (const episode of args.episodes) {
      const existing = await context.db
        .query('episode')
        .withIndex('by_user_show_season_episode', q =>
          q
            .eq('userId', userId)
            .eq('showTmdbId', args.showTmdbId)
            .eq('seasonNumber', episode.seasonNumber)
            .eq('episodeNumber', episode.episodeNumber),
        )
        .unique()

      if (existing) await context.db.delete(existing._id)
    }

    if (args.wasStopped) {
      const stoppedEntry = await context.db
        .query('stopped')
        .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.showTmdbId))
        .unique()

      if (!stoppedEntry) await context.db.insert('stopped', { userId, tmdbId: args.showTmdbId, stoppedAt: Date.now() })
    }

    if (args.wasNotFollowed) {
      const followEntry = await context.db
        .query('follow')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
        .unique()

      if (followEntry) await context.db.delete(followEntry._id)
    }
  },
})
