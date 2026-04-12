import { v } from 'convex/values'
import { z } from 'zod'
import type {
  TmdbFavoritesMoviesResponse,
  TmdbFavoritesTvResponse,
  TmdbWatchlistMoviesResponse,
  TmdbWatchlistTvResponse,
} from '../src/type/tmdbAccount'
import {
  tmdbFavoritesMoviesResponseSchema,
  tmdbFavoritesTvResponseSchema,
  tmdbWatchlistMoviesResponseSchema,
  tmdbWatchlistTvResponseSchema,
} from '../src/type/tmdbAccount'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { postTmdb } from './lib/tmdbClient'
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

const tmdbWatchlistResponseSchema = z.object({
  success: z.boolean(),
  status_code: z.number(),
  status_message: z.string(),
})

export const getTvWatchlist = action({
  args: {},
  handler: async context => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    const allResults = []
    let currentPage = 1
    let totalPages = 1

    do {
      const result: TmdbWatchlistTvResponse = await fetchTmdbCached(
        context,
        tmdbWatchlistTvResponseSchema,
        `/account/${accountLink.tmdbAccountId}/watchlist/tv`,
        { page: currentPage.toString() },
      )

      allResults.push(...result.results)
      totalPages = result.total_pages
      currentPage++
    } while (currentPage <= totalPages)

    return allResults
  },
})

export const getMovieWatchlist = action({
  args: {},
  handler: async context => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    const allResults = []
    let currentPage = 1
    let totalPages = 1

    do {
      const result: TmdbWatchlistMoviesResponse = await fetchTmdbCached(
        context,
        tmdbWatchlistMoviesResponseSchema,
        `/account/${accountLink.tmdbAccountId}/watchlist/movies`,
        { page: currentPage.toString() },
      )

      allResults.push(...result.results)
      totalPages = result.total_pages
      currentPage++
    } while (currentPage <= totalPages)

    return allResults
  },
})

export const getTvFavorites = action({
  args: {},
  handler: async context => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    const allResults = []
    let currentPage = 1
    let totalPages = 1

    do {
      const result: TmdbFavoritesTvResponse = await fetchTmdbCached(
        context,
        tmdbFavoritesTvResponseSchema,
        `/account/${accountLink.tmdbAccountId}/favorite/tv`,
        { page: currentPage.toString() },
      )

      allResults.push(...result.results)
      totalPages = result.total_pages
      currentPage++
    } while (currentPage <= totalPages)

    return allResults
  },
})

export const getMovieFavorites = action({
  args: {},
  handler: async context => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    const allResults = []
    let currentPage = 1
    let totalPages = 1

    do {
      const result: TmdbFavoritesMoviesResponse = await fetchTmdbCached(
        context,
        tmdbFavoritesMoviesResponseSchema,
        `/account/${accountLink.tmdbAccountId}/favorite/movies`,
        { page: currentPage.toString() },
      )

      allResults.push(...result.results)
      totalPages = result.total_pages
      currentPage++
    } while (currentPage <= totalPages)

    return allResults
  },
})

export const addToWatchlist = action({
  args: {
    media: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    add: v.boolean(),
  },
  handler: async (context, args) => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    await postTmdb(tmdbWatchlistResponseSchema, `/account/${accountLink.tmdbAccountId}/watchlist`, {
      media_type: args.media,
      media_id: args.tmdbId,
      watchlist: args.add,
    })
  },
})

export const addToFavorites = action({
  args: {
    media: v.union(v.literal('movie'), v.literal('tv')),
    tmdbId: v.number(),
    add: v.boolean(),
  },
  handler: async (context, args) => {
    await requireUser(context)
    const accountLink = await context.runQuery(api.tmdbAuth.getTmdbAccountLink)
    if (!accountLink) throw new Error('TMDB account not linked')

    await postTmdb(tmdbWatchlistResponseSchema, `/account/${accountLink.tmdbAccountId}/favorite`, {
      media_type: args.media,
      media_id: args.tmdbId,
      favorite: args.add,
    })
  },
})
