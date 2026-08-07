import type { MutationCtx } from '../_generated/server'
import { isLayoutUsable, isShowSeasonsFresh, readShowSeasons } from './showSeasonsShared'

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

// What the client keeps for a show. The full row carries the season layout the recompute
// needs, none of which the UI reads, so only these fields are sent.
export interface NextEpisodeState {
  seasonNumber: number
  episodeNumber: number
  watchedPercentage: number
  numberOfSeasons: number
  status: string
  lastWatchedAt: number | null
}

export function toNextEpisodeState(row: {
  seasonNumber: number
  episodeNumber: number
  watchedPercentage: number
  numberOfSeasons: number
  status: string
  lastWatchedAt: number | null
}): NextEpisodeState {
  return {
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    watchedPercentage: row.watchedPercentage,
    numberOfSeasons: row.numberOfSeasons,
    status: row.status,
    lastWatchedAt: row.lastWatchedAt,
  }
}

// Recomputes the nextEpisode row inside the calling mutation's transaction when the cached
// season layout is still fresh, so the common watch/unwatch toggle needs no follow-up
// updateNextEpisode action (which costs an action call plus its internal query and
// mutation). `recomputed: false` means the season data is missing or stale - then the
// caller's client must run the TMDB-fetching action as before.
//
// The recomputed state is returned so the mutation can hand it back to the client, which
// writes it straight into its cache. Without that the client would have to re-read the show
// state after every toggle, which is what a live subscription was silently doing.
export async function recomputeNextEpisodeInDb(
  context: MutationCtx,
  userId: string,
  showTmdbId: number,
  // Set only by the mutations that just fetched the layout from TMDB: an empty layout from
  // them is a show that genuinely has nothing aired, while an empty layout found in storage
  // is refused so a bad write can never stick until its TTL expires.
  options: { trustEmptyLayout?: boolean } = {},
): Promise<{ recomputed: boolean; nextEpisode: NextEpisodeState | null }> {
  const now = Date.now()

  const existing = await context.db
    .query('nextEpisode')
    .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', showTmdbId))
    .unique()

  // The shared layout is preferred over the user's own copy, so following a show somebody
  // else already tracks needs no TMDB work at all: the first user's refresh serves everyone.
  const shared = await readShowSeasons(context, showTmdbId)

  const usable = (layout: { seasonEpisodeCounts: number[] } | null) =>
    options.trustEmptyLayout || isLayoutUsable(layout)

  const layout =
    isShowSeasonsFresh(shared, now) && usable(shared)
      ? { ...shared!, seasonDataUpdatedAt: shared!.updatedAt }
      : existing && isSeasonDataFresh(existing.seasonDataUpdatedAt, now) && usable(existing)
        ? existing
        : null

  if (!layout) return { recomputed: false, nextEpisode: existing ? toNextEpisodeState(existing) : null }

  const watchedEpisodes = await context.db
    .query('episode')
    .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', showTmdbId))
    .collect()

  const computed = computeNextEpisode(watchedEpisodes, layout.seasonEpisodeCounts, layout.seasonFirstEpisodeIndex)

  const updateData = {
    seasonEpisodeCounts: layout.seasonEpisodeCounts,
    seasonFirstEpisodeIndex: layout.seasonFirstEpisodeIndex,
    numberOfSeasons: layout.numberOfSeasons,
    status: layout.status,
    seasonDataUpdatedAt: layout.seasonDataUpdatedAt,
    ...computed,
  }

  if (existing) await context.db.patch(existing._id, updateData)
  else await context.db.insert('nextEpisode', { userId, showTmdbId, ...updateData })

  return { recomputed: true, nextEpisode: toNextEpisodeState(updateData) }
}
