import { v } from 'convex/values'
import { tmdbMovieSchema, tmdbSeasonSchema } from '../src/type/tmdb'
import { getAllPages } from '../src/utils/getAllPages'
import { processBatched } from '../src/utils/processBatched'
import { api, internal } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { action, internalMutation, query } from './_generated/server'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

export interface UserStatsData {
  episodesWatchedCount: number
  showTimeMinutes: number
  moviesWatchedCount: number
  movieTimeMinutes: number
  recomputedAt: number
}

// Serves the profile page from the materialized userStats row (one point read) plus live
// follow counts, instead of rescanning every watched row on each visit. Returns null when
// the row hasn't been computed yet - the client then triggers recomputeStats once.
export const getStats = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const stats = await context.db
      .query('userStats')
      .withIndex('by_user', q => q.eq('userId', userId))
      .unique()

    if (!stats) return null

    const tvFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
      .collect()

    const movieFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
      .collect()

    // Rating stats are read live rather than materialized: a user's own reviews are bounded
    // by how many titles they have rated, which is far smaller than their watch history.
    const reviews = await context.db
      .query('review')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const ratingStats = (type: 'movie' | 'tv') => {
      const ofType = reviews.filter(review => review.type === type)
      const rated = ofType.filter(review => review.rating !== null)
      const ratingSum = rated.reduce((sum, review) => sum + (review.rating ?? 0), 0)

      return {
        ratedCount: rated.length,
        averageRating: rated.length > 0 ? ratingSum / rated.length : null,
        // Upvotes an author gave their own reviews are not applause, so they do not count.
        upvotesReceived: ofType.reduce((sum, review) => sum + Math.max(0, review.upvoteCount - 1), 0),
      }
    }

    const showRatings = ratingStats('tv')
    const movieRatings = ratingStats('movie')

    return {
      showStats: {
        episodesWatchedCount: stats.episodesWatchedCount,
        showTimeMinutes: stats.showTimeMinutes,
        followedShowsCount: tvFollows.length,
        ratedShowsCount: showRatings.ratedCount,
        averageShowRating: showRatings.averageRating,
        showUpvotesReceived: showRatings.upvotesReceived,
      },
      movieStats: {
        moviesWatchedCount: stats.moviesWatchedCount,
        movieTimeMinutes: stats.movieTimeMinutes,
        followedMoviesCount: movieFollows.length,
        ratedMoviesCount: movieRatings.ratedCount,
        averageMovieRating: movieRatings.averageRating,
        movieUpvotesReceived: movieRatings.upvotesReceived,
      },
      recomputedAt: stats.recomputedAt,
    }
  },
})

export const saveStats = internalMutation({
  args: {
    episodesWatchedCount: v.number(),
    showTimeMinutes: v.number(),
    moviesWatchedCount: v.number(),
    movieTimeMinutes: v.number(),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existing = await context.db
      .query('userStats')
      .withIndex('by_user', q => q.eq('userId', userId))
      .unique()

    const data = { ...args, recomputedAt: Date.now() }

    if (existing) await context.db.patch(existing._id, data)
    else await context.db.insert('userStats', { userId, ...data })
  },
})

async function computeMovieStats(context: ActionCtx) {
  const movies: { tmdbId: number }[] = await getAllPages(args => context.runQuery(api.watch.getWatchedMovies, args), {})

  const cachedRuntimes: Map<number, number> = new Map()
  const BATCH_SIZE = 1000

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE).map(m => m.tmdbId)
    const cachedBatch = await context.runQuery(api.movieInfo.getMovieInfo, { tmdbIds: batch })
    for (const info of cachedBatch) cachedRuntimes.set(info.tmdbId, info.runtime)
  }

  const missingMovies = movies.filter(movie => !cachedRuntimes.has(movie.tmdbId))

  if (missingMovies.length > 0) {
    const tmdbResults = await processBatched(missingMovies, async movie => {
      try {
        const movieDetails = await fetchTmdbCached(context, tmdbMovieSchema, `/movie/${movie.tmdbId}`)
        return { tmdbId: movie.tmdbId, runtime: movieDetails.runtime || null }
      } catch (error) {
        console.error('Failed to fetch runtime for movie:', movie.tmdbId, error)
        return { tmdbId: movie.tmdbId, runtime: null }
      }
    })

    // The runtime rows these imply are written by the cache write itself, so there is no
    // saveMovieInfo call to make here.
    const newMovieRuntimes = tmdbResults.filter((r): r is { tmdbId: number; runtime: number } => r.runtime !== null)

    newMovieRuntimes.forEach(item => cachedRuntimes.set(item.tmdbId, item.runtime))
  }

  const movieTimeMinutes = Array.from(cachedRuntimes.values()).reduce((sum, runtime) => sum + runtime, 0)

  return { moviesWatchedCount: movies.length, movieTimeMinutes }
}

