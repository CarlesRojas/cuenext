import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { insertReview } from './lib/reviewWrite'
import { requireIdentity, requireUser } from './requireUser'

const mediaType = v.union(v.literal('movie'), v.literal('tv'))

// Serves the export flow: follows, favorites and stopped rows are bounded by how many
// titles a user tracks, so one collect per table is fine. Watched movies and episodes can
// be much larger, so the client pages them through watch.getWatchedMovies and
// watch.getWatchedEpisodes instead. Derived tables (nextEpisode, userStats) and the TMDB
// account link are intentionally excluded: they are rebuilt on the importing account.
export const getExportSnapshot = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const follows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId))
      .collect()

    const favorites = await context.db
      .query('favorite')
      .withIndex('by_user_type', q => q.eq('userId', userId))
      .collect()

    const stopped = await context.db
      .query('stopped')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    // Ratings and written reviews are the user's own words, so they travel with the rest of
    // the account. Upvotes received are not exported: they belong to the readers who cast
    // them, and an imported review starts fresh with only its author's own upvote.
    const reviews = await context.db
      .query('review')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return {
      follows: follows.map(({ type, tmdbId, name, poster, backdrop, releaseDate, followedAt }) => ({
        type,
        tmdbId,
        name,
        poster,
        backdrop,
        releaseDate,
        followedAt,
      })),
      favorites: favorites.map(({ type, tmdbId, favoritedAt }) => ({ type, tmdbId, favoritedAt })),
      stopped: stopped.map(({ tmdbId, stoppedAt }) => ({ tmdbId, stoppedAt })),
      reviews: reviews.map(({ type, tmdbId, rating, content, createdAt, updatedAt }) => ({
        type,
        tmdbId,
        rating,
        content,
        createdAt,
        updatedAt,
      })),
    }
  },
})

// Upserts one batch of exported rows into the current user's account. Rows whose unique
// key already exists are skipped, so re-importing the same file is idempotent and importing
// into a non-empty account merges instead of duplicating. Stats deltas and nextEpisode
// recomputes are intentionally skipped here - after all batches the client runs
// nextEpisode.updateNextEpisode per imported show and stats.recomputeStats once, which is
// far cheaper than doing either per row.
export const importChunk = mutation({
  args: {
    follows: v.optional(
      v.array(
        v.object({
          type: mediaType,
          tmdbId: v.number(),
          name: v.string(),
          poster: v.union(v.string(), v.null()),
          backdrop: v.union(v.string(), v.null()),
          releaseDate: v.number(),
          followedAt: v.number(),
        }),
      ),
    ),
    favorites: v.optional(v.array(v.object({ type: mediaType, tmdbId: v.number(), favoritedAt: v.number() }))),
    stopped: v.optional(v.array(v.object({ tmdbId: v.number(), stoppedAt: v.number() }))),
    watchedMovies: v.optional(v.array(v.object({ tmdbId: v.number(), watchedAt: v.number() }))),
    watchedEpisodes: v.optional(
      v.array(
        v.object({
          showTmdbId: v.number(),
          seasonNumber: v.number(),
          episodeNumber: v.number(),
          watchedAt: v.number(),
        }),
      ),
    ),
    reviews: v.optional(
      v.array(
        v.object({
          type: mediaType,
          tmdbId: v.number(),
          rating: v.union(v.number(), v.null()),
          content: v.string(),
          createdAt: v.number(),
          updatedAt: v.number(),
        }),
      ),
    ),
  },
  handler: async (context, args) => {
    const identity = args.reviews?.length ? await requireIdentity(context) : null
    const userId = identity?.userId ?? (await requireUser(context))

    let imported = 0
    let skipped = 0

    for (const row of args.follows ?? []) {
      const existing = await context.db
        .query('follow')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', row.type).eq('tmdbId', row.tmdbId))
        .unique()

      if (existing) skipped++
      else {
        await context.db.insert('follow', { userId, ...row })
        imported++
      }
    }

    for (const row of args.favorites ?? []) {
      const existing = await context.db
        .query('favorite')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', row.type).eq('tmdbId', row.tmdbId))
        .unique()

      if (existing) skipped++
      else {
        await context.db.insert('favorite', { userId, ...row })
        imported++
      }
    }

    for (const row of args.stopped ?? []) {
      const existing = await context.db
        .query('stopped')
        .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', row.tmdbId))
        .unique()

      if (existing) skipped++
      else {
        await context.db.insert('stopped', { userId, ...row })
        imported++
      }
    }

    for (const row of args.watchedMovies ?? []) {
      const existing = await context.db
        .query('movie')
        .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', row.tmdbId))
        .unique()

      if (existing) skipped++
      else {
        await context.db.insert('movie', { userId, ...row })
        imported++
      }
    }

    for (const row of args.watchedEpisodes ?? []) {
      const existing = await context.db
        .query('episode')
        .withIndex('by_user_show_season_episode', q =>
          q
            .eq('userId', userId)
            .eq('showTmdbId', row.showTmdbId)
            .eq('seasonNumber', row.seasonNumber)
            .eq('episodeNumber', row.episodeNumber),
        )
        .unique()

      if (existing) skipped++
      else {
        await context.db.insert('episode', { userId, ...row })
        imported++
      }
    }

    // A title already rated on this account keeps its own rating: the import merges, it
    // never overwrites what the user wrote here.
    for (const row of args.reviews ?? []) {
      const existing = await context.db
        .query('review')
        .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', row.type).eq('tmdbId', row.tmdbId))
        .unique()

      if (existing || (row.rating === null && row.content === '')) skipped++
      else {
        await insertReview(context, {
          userId,
          authorName: identity?.authorName ?? 'CueNext user',
          authorImage: identity?.authorImage ?? null,
          ...row,
        })
        imported++
      }
    }

    return { imported, skipped }
  },
})
