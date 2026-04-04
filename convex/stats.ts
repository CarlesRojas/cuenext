import { query } from './_generated/server'
import { requireUser } from './requireUser'

export const getProfileSummary = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const movies = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId))
      .collect()

    const moviesWatchedCount = movies.length

    const episodes = await context.db
      .query('episode')
      .withIndex('by_user_show', q => q.eq('userId', userId))
      .collect()

    const episodesWatchedCount = episodes.length

    const follows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId))
      .collect()

    const followedMoviesCount = follows.filter(f => f.type === 'movie').length
    const followedShowsCount = follows.filter(f => f.type === 'tv').length

    let lastActivityTimestamp = 0

    for (const m of movies) {
      if (m.watchedAt && m.watchedAt > lastActivityTimestamp) {
        lastActivityTimestamp = m.watchedAt
      }
    }

    for (const ep of episodes) {
      if (ep.watchedAt > lastActivityTimestamp) {
        lastActivityTimestamp = ep.watchedAt
      }
    }

    for (const f of follows) {
      if (f.followedAt > lastActivityTimestamp) {
        lastActivityTimestamp = f.followedAt
      }
    }

    return {
      moviesWatchedCount,
      episodesWatchedCount,
      followedMoviesCount,
      followedShowsCount,
      lastActivityTimestamp: lastActivityTimestamp || null,
    }
  },
})
