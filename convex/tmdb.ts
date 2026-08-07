import { v } from 'convex/values'
import type { TmdbMovie, TmdbTv } from '../src/type/tmdb'
import { tmdbMovieSchema, tmdbTvSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { fetchTmdbCached } from './tmdbCache'

// Public TMDB reads are served by the cacheable HTTP endpoint in convex/http.ts, which the
// browser can cache. What remains here are the two reads that cannot be: they start from the
// signed-in user's watchlist, so they are per-user and cannot be shared or cached publicly.

export const getUpcomingTv = action({
  args: { page: v.optional(v.number()) },
  handler: async (context, args) => {
    const page = args.page || 1
    const pageSize = 20

    const tvWatchlist: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'tv'
    }> = await context.runQuery(api.upcoming.getUpcomingTvWatchlist, {})

    const tvUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'tv'
      episode: TmdbTv
      airDate: string
    }> = []

    for (const show of tvWatchlist) {
      try {
        const showDetails = await fetchTmdbCached(context, tmdbTvSchema, `/tv/${show.tmdbId}`)

        const nextEpisode = showDetails.next_episode_to_air
        if (!nextEpisode) continue

        const airDateString = nextEpisode.air_date
        if (!airDateString) continue

        const airDate = new Date(airDateString)
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)

        if (airDate < yesterday) continue

        tvUpcoming.push({
          tmdbId: show.tmdbId,
          name: show.name,
          poster: show.poster,
          backdrop: show.backdrop,
          type: 'tv',
          episode: showDetails,
          airDate: airDateString,
        })
      } catch (error) {
        console.error(`Failed to fetch TV details for ${show.tmdbId}:`, error)
      }
    }

    const sortedTv = tvUpcoming.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())

    const offset = (page - 1) * pageSize
    const paginatedResults = sortedTv.slice(offset, offset + pageSize)

    return {
      page,
      results: paginatedResults,
      total_pages: Math.ceil(sortedTv.length / pageSize),
      total_results: sortedTv.length,
    }
  },
})

export const getUpcomingMovies = action({
  args: { page: v.optional(v.number()) },
  handler: async (context, args) => {
    const page = args.page || 1
    const pageSize = 20

    const movieWatchlist: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'movie'
    }> = await context.runQuery(api.upcoming.getUpcomingMoviesWatchlist, {})

    const movieUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'movie'
      movie: TmdbMovie
      airDate: string
    }> = []

    for (const movie of movieWatchlist) {
      try {
        // The runtime row this used to write by hand is now derived by the cache write.
        const movieDetails = await fetchTmdbCached(context, tmdbMovieSchema, `/movie/${movie.tmdbId}`)

        const airDateString = movieDetails.release_date
        if (!airDateString) continue

        const airDate = new Date(airDateString)
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)

        if (airDate < yesterday) continue

        movieUpcoming.push({
          tmdbId: movie.tmdbId,
          name: movie.name,
          poster: movie.poster,
          backdrop: movie.backdrop,
          type: 'movie',
          movie: movieDetails,
          airDate: airDateString,
        })
      } catch (error) {
        console.error(`Failed to fetch movie details for ${movie.tmdbId}:`, error)
      }
    }

    const sortedMovies = movieUpcoming.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())

    const offset = (page - 1) * pageSize
    const paginatedResults = sortedMovies.slice(offset, offset + pageSize)

    return {
      page,
      results: paginatedResults,
      total_pages: Math.ceil(sortedMovies.length / pageSize),
      total_results: sortedMovies.length,
    }
  },
})
