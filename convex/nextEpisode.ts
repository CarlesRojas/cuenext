import { v } from 'convex/values'
import type { TmdbEpisode } from '../src/type/tmdb'
import { tmdbTvSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { fetchTmdbCached } from './tmdbCache'

const airedEpisodes = (episode: TmdbEpisode) => {
  if (!episode.air_date) return false
  const airDate = new Date(episode.air_date)
  const today = new Date()

  return airDate <= today
}

export const updateNextEpisode = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    const existingNextEpisode = await context.runQuery(api.watch.getNextEpisode, { tmdbId: args.tmdbId })

    let seasonEpisodeCounts: number[] = existingNextEpisode?.seasonEpisodeCounts ?? []
    let seasonFirstEpisodeIndex: number[] = existingNextEpisode?.seasonFirstEpisodeIndex ?? []
    let status: string = existingNextEpisode?.status ?? 'ongoing'
    let numberOfSeasons = existingNextEpisode?.numberOfSeasons ?? 0

    const needsSeasonDataUpdate =
      !existingNextEpisode ||
      !existingNextEpisode.seasonDataUpdatedAt ||
      existingNextEpisode.seasonDataUpdatedAt < oneWeekAgo

    if (needsSeasonDataUpdate) {
      const showDetails = await fetchTmdbCached(context, tmdbTvSchema, `/tv/${args.tmdbId}`)
      const nonSpecialSeasons = showDetails.seasons?.filter(season => season.season_number > 0) || []

      const seasonDetailsPromises = nonSpecialSeasons.map(season =>
        context.runAction(api.tmdb.getShowSeasonDetails, {
          tmdbId: args.tmdbId,
          seasonNumber: season.season_number,
        }),
      )

      const allSeasonDetails = await Promise.all(seasonDetailsPromises)

      seasonEpisodeCounts = allSeasonDetails.map(
        seasonDetails => seasonDetails.episodes?.filter(airedEpisodes).length || 0,
      )

      seasonFirstEpisodeIndex = allSeasonDetails.map(seasonDetails =>
        seasonDetails.episodes && seasonDetails.episodes.length > 0 ? seasonDetails.episodes[0].episode_number - 1 : 0,
      )

      console.log(showDetails.status)
      status = showDetails.status?.toLowerCase() || 'ongoing'

      numberOfSeasons = nonSpecialSeasons.length
    }

    const watchedEpisodes = await context.runQuery(api.watch.getWatchedShowEpisodes, { showTmdbId: args.tmdbId })
    const watchedEpisodesWithoutSpecials = watchedEpisodes.filter(ep => ep.seasonNumber >= 0)

    const totalEpisodes = seasonEpisodeCounts.reduce((sum, count) => sum + count, 0)
    const watchedPercentage =
      totalEpisodes > 0 ? Math.round((watchedEpisodesWithoutSpecials.length / totalEpisodes) * 100) : 0

    let nextSeasonNumber = -1
    let nextEpisodeNumber = -1

    const watchedSet = new Set(watchedEpisodesWithoutSpecials.map(ep => `${ep.seasonNumber}-${ep.episodeNumber}`))
    found: for (let seasonIndex = 0; seasonIndex < seasonEpisodeCounts.length; seasonIndex++) {
      const episodeCount = seasonEpisodeCounts[seasonIndex]

      for (let episodeNumber = 0; episodeNumber < episodeCount; episodeNumber++) {
        const displacement = seasonFirstEpisodeIndex[seasonIndex] || 0
        if (!watchedSet.has(`${seasonIndex}-${episodeNumber + displacement}`)) {
          nextSeasonNumber = seasonIndex
          nextEpisodeNumber = episodeNumber + displacement
          break found
        }
      }
    }

    const updateData: {
      showTmdbId: number
      lastWatchedAt: number | null
      seasonNumber: number
      episodeNumber: number
      seasonEpisodeCounts: number[]
      seasonFirstEpisodeIndex: number[]
      seasonDataUpdatedAt: number | null
      watchedPercentage: number
      numberOfSeasons: number
      status: string
    } = {
      showTmdbId: args.tmdbId,
      lastWatchedAt:
        watchedEpisodesWithoutSpecials.length > 0
          ? Math.max(...watchedEpisodesWithoutSpecials.map(ep => ep.watchedAt))
          : null,
      seasonNumber: nextSeasonNumber,
      episodeNumber: nextEpisodeNumber,
      seasonEpisodeCounts,
      seasonFirstEpisodeIndex,
      seasonDataUpdatedAt: needsSeasonDataUpdate ? now : existingNextEpisode.seasonDataUpdatedAt,
      watchedPercentage,
      numberOfSeasons,
      status,
    }

    await context.runMutation(api.watch.upsertNextEpisode, updateData)

    return updateData
  },
})
