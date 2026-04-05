import { v } from 'convex/values'
import type { MovieSectionItem, TvSectionItem } from '../src/type/section'
import { mutation, query } from './_generated/server'
import { requireUser } from './requireUser'

export const getFavoriteMovies = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const favoriteMovieFollows = await context.db
      .query('follow')
      .withIndex('by_user_type_favorite', q => q.eq('userId', userId).eq('type', 'movie').eq('favorite', true))
      .collect()

    const favorites: MovieSectionItem[] = favoriteMovieFollows.map(follow => ({
      tmdbId: follow.tmdbId,
      watchedAt: null,
      followedAt: follow.followedAt,
      name: follow.name,
      poster: follow.poster,
    }))

    favorites.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0))

    return favorites
  },
})

export const getFavoriteShows = query({
  args: {},
  handler: async context => {
    const userId = await requireUser(context)

    const favoriteShowFollows = await context.db
      .query('follow')
      .withIndex('by_user_type_favorite', q => q.eq('userId', userId).eq('type', 'tv').eq('favorite', true))
      .collect()

    const favorites: TvSectionItem[] = favoriteShowFollows.map(follow => ({
      id: `$${follow.tmdbId}`,
      tmdbId: follow.tmdbId,
      lastWatchedAt: null,
      manuallyStopped: follow.manuallyStopped,
      seasonNumber: 0,
      episodeNumber: 0,
      followedAt: follow.followedAt,
      watchedPercentage: 0,
      status: 'ongoing',
      name: follow.name,
      poster: follow.poster,
      backdrop: follow.backdrop,
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

    const existingFollow = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existingFollow) throw new Error('Item must be followed before it can be favorited')

    await context.db.patch(existingFollow._id, { favorite: true })

    return existingFollow._id
  },
})

export const unfavoriteItem = mutation({
  args: {
    tmdbId: v.number(),
    type: v.union(v.literal('movie'), v.literal('tv')),
  },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const existingFollow = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    if (!existingFollow) throw new Error('Item not found in follow list')

    await context.db.patch(existingFollow._id, { favorite: false })

    return existingFollow._id
  },
})

export const listFavorites = query({
  args: { type: v.union(v.literal('movie'), v.literal('tv')) },
  handler: async (context, args) => {
    const userId = await requireUser(context)

    const favorites = await context.db
      .query('follow')
      .withIndex('by_user_type_favorite', q => q.eq('userId', userId).eq('type', args.type).eq('favorite', true))
      .collect()

    return favorites.map(f => f.tmdbId)
  },
})
