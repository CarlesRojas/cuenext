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
