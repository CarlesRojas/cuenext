import { tmdbMovieSchema, tmdbSeasonSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

export const getMovieStats = action({
  args: {},
  handler: async context => {
    await requireUser(context)

    const movies: { tmdbId: number }[] = await context.runQuery(api.watch.getWatchedMovies)
    const moviesWatchedCount = movies.length

    const follows: number[] = await context.runQuery(api.library.listFollowed, { type: 'movie' })
    const followedMoviesCount = follows.length

    const movieRuntimePromises = movies.map(async movie => {
      try {
        const movieDetails = await fetchTmdbCached(context, tmdbMovieSchema, `/movie/${movie.tmdbId}`)
        return movieDetails.runtime || 0
      } catch (error) {
        console.error('Failed to fetch movie runtime for tmdbId:', movie.tmdbId, error)
        return 0
      }
    })

    const movieRuntimes = await Promise.all(movieRuntimePromises)
    const movieTimeMinutes = movieRuntimes.reduce((sum: number, runtime: number) => sum + runtime, 0)

    return {
      moviesWatchedCount,
      followedMoviesCount,
      movieTimeMinutes,
    }
  },
})

interface Episode {
  _id: string
  showTmdbId: number
  seasonNumber: number
  episodeNumber: number
  watchedAt: number
}

interface EpisodeBatch {
  episodes: Episode[]
  nextCursor: string | null
  hasMore: boolean
}

export const getShowStats = action({
  args: {},
  handler: async context => {
    await requireUser(context)

    const fetchAllEpisodes = async () => {
      const allEpisodes: Episode[] = []
      let cursor: string | null = null
      let hasMore = true

      while (hasMore) {
        const batch: EpisodeBatch = await context.runQuery(api.watch.getWatchedEpisodes, {
          cursor: cursor || undefined,
        })

        if (batch.episodes.length === 0) break

        allEpisodes.push(...batch.episodes)
        cursor = batch.nextCursor
        hasMore = batch.hasMore
      }

      return allEpisodes
    }

    const episodes: Episode[] = await fetchAllEpisodes()
    const episodesWatchedCount: number = episodes.length

    const follows: number[] = await context.runQuery(api.library.listFollowed, { type: 'tv' })
    const followedShowsCount = follows.length

    const uniqueSeasons = new Map<string, { showTmdbId: number; seasonNumber: number }>()

    for (const episode of episodes) {
      const seasonKey = `${episode.showTmdbId}-${episode.seasonNumber}`

      if (!uniqueSeasons.has(seasonKey))
        uniqueSeasons.set(seasonKey, { showTmdbId: episode.showTmdbId, seasonNumber: episode.seasonNumber })
    }

    const seasonDetailsPromises = Array.from(uniqueSeasons.values()).map(async season => {
      try {
        const seasonDetails = await fetchTmdbCached(
          context,
          tmdbSeasonSchema,
          `/tv/${season.showTmdbId}/season/${season.seasonNumber + 1}`,
        )
        return { season, seasonDetails }
      } catch (error) {
        console.error(
          `Failed to fetch season details for show ${season.showTmdbId} season ${season.seasonNumber + 1}:`,
          error,
        )
        return { season, seasonDetails: null }
      }
    })

    const seasonDataList = await Promise.all(seasonDetailsPromises)

    let showTimeMinutes = 0

    for (const episode of episodes) {
      const seasonKey = `${episode.showTmdbId}-${episode.seasonNumber}`
      const seasonData = seasonDataList.find(
        data => `${data.season.showTmdbId}-${data.season.seasonNumber}` === seasonKey,
      )

      const episodeDetails = seasonData?.seasonDetails?.episodes?.find(
        ep => ep.episode_number === episode.episodeNumber,
      )

      showTimeMinutes += episodeDetails?.runtime ?? 30
    }

    return {
      episodesWatchedCount,
      followedShowsCount,
      showTimeMinutes,
    }
  },
})
