import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { recomputeNextEpisodeInDb } from './lib/nextEpisodeCompute'
import { applyStatsDelta, getEpisodeRuntime, getMovieRuntime } from './lib/statsDelta'
import { markEpisodeWatchedForUser, markMovieWatchedForUser } from './lib/watchWrite'
import { requireUser } from './requireUser'

export const getWatchedMovies = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    return await context.db
      .query('movie')
      .withIndex('by_user', q => q.eq('userId', userId))
      .paginate(args.paginationOpts)
  },
})

// TODO optimistic update
export const markMovieWatched = mutation({
  args: {
    tmdbId: v.number(),
    name: v.string(),
    poster: v.union(v.string(), v.null()),
    backdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
    watchedAt: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    return await markMovieWatchedForUser(context, userId, args)
  },
})

// TODO optimistic update
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

    const runtime = await getMovieRuntime(context, args.tmdbId)
    await applyStatsDelta(context, userId, { moviesWatchedCount: -1, movieTimeMinutes: -runtime })

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
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    return await context.db
      .query('episode')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('asc')
      .paginate(args.paginationOpts)
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

// TODO optimistic update
export const markEpisodeWatched = mutation({
  args: {
    showTmdbId: v.number(),
    seasonNumber: v.number(),
    episodeNumber: v.number(),
    showName: v.string(),
    showPoster: v.union(v.string(), v.null()),
    showBackdrop: v.union(v.string(), v.null()),
    releaseDate: v.number(),
    watchedAt: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    return await markEpisodeWatchedForUser(context, userId, args)
  },
})

// TODO optimistic update
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

    if (!existing) return { nextEpisodeRecomputed: true }

    await context.db.delete(existing._id)

    const runtime = await getEpisodeRuntime(context, args.showTmdbId, args.seasonNumber, args.episodeNumber)
    await applyStatsDelta(context, userId, { episodesWatchedCount: -1, showTimeMinutes: -runtime })

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

    const nextEpisodeRecomputed = await recomputeNextEpisodeInDb(context, userId, args.showTmdbId)

    return { nextEpisodeRecomputed }
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

// TODO optimistic update
export const markMultipleEpisodesAsWatched = mutation({
  args: {
    showTmdbId: v.number(),
    episodes: v.array(
      v.object({
        seasonNumber: v.number(),
        episodeNumber: v.number(),
        watchedAt: v.optional(v.number()),
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

    let insertedCount = 0
    let insertedMinutes = 0

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

      if (!existing) {
        await context.db.insert('episode', {
          userId,
          showTmdbId: args.showTmdbId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          watchedAt: episode.watchedAt ?? now,
        })

        insertedCount++
        insertedMinutes += await getEpisodeRuntime(
          context,
          args.showTmdbId,
          episode.seasonNumber,
          episode.episodeNumber,
        )
      }
    }

    if (insertedCount > 0)
      await applyStatsDelta(context, userId, { episodesWatchedCount: insertedCount, showTimeMinutes: insertedMinutes })

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
        followedAt: args.episodes[0]?.watchedAt ?? now,
        releaseDate: args.releaseDate,
      })

    const nextEpisodeRecomputed = await recomputeNextEpisodeInDb(context, userId, args.showTmdbId)

    return { wasStopped, wasNotFollowed, nextEpisodeRecomputed }
  },
})

// TODO optimistic update
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

    let deletedCount = 0
    let deletedMinutes = 0

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

      if (existing) {
        await context.db.delete(existing._id)

        deletedCount++
        deletedMinutes += await getEpisodeRuntime(context, args.showTmdbId, episode.seasonNumber, episode.episodeNumber)
      }
    }

    if (deletedCount > 0)
      await applyStatsDelta(context, userId, { episodesWatchedCount: -deletedCount, showTimeMinutes: -deletedMinutes })

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

    const nextEpisodeRecomputed = await recomputeNextEpisodeInDb(context, userId, args.showTmdbId)

    return { nextEpisodeRecomputed }
  },
})
