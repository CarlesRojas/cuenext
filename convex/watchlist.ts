import type { MovieSectionItem, TvSectionItem } from '../src/type/section'
import { query } from './_generated/server'
import { requireUser } from './requireUser'

export const getTvSections = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const tvFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
      .collect()

    const watchNext: TvSectionItem[] = []
    const haventStarted: TvSectionItem[] = []
    const stoppedWatching: TvSectionItem[] = []
    const finished: TvSectionItem[] = []
    const waitingForEpisodes: TvSectionItem[] = []

    for (const follow of tvFollows) {
      const nextEp = await context.db
        .query('nextEpisode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', follow.tmdbId))
        .unique()

      if (!nextEp) continue

      const item: TvSectionItem = {
        tmdbId: follow.tmdbId,
        lastWatchedAt: nextEp.lastWatchedAt,
        manuallyStopped: follow.manuallyStopped,
        seasonNumber: nextEp.seasonNumber,
        episodeNumber: nextEp.episodeNumber,
        followedAt: follow.followedAt,
        watchedPercentage: nextEp.watchedPercentage,
        status: nextEp.status,
      }

      const noMoreEpisodes = nextEp.seasonNumber === -1 && nextEp.episodeNumber === -1

      if (noMoreEpisodes) {
        if (nextEp.status === 'ended') finished.push(item)
        else waitingForEpisodes.push(item)
      } else if (follow.manuallyStopped) stoppedWatching.push(item)
      else if (nextEp.seasonNumber === 0 && nextEp.episodeNumber === 0) haventStarted.push(item)
      else watchNext.push(item)
    }

    watchNext.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))
    haventStarted.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
    stoppedWatching.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
    finished.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))
    waitingForEpisodes.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))

    return { watchNext, haventStarted, stoppedWatching, finished, waitingForEpisodes }
  },
})

export const getMovieSections = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const movieFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
      .collect()

    const movies = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId))
      .collect()

    const watchedMap = new Map(movies.map(m => [m.tmdbId, m.watchedAt]))

    const watchNext: MovieSectionItem[] = []
    const finished: MovieSectionItem[] = []

    for (const f of movieFollows) {
      const item: MovieSectionItem = {
        tmdbId: f.tmdbId,
        watchedAt: watchedMap.get(f.tmdbId) || null,
        followedAt: f.followedAt,
      }

      if (item.watchedAt) finished.push(item)
      else if (!f.manuallyStopped) watchNext.push(item)
    }

    watchNext.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))
    finished.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))

    return { watchNext, finished }
  },
})
