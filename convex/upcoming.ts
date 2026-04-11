import { query } from './_generated/server'
import { requireUser } from './requireUser'

export const getUpcomingTvWatchlist = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    // TODO: Consider pagination if users follow many TV shows
    const tvFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
      .collect()

    // TODO: Consider pagination if users have many stopped shows
    const stoppedShows = await context.db
      .query('stopped')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    const stoppedShowIds = new Set(stoppedShows.map(s => s.tmdbId))
    const nonStoppedTvFollows = tvFollows.filter(follow => !stoppedShowIds.has(follow.tmdbId))

    const tvUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'tv'
    }> = []

    for (const follow of nonStoppedTvFollows) {
      const nextEp = await context.db
        .query('nextEpisode')
        .withIndex('by_user_show', q => q.eq('userId', userId).eq('showTmdbId', follow.tmdbId))
        .unique()

      if (!nextEp) continue

      const isFinished =
        nextEp.seasonNumber === -1 && nextEp.episodeNumber === -1 && ['ended', 'canceled'].includes(nextEp.status)
      if (isFinished) continue

      tvUpcoming.push({
        tmdbId: follow.tmdbId,
        name: follow.name,
        poster: follow.poster,
        backdrop: follow.backdrop,
        type: 'tv',
      })
    }

    return tvUpcoming
  },
})

export const getUpcomingMoviesWatchlist = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    // TODO: Consider pagination if users follow many movies
    const movieFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
      .collect()

    // TODO: Consider pagination if users have many watched movies
    const watchedMovies = await context.db
      .query('movie')
      .withIndex('by_user_tmdbId', q => q.eq('userId', userId))
      .collect()

    const watchedMovieIds = new Set(watchedMovies.map(m => m.tmdbId))

    const movieUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'movie'
    }> = []

    for (const follow of movieFollows) {
      if (watchedMovieIds.has(follow.tmdbId)) continue

      movieUpcoming.push({
        tmdbId: follow.tmdbId,
        name: follow.name,
        poster: follow.poster,
        backdrop: follow.backdrop,
        type: 'movie',
      })
    }

    return movieUpcoming
  },
})
