import { tmdbMovieSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

export const getMovieStats = action({
  args: {},
  handler: async context => {
    await requireUser(context)

    const movies: { tmdbId: number }[] = await context.runQuery(api.watch.getWatchedMovies)

    const follows: number[] = await context.runQuery(api.library.listFollowed, { type: 'movie' })

    const cachedMovieInfos = await context.runQuery(api.movieInfo.getMovieInfo, {
      tmdbIds: movies.map(m => m.tmdbId),
    })

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
    const follows: number[] = await context.runQuery(api.library.listFollowed, { type: 'tv' })

    const episodeKeys = episodes.map(ep => ({
      showTmdbId: ep.showTmdbId,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
    }))

    const cachedEpisodeInfos = await context.runQuery(api.episodeInfo.getEpisodeInfo, { episodes: episodeKeys })

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
        console.log(`Processing season batch ${batchIndex + 1}/${seasonBatches.length} (${batch.length} seasons)`)

        const seasonPromises = batch.map(async season => {
          try {
            const seasonDetails = await context.runAction(api.tmdb.getShowSeasonDetails, {
              tmdbId: season.showTmdbId,
              seasonNumber: season.seasonNumber + 1,
            })
            return { season, seasonDetails }
          } catch (error) {
            console.error(
              `Failed to fetch season details for show ${season.showTmdbId} season ${season.seasonNumber + 1}:`,
              error,
            )
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

    const sumOfRuntimes = Array.from(cachedEpisodeRuntimes.values()).reduce((sum, runtime) => sum + runtime, 0)

    return {
      episodesWatchedCount: episodes.length,
      followedShowsCount: follows.length,
      showTimeMinutes: sumOfRuntimes,
    }
  },
})