interface WatchedEpisode {
  showTmdbId: number
  seasonNumber: number
  episodeNumber: number
}

async function computeShowStats(context: ActionCtx) {
  const episodes: WatchedEpisode[] = await getAllPages(args => context.runQuery(api.watch.getWatchedEpisodes, args), {})

  const episodeKey = (ep: WatchedEpisode) => `${ep.showTmdbId}-${ep.seasonNumber}-${ep.episodeNumber}`

  const cachedRuntimes: Map<string, number> = new Map()
  const BATCH_SIZE = 1000

  for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
    const batch = episodes.slice(i, i + BATCH_SIZE).map(ep => ({
      showTmdbId: ep.showTmdbId,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
    }))

    const cachedBatch = await context.runQuery(api.episodeInfo.getEpisodeInfo, { episodes: batch })
    for (const info of cachedBatch) cachedRuntimes.set(episodeKey(info), info.runtime)
  }

  const missingEpisodes = episodes.filter(episode => !cachedRuntimes.has(episodeKey(episode)))

  const uniqueSeasons = new Map<string, { showTmdbId: number; seasonNumber: number }>()
  for (const episode of missingEpisodes) {
    const seasonKey = `${episode.showTmdbId}-${episode.seasonNumber}`
    if (!uniqueSeasons.has(seasonKey))
      uniqueSeasons.set(seasonKey, { showTmdbId: episode.showTmdbId, seasonNumber: episode.seasonNumber })
  }

  if (uniqueSeasons.size > 0) {
    const seasonResults = await processBatched(Array.from(uniqueSeasons.values()), async season => {
      try {
        // Read straight from the cache helper rather than through the season action: a
        // nested action is a billed call of its own for a fetch this can do itself.
        const seasonDetails = await fetchTmdbCached(
          context,
          tmdbSeasonSchema,
          `/tv/${season.showTmdbId}/season/${season.seasonNumber + 1}`,
        )
        return { season, seasonDetails }
      } catch {
        return { season, seasonDetails: null }
      }
    })

    seasonResults.forEach(({ season, seasonDetails }) => {
      seasonDetails?.episodes?.forEach(ep => {
        // Stored episode numbers are zero-based; TMDB's episode_number is one-based.
        if (ep.runtime && ep.runtime > 0)
          cachedRuntimes.set(`${season.showTmdbId}-${season.seasonNumber}-${ep.episode_number - 1}`, ep.runtime)
      })
    })
  }

  let showTimeMinutes = 0
  for (const episode of episodes) showTimeMinutes += cachedRuntimes.get(episodeKey(episode)) ?? 0

  return { episodesWatchedCount: episodes.length, showTimeMinutes }
}

// Full rebuild of the materialized stats row. Runs once to establish the baseline (the
// incremental deltas in the watch mutations keep it current afterwards) and again when the
// client sees a stale recomputedAt, which self-heals any drift.
export const recomputeStats = action({
  args: {},
  handler: async (context): Promise<UserStatsData> => {
    await requireUser(context)

    const [showStats, movieStats] = await Promise.all([computeShowStats(context), computeMovieStats(context)])

    const data = { ...showStats, ...movieStats }

    await context.runMutation(internal.stats.saveStats, data)

    return { ...data, recomputedAt: Date.now() }
  },
})
