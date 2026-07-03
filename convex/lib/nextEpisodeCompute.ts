import type { MutationCtx } from '../_generated/server'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface WatchedEpisode {
  seasonNumber: number
  episodeNumber: number
  watchedAt: number
}

// Pure recompute shared by the updateNextEpisode action and the watch mutations so the
// two paths can't drift: given the watched episodes and the cached season layout, find
// the earliest unwatched episode and the watch progress.
export function computeNextEpisode(
  watchedEpisodes: WatchedEpisode[],
  seasonEpisodeCounts: number[],
  seasonFirstEpisodeIndex: number[],
) {
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

  return {
    lastWatchedAt:
      watchedEpisodesWithoutSpecials.length > 0
        ? Math.max(...watchedEpisodesWithoutSpecials.map(ep => ep.watchedAt))
        : null,
    seasonNumber: nextSeasonNumber,
    episodeNumber: nextEpisodeNumber,
    watchedPercentage,
  }
}

export function isSeasonDataFresh(seasonDataUpdatedAt: number | null | undefined, now: number) {
  return !!seasonDataUpdatedAt && seasonDataUpdatedAt >= now - ONE_WEEK_MS
}

// Recomputes the nextEpisode row inside the calling mutation's transaction when the cached
// season layout is still fresh, so the common watch/unwatch toggle needs no follow-up
// updateNextEpisode action (which costs an action call plus its internal query and
// mutation). Returns false when the season data is missing or stale - then the caller's
// client must run the TMDB-fetching action as before.
export async function recomputeNextEpisodeInDb(
  context: MutationCtx,
  userId: string,
  showTmdbId: number,
): Promise<boolean> {
  const existing = await context.db
    .query('nextEpisode')
    .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', showTmdbId))
    .unique()

  if (!existing || !isSeasonDataFresh(existing.seasonDataUpdatedAt, Date.now())) return false

  const watchedEpisodes = await context.db
    .query('episode')
    .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', showTmdbId))
    .collect()

  const computed = computeNextEpisode(watchedEpisodes, existing.seasonEpisodeCounts, existing.seasonFirstEpisodeIndex)

  await context.db.patch(existing._id, computed)

  return true
}
