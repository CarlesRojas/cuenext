import { v } from 'convex/values'
import {
  paginated,
  tmdbMovieSchema,
  tmdbMultiSearchResultSchema,
  tmdbSeasonSchema,
  tmdbTvSchema,
} from '../src/type/tmdb'
import { action } from './_generated/server'
import { fetchTmdb } from './lib/tmdbClient'

export const getDiscoverMovies = action({
  args: {
    page: v.optional(v.number()),
    certification: v.optional(v.string()),
    certification_country: v.optional(v.string()),
    'certification.gte': v.optional(v.string()),
    'certification.lte': v.optional(v.string()),
    include_adult: v.optional(v.boolean()),
    include_video: v.optional(v.boolean()),
    language: v.optional(v.string()),
    primary_release_year: v.optional(v.number()),
    primary_release_date_gte: v.optional(v.string()),
    primary_release_date_lte: v.optional(v.string()),
    region: v.optional(v.string()),
    release_date_gte: v.optional(v.string()),
    release_date_lte: v.optional(v.string()),
    sort_by: v.optional(
      v.union(
        v.literal('popularity.asc'),
        v.literal('popularity.desc'),
        v.literal('revenue.asc'),
        v.literal('revenue.desc'),
        v.literal('primary_release_date.asc'),
        v.literal('primary_release_date.desc'),
        v.literal('vote_average.asc'),
        v.literal('vote_average.desc'),
        v.literal('vote_count.asc'),
        v.literal('vote_count.desc'),
        v.literal('original_title.asc'),
        v.literal('original_title.desc'),
        v.literal('title.asc'),
        v.literal('title.desc'),
      ),
    ),
    vote_average_gte: v.optional(v.number()),
    vote_average_lte: v.optional(v.number()),
    vote_count_gte: v.optional(v.number()),
    vote_count_lte: v.optional(v.number()),
    watch_region: v.optional(v.string()),
    with_cast: v.optional(v.string()),
    with_companies: v.optional(v.string()),
    with_crew: v.optional(v.string()),
    with_genres: v.optional(v.string()),
    with_keywords: v.optional(v.string()),
    with_origin_country: v.optional(v.string()),
    with_original_language: v.optional(v.string()),
    with_people: v.optional(v.string()),
    with_release_type: v.optional(
      v.union(v.literal('1'), v.literal('2'), v.literal('3'), v.literal('4'), v.literal('5'), v.literal('6')),
    ),
    with_runtime_gte: v.optional(v.number()),
    with_runtime_lte: v.optional(v.number()),
    with_watch_monetization_types: v.optional(
      v.union(v.literal('flatrate'), v.literal('free'), v.literal('ads'), v.literal('rent'), v.literal('buy')),
    ),
    with_watch_providers: v.optional(v.string()),
    without_companies: v.optional(v.string()),
    without_genres: v.optional(v.string()),
    without_keywords: v.optional(v.string()),
    without_watch_providers: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (_, args) => {
    const params: Record<string, string> = {}

    if (args.certification) params.certification = args.certification
    if (args.certification_country) params.certification_country = args.certification_country
    if (args['certification.gte']) params['certification.gte'] = args['certification.gte']
    if (args['certification.lte']) params['certification.lte'] = args['certification.lte']
    if (args.include_adult !== undefined) params.include_adult = String(args.include_adult)
    if (args.include_video !== undefined) params.include_video = String(args.include_video)
    if (args.language) params.language = args.language
    if (args.primary_release_year !== undefined) params.primary_release_year = String(args.primary_release_year)
    if (args.primary_release_date_gte) params['primary_release_date.gte'] = args.primary_release_date_gte
    if (args.primary_release_date_lte) params['primary_release_date.lte'] = args.primary_release_date_lte
    if (args.region) params.region = args.region
    if (args.release_date_gte) params['release_date.gte'] = args.release_date_gte
    if (args.release_date_lte) params['release_date.lte'] = args.release_date_lte
    if (args.sort_by) params.sort_by = args.sort_by
    if (args.vote_average_gte !== undefined) params['vote_average.gte'] = String(args.vote_average_gte)
    if (args.vote_average_lte !== undefined) params['vote_average.lte'] = String(args.vote_average_lte)
    if (args.vote_count_gte !== undefined) params['vote_count.gte'] = String(args.vote_count_gte)
    if (args.vote_count_lte !== undefined) params['vote_count.lte'] = String(args.vote_count_lte)
    if (args.watch_region) params.watch_region = args.watch_region
    if (args.with_cast) params.with_cast = args.with_cast
    if (args.with_companies) params.with_companies = args.with_companies
    if (args.with_crew) params.with_crew = args.with_crew
    if (args.with_genres) params.with_genres = args.with_genres
    if (args.with_keywords) params.with_keywords = args.with_keywords
    if (args.with_origin_country) params.with_origin_country = args.with_origin_country
    if (args.with_original_language) params.with_original_language = args.with_original_language
    if (args.with_people) params.with_people = args.with_people
    if (args.with_release_type) params.with_release_type = args.with_release_type
    if (args.with_runtime_gte !== undefined) params['with_runtime.gte'] = String(args.with_runtime_gte)
    if (args.with_runtime_lte !== undefined) params['with_runtime.lte'] = String(args.with_runtime_lte)
    if (args.with_watch_monetization_types) params.with_watch_monetization_types = args.with_watch_monetization_types
    if (args.with_watch_providers) params.with_watch_providers = args.with_watch_providers
    if (args.without_companies) params.without_companies = args.without_companies
    if (args.without_genres) params.without_genres = args.without_genres
    if (args.without_keywords) params.without_keywords = args.without_keywords
    if (args.without_watch_providers) params.without_watch_providers = args.without_watch_providers
    if (args.year) params.year = String(args.year)

    return fetchTmdb(paginated(tmdbMovieSchema), '/discover/movie', {
      page: String(args.page || 1),
      ...params,
    })
  },
})

export const getDiscoverShows = action({
  args: {
    page: v.optional(v.number()),
    air_date_gte: v.optional(v.string()),
    air_date_lte: v.optional(v.string()),
    first_air_date_gte: v.optional(v.string()),
    first_air_date_lte: v.optional(v.string()),
    first_air_date_year: v.optional(v.number()),
    include_adult: v.optional(v.boolean()),
    include_null_first_air_dates: v.optional(v.boolean()),
    language: v.optional(v.string()),
    screened_theatrically: v.optional(v.boolean()),
    sort_by: v.optional(
      v.union(
        v.literal('popularity.asc'),
        v.literal('popularity.desc'),
        v.literal('first_air_date.asc'),
        v.literal('first_air_date.desc'),
        v.literal('vote_average.asc'),
        v.literal('vote_average.desc'),
        v.literal('vote_count.asc'),
        v.literal('vote_count.desc'),
        v.literal('name.asc'),
        v.literal('name.desc'),
        v.literal('original_name.asc'),
        v.literal('original_name.desc'),
      ),
    ),
    timezone: v.optional(v.string()),
    vote_average_gte: v.optional(v.number()),
    vote_average_lte: v.optional(v.number()),
    vote_count_gte: v.optional(v.number()),
    vote_count_lte: v.optional(v.number()),
    watch_region: v.optional(v.string()),
    with_companies: v.optional(v.string()),
    with_genres: v.optional(v.string()),
    with_keywords: v.optional(v.string()),
    with_networks: v.optional(v.string()),
    with_origin_country: v.optional(v.string()),
    with_original_language: v.optional(v.string()),
    with_runtime_gte: v.optional(v.number()),
    with_runtime_lte: v.optional(v.number()),
    with_status: v.optional(
      v.union(v.literal('0'), v.literal('1'), v.literal('2'), v.literal('3'), v.literal('4'), v.literal('5')),
    ),
    with_type: v.optional(
      v.union(
        v.literal('0'),
        v.literal('1'),
        v.literal('2'),
        v.literal('3'),
        v.literal('4'),
        v.literal('5'),
        v.literal('6'),
      ),
    ),
    with_watch_monetization_types: v.optional(
      v.union(v.literal('flatrate'), v.literal('free'), v.literal('ads'), v.literal('rent'), v.literal('buy')),
    ),
    with_watch_providers: v.optional(v.string()),
    without_companies: v.optional(v.string()),
    without_genres: v.optional(v.string()),
    without_keywords: v.optional(v.string()),
    without_watch_providers: v.optional(v.string()),
  },
  handler: async (_, args) => {
    const params: Record<string, string> = {}

    if (args.air_date_gte) params['air_date.gte'] = args.air_date_gte
    if (args.air_date_lte) params['air_date.lte'] = args.air_date_lte
    if (args.first_air_date_gte) params['first_air_date.gte'] = args.first_air_date_gte
    if (args.first_air_date_lte) params['first_air_date.lte'] = args.first_air_date_lte
    if (args.first_air_date_year) params.first_air_date_year = String(args.first_air_date_year)
    if (args.include_adult !== undefined) params.include_adult = String(args.include_adult)
    if (args.include_null_first_air_dates !== undefined)
      params.include_null_first_air_dates = String(args.include_null_first_air_dates)
    if (args.language) params.language = args.language
    if (args.screened_theatrically !== undefined) params.screened_theatrically = String(args.screened_theatrically)
    if (args.sort_by) params.sort_by = args.sort_by
    if (args.timezone) params.timezone = args.timezone
    if (args.vote_average_gte !== undefined) params['vote_average.gte'] = String(args.vote_average_gte)
    if (args.vote_average_lte !== undefined) params['vote_average.lte'] = String(args.vote_average_lte)
    if (args.vote_count_gte !== undefined) params['vote_count.gte'] = String(args.vote_count_gte)
    if (args.vote_count_lte !== undefined) params['vote_count.lte'] = String(args.vote_count_lte)
    if (args.watch_region) params.watch_region = args.watch_region
    if (args.with_companies) params.with_companies = args.with_companies
    if (args.with_genres) params.with_genres = args.with_genres
    if (args.with_keywords) params.with_keywords = args.with_keywords
    if (args.with_networks) params.with_networks = args.with_networks
    if (args.with_origin_country) params.with_origin_country = args.with_origin_country
    if (args.with_original_language) params.with_original_language = args.with_original_language
    if (args.with_runtime_gte !== undefined) params['with_runtime.gte'] = String(args.with_runtime_gte)
    if (args.with_runtime_lte !== undefined) params['with_runtime.lte'] = String(args.with_runtime_lte)
    if (args.with_status) params.with_status = args.with_status
    if (args.with_type) params.with_type = args.with_type
    if (args.with_watch_monetization_types) params.with_watch_monetization_types = args.with_watch_monetization_types
    if (args.with_watch_providers) params.with_watch_providers = args.with_watch_providers
    if (args.without_companies) params.without_companies = args.without_companies
    if (args.without_genres) params.without_genres = args.without_genres
    if (args.without_keywords) params.without_keywords = args.without_keywords
    if (args.without_watch_providers) params.without_watch_providers = args.without_watch_providers

    return fetchTmdb(paginated(tmdbTvSchema), '/discover/tv', {
      page: String(args.page || 1),
      ...params,
    })
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
    return fetchTmdb(tmdbTvSchema, `/tv/${args.tmdbId}`)
  },
})

export const getShowSeasonDetails = action({
  args: { tmdbId: v.number(), seasonNumber: v.number() },
  handler: async (_, args) => {
    return fetchTmdb(tmdbSeasonSchema, `/tv/${args.tmdbId}/season/${args.seasonNumber}`)
  },
})
