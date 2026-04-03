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

    const watchNext: any[] = []
    const haventStarted: any[] = []
    const stoppedWatching: any[] = []

    for (const follow of tvFollows) {
      const nextEp = await context.db
        .query('nextEpisode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', follow.tmdbId))
        .unique()

      if (!nextEp) continue

      const item = {
        tmdbId: follow.tmdbId,
        lastWatchedAt: nextEp.lastWatchedAt,
        manuallyStopped: follow.manuallyStopped,
        nextSeasonNumber: nextEp.nextSeasonNumber,
        nextEpisodeNumber: nextEp.nextEpisodeNumber,
        followedAt: follow.followedAt,
      }

      if (follow.manuallyStopped) {
        stoppedWatching.push(item)
      } else if (!nextEp.lastWatchedAt) {
        haventStarted.push(item)
      } else {
        watchNext.push(item)
      }
    }

    watchNext.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))

    haventStarted.sort((a, b) => b.followedAt - a.followedAt)
    stoppedWatching.sort((a, b) => b.followedAt - a.followedAt)

    const stripFollowedAt = (arr: any[]) => arr.map(({ followedAt, ...rest }) => rest)

    return {
      watchNext: stripFollowedAt(watchNext),
      haventStarted: stripFollowedAt(haventStarted),
      stoppedWatching: stripFollowedAt(stoppedWatching),
    }
  },
})

export const getMovieWatchNext = query({
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

    const watchedSet = new Set(movies.filter(m => m.watchedAt !== null).map(m => m.tmdbId))

    const unwatched = movieFollows
      .filter(f => !f.manuallyStopped && !watchedSet.has(f.tmdbId))
      .sort((a, b) => b.followedAt - a.followedAt)
      .map(f => f.tmdbId)

    return unwatched
  },
})
