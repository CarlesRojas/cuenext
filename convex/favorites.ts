import { v } from 'convex/values'
import type { MovieSectionItem, TvSectionItem } from '../src/type/section'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

export const getFavoriteMovies = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const favoriteItems = await context.db
      .query('favorite')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
      .collect()

    const favoriteMovieFollows = []

    const allMovieFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'movie'))
      .collect()

    const favoriteIds = new Set(favoriteItems.map(f => f.tmdbId))
    favoriteMovieFollows.push(...allMovieFollows.filter(follow => favoriteIds.has(follow.tmdbId)))

    const favorites: MovieSectionItem[] = favoriteMovieFollows.map(follow => ({
      tmdbId: follow.tmdbId,
      watchedAt: null,
      followedAt: follow.followedAt,
      name: follow.name,
      poster: follow.poster,
      backdrop: follow.backdrop,
    }))

    favorites.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))

    return favorites
  },
})

export const getFavoriteShows = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const favoriteItems = await context.db
      .query('favorite')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
      .collect()

    const favoriteShowFollows = []

    const allTvFollows = await context.db
      .query('follow')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', 'tv'))
      .collect()

    const favoriteIds = new Set(favoriteItems.map(f => f.tmdbId))
    favoriteShowFollows.push(...allTvFollows.filter(follow => favoriteIds.has(follow.tmdbId)))

    const favorites: TvSectionItem[] = favoriteShowFollows.map(follow => ({
      id: `$${follow.tmdbId}`,
      showTmdbId: follow.tmdbId,
      lastWatchedAt: null,
      manuallyStopped: false,
      seasonNumber: 0,
      episodeNumber: 0,
      followedAt: follow.followedAt,
      watchedPercentage: 0,
      status: 'ongoing',
      name: follow.name,
      poster: follow.poster,
      backdrop: follow.backdrop,
      numberOfSeasons: 1, // We are not using this for favorites
    }))

    favorites.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))

    return favorites
  },
})

export const favoriteItem = mutation({
  args: {
    tmdbId: v.number(),
    type: v.union(v.literal('movie'), v.literal('tv')),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existingFavorite = await context.db
      .query('favorite')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existingFavorite)
      await context.db.insert('favorite', {
        userId,
        type: args.type,
        tmdbId: args.tmdbId,
        favoritedAt: Date.now(),
      })
  },
})

export const unfavoriteItem = mutation({
  args: {
    tmdbId: v.number(),
    type: v.union(v.literal('movie'), v.literal('tv')),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existingFavorite = await context.db
      .query('favorite')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (existingFavorite) await context.db.delete(existingFavorite._id)
  },
})

export const listFavorites = query({
  args: { type: v.union(v.literal('movie'), v.literal('tv')) },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const favorites = await context.db
      .query('favorite')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', args.type))
      .collect()

    return favorites.map(f => f.tmdbId)
  },
})
