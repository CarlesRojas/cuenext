import { v } from 'convex/values'
import { tmdbTvSchema } from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { fetchTmdbCached } from './tmdbCache'

export const updateNextEpisode = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    const existingNextEpisode = await context.runQuery(api.watch.getNextEpisode, { tmdbId: args.tmdbId })

    let seasonEpisodeCounts: number[] = existingNextEpisode?.seasonEpisodeCounts ?? []
    let status: 'ended' | 'ongoing' = existingNextEpisode?.status ?? 'ongoing'

    const needsSeasonDataUpdate =
      !existingNextEpisode ||
      !existingNextEpisode.seasonDataUpdatedAt ||
      existingNextEpisode.seasonDataUpdatedAt < oneWeekAgo

    if (needsSeasonDataUpdate) {
      const showDetails = await fetchTmdbCached(context, tmdbTvSchema, `/tv/${args.tmdbId}`)

      seasonEpisodeCounts =
        showDetails.seasons
          ?.filter(season => season.season_number > 0)
          .sort((a, b) => a.season_number - b.season_number)
          .map(season => season.episode_count) || []

      status = showDetails.status?.toLowerCase() === 'ended' ? 'ended' : 'ongoing'
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
        if (!watchedSet.has(`${seasonIndex}-${episodeNumber}`)) {
          nextSeasonNumber = seasonIndex
          nextEpisodeNumber = episodeNumber
          break found
        }
      }
    }

    const updateData = {
      showTmdbId: args.tmdbId,
      lastWatchedAt:
        watchedEpisodesWithoutSpecials.length > 0
          ? Math.max(...watchedEpisodesWithoutSpecials.map(ep => ep.watchedAt))
          : null,
      seasonNumber: nextSeasonNumber,
      episodeNumber: nextEpisodeNumber,
      seasonEpisodeCounts,
      seasonDataUpdatedAt: needsSeasonDataUpdate ? now : existingNextEpisode.seasonDataUpdatedAt,
      watchedPercentage,
      status,
    }

    await context.runMutation(api.watch.upsertNextEpisode, updateData)
  },
})
