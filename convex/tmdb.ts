import { v } from 'convex/values'
import {
  paginated,
  tmdbMovieSchema,
  tmdbMultiSearchResultSchema,
  tmdbSeasonSchema,
  tmdbShowSchema,
} from '../src/type/tmdb'
import { action } from './_generated/server'
import { fetchTmdb } from './lib/tmdbClient'

export const getPopularMovies = action({
  args: { page: v.optional(v.number()) },
  handler: async (_, args) => {
    return fetchTmdb(paginated(tmdbMovieSchema), '/movie/popular', { page: String(args.page || 1) })
  },
})

export const getPopularShows = action({
  args: { page: v.optional(v.number()) },
  handler: async (_, args) => {
    console.warn('getPopularShows called')
    return fetchTmdb(paginated(tmdbShowSchema), '/tv/popular', { page: String(args.page || 1) })
  },
})

export const searchMulti = action({
  args: { query: v.string(), page: v.optional(v.number()) },
  handler: async (_, args) => {
    return fetchTmdb(paginated(tmdbMultiSearchResultSchema), '/search/multi', {
      query: args.query,
      page: String(args.page || 1),
    })
  },
})

export const getMovieDetails = action({
  args: { tmdbId: v.number() },
  handler: async (_, args) => {
    return fetchTmdb(tmdbMovieSchema, `/movie/${args.tmdbId}`)
  },
})

export const getShowDetails = action({
  args: { tmdbId: v.number() },
  handler: async (_, args) => {
    return fetchTmdb(tmdbShowSchema, `/tv/${args.tmdbId}`)
  },
})

export const getShowSeasonDetails = action({
  args: { tmdbId: v.number(), seasonNumber: v.number() },
  handler: async (_, args) => {
    return fetchTmdb(tmdbSeasonSchema, `/tv/${args.tmdbId}/season/${args.seasonNumber}`)
  },
})
