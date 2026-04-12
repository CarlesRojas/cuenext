import type { PaginationResult } from 'convex/server'
import { tmdbMovieSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

export const getMovieStats = action({
  args: {},
  handler: async context => {
    await requireUser(context)

    const fetchWatchedMovies = async () => {
      const allMovies: { tmdbId: number }[] = []
      let continueCursor: string | null = null
      let isDone = false

      while (!isDone) {
        const result: PaginationResult<{ tmdbId: number }> = await context.runQuery(api.watch.getWatchedMovies, {
          paginationOpts: { numItems: 1000, cursor: continueCursor },
        })

        continueCursor = result.continueCursor
        isDone = result.isDone

        allMovies.push(...result.page)
      }

      return allMovies
    }

    const fetchFollowedMovies = async () => {
      const allFollows: number[] = []
      let continueCursor: string | null = null
      let isDone = false

      while (!isDone) {
        const result: PaginationResult<number> = await context.runQuery(api.library.listFollowed, {
          type: 'movie',
          paginationOpts: { numItems: 1000, cursor: continueCursor },
        })

        continueCursor = result.continueCursor
        isDone = result.isDone

        allFollows.push(...result.page)
      }

      return allFollows
    }

    const fetchCachedMovieRuntimes = async (tmdbIds: number[]) => {
      const allCachedMovieInfos: any[] = []
      const BATCH_SIZE = 1000

      for (let i = 0; i < tmdbIds.length; i += BATCH_SIZE) {
        const batch = tmdbIds.slice(i, i + BATCH_SIZE)

        const cachedBatch = await context.runQuery(api.movieInfo.getMovieInfo, { tmdbIds: batch })
        allCachedMovieInfos.push(...cachedBatch)
      }

      return allCachedMovieInfos
    }

    const movies: { tmdbId: number }[] = await fetchWatchedMovies()

    const follows: number[] = await fetchFollowedMovies()

    const cachedMovieInfos = await fetchCachedMovieRuntimes(movies.map(m => m.tmdbId))

    const cachedRuntimes: Map<number, number> = new Map(cachedMovieInfos.map(info => [info.tmdbId, info.runtime]))
    const missingMovies = movies.filter(movie => !cachedRuntimes.has(movie.tmdbId))

    let newMovieRuntimes: Array<{ tmdbId: number; runtime: number }> = []

    if (missingMovies.length > 0) {
      // Batch processing to respect TMDB rate limits (40 requests/second)
      // Process 10 requests per batch with 300ms delay = ~33 requests/second
      const BATCH_SIZE = 10
      const BATCH_DELAY_MS = 300
      const batches = []

      for (let i = 0; i < missingMovies.length; i += BATCH_SIZE) {
        batches.push(missingMovies.slice(i, i + BATCH_SIZE))
      }

      const tmdbResults: Array<{ tmdbId: number; runtime: number | null }> = []

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} movies)`)

        const batchPromises = batch.map(async movie => {
          try {
            const movieDetails = await fetchTmdbCached(context, tmdbMovieSchema, `/movie/${movie.tmdbId}`)
            const runtime = movieDetails.runtime || null
            return { tmdbId: movie.tmdbId, runtime }
          } catch (error) {
            console.error('Failed to fetch runtime for movie:', movie.tmdbId, error)
            return { tmdbId: movie.tmdbId, runtime: null }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        tmdbResults.push(...batchResults)

        if (batchIndex < batches.length - 1) await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }

      newMovieRuntimes = tmdbResults.filter(result => result.runtime !== null) as Array<{
        tmdbId: number
        runtime: number
      }>

      if (newMovieRuntimes.length > 0)
        await context.runMutation(api.movieInfo.saveMovieInfo, { movies: newMovieRuntimes })
    }

    newMovieRuntimes.forEach(item => cachedRuntimes.set(item.tmdbId, item.runtime))

    const sumOfRuntimes = Array.from(cachedRuntimes.values()).reduce((sum, runtime) => sum + runtime, 0)

    return {
      moviesWatchedCount: movies.length,
      followedMoviesCount: follows.length,
      movieTimeMinutes: sumOfRuntimes,
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

export const getShowStats = action({
  args: {},
  handler: async context => {
    await requireUser(context)

    const fetchWatchedEpisodes = async () => {
      const allEpisodes: Episode[] = []
      let continueCursor: string | null = null
      let isDone = false

      while (!isDone) {
        const result: PaginationResult<Episode> = await context.runQuery(api.watch.getWatchedEpisodes, {
          paginationOpts: { numItems: 1000, cursor: continueCursor },
        })

        continueCursor = result.continueCursor
        isDone = result.isDone

        allEpisodes.push(...result.page)
      }

      return allEpisodes
    }

    const fetchCachedRuntimes = async (
      episodeKeys: Array<{ showTmdbId: number; seasonNumber: number; episodeNumber: number }>,
    ) => {
      const allCachedEpisodeInfos: any[] = []
      const BATCH_SIZE = 1000

      for (let i = 0; i < episodeKeys.length; i += BATCH_SIZE) {
        const batch = episodeKeys.slice(i, i + BATCH_SIZE)

        const cachedBatch = await context.runQuery(api.episodeInfo.getEpisodeInfo, { episodes: batch })
        allCachedEpisodeInfos.push(...cachedBatch)
      }

      return allCachedEpisodeInfos
    }

    const fetchFollowedShows = async () => {
      const allFollows: number[] = []
      let continueCursor: string | null = null
      let isDone = false

      while (!isDone) {
        const result: PaginationResult<number> = await context.runQuery(api.library.listFollowed, {
          type: 'tv',
          paginationOpts: { numItems: 1000, cursor: continueCursor },
        })

        continueCursor = result.continueCursor
        isDone = result.isDone

        allFollows.push(...result.page)
      }

      return allFollows
    }

    const episodes: Episode[] = await fetchWatchedEpisodes()
    const follows: number[] = await fetchFollowedShows()

    const episodeKeys = episodes.map(ep => ({
      showTmdbId: ep.showTmdbId,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
    }))

    const cachedEpisodeInfos = await fetchCachedRuntimes(episodeKeys)

    const cachedEpisodeRuntimes: Map<string, number> = new Map(
      cachedEpisodeInfos.map(info => [`${info.showTmdbId}-${info.seasonNumber}-${info.episodeNumber}`, info.runtime]),
    )

    const missingEpisodes = episodes.filter(episode => {
      const key = `${episode.showTmdbId}-${episode.seasonNumber}-${episode.episodeNumber}`
      return !cachedEpisodeRuntimes.has(key)
    })

    const uniqueSeasons = new Map<string, { showTmdbId: number; seasonNumber: number }>()
    for (const episode of missingEpisodes) {
      const seasonKey = `${episode.showTmdbId}-${episode.seasonNumber}`
      if (!uniqueSeasons.has(seasonKey)) {
        uniqueSeasons.set(seasonKey, {
          showTmdbId: episode.showTmdbId,
          seasonNumber: episode.seasonNumber,
        })
      }
    }

    if (uniqueSeasons.size > 0) {
      // Batch processing to respect TMDB rate limits (40 requests/second)
      // Process 10 requests per batch with 300ms delay = ~33 requests/second
      const BATCH_SIZE = 10
      const BATCH_DELAY_MS = 300
      const seasonBatches = []

      const seasonsArray = Array.from(uniqueSeasons.values())
      for (let i = 0; i < seasonsArray.length; i += BATCH_SIZE)
        seasonBatches.push(seasonsArray.slice(i, i + BATCH_SIZE))

      for (let batchIndex = 0; batchIndex < seasonBatches.length; batchIndex++) {
        const batch = seasonBatches[batchIndex]

        const seasonPromises = batch.map(async season => {
          try {
            const seasonDetails = await context.runAction(api.tmdb.getShowSeasonDetails, {
              tmdbId: season.showTmdbId,
              seasonNumber: season.seasonNumber + 1,
            })
            return { season, seasonDetails }
          } catch (error) {
            return { season, seasonDetails: null }
          }
        })

        const seasonResults = await Promise.all(seasonPromises)

        seasonResults.forEach(({ season, seasonDetails }) => {
          if (seasonDetails?.episodes) {
            seasonDetails.episodes.forEach(ep => {
              if (ep.runtime && ep.runtime > 0)
                cachedEpisodeRuntimes.set(
                  `${season.showTmdbId}-${season.seasonNumber}-${ep.episode_number}`,
                  ep.runtime,
                )
            })
          }
        })

        if (batchIndex < seasonBatches.length - 1) await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    let showTimeMinutes = 0
    for (const episode of episodes) {
      const key = `${episode.showTmdbId}-${episode.seasonNumber}-${episode.episodeNumber}`
      const runtime = cachedEpisodeRuntimes.get(key) ?? 0
      showTimeMinutes += runtime
    }

    return {
      episodesWatchedCount: episodes.length,
      followedShowsCount: follows.length,
      showTimeMinutes,
    }
  },
})
