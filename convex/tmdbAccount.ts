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
import { requireUser } from './requireUser'
import { fetchTmdbCached } from './tmdbCache'

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
