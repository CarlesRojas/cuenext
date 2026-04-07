import { v } from 'convex/values'
import type { TmdbMovie, TmdbTv } from '../src/type/tmdb'
import {
  paginated,
  tmdbCreditsSchema,
  tmdbMovieMinimalSchema,
  tmdbMovieSchema,
  tmdbSeasonSchema,
  tmdbTvMinimalSchema,
  tmdbTvSchema,
  tmdbVideosResponseSchema,
  tmdbWatchProvidersSchema,
} from '../src/type/tmdb'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { CACHE_DURATIONS, fetchTmdbCached } from './tmdbCache'

export const getDiscoverMovies = action({
  args: {
    page: v.optional(v.number()),
    certification: v.optional(v.string()),
    certification_country: v.optional(v.string()),
    certification_gte: v.optional(v.string()),
    certification_lte: v.optional(v.string()),
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
      v.union(
        v.literal('1'),
        v.literal('2'),
        v.literal('3'),
        v.literal('4'),
        v.literal('5'),
        v.literal('6'),
        v.string(), // To support comma/pipe separated values like '2|3'
      ),
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
  handler: async (context, args) => {
    const params: Record<string, string> = {}

    if (args.certification) params.certification = args.certification
    if (args.certification_country) params.certification_country = args.certification_country
    if (args.certification_gte) params['certification.gte'] = args.certification_gte
    if (args.certification_lte) params['certification.lte'] = args.certification_lte
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

    return fetchTmdbCached(context, paginated(tmdbMovieSchema), '/discover/movie', {
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
  handler: async (context, args) => {
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

    return fetchTmdbCached(context, paginated(tmdbTvSchema), '/discover/tv', {
      page: String(args.page || 1),
      ...params,
    })
  },
})

export const searchMovies = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    includeAdult: v.optional(v.boolean()),
    language: v.optional(v.string()),
    primaryReleaseYear: v.optional(v.number()),
    region: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const params: Record<string, string> = {
      query: args.query,
      page: String(args.page || 1),
    }

    if (args.includeAdult !== undefined) params.include_adult = String(args.includeAdult)
    if (args.language) params.language = args.language
    if (args.primaryReleaseYear !== undefined) params.primary_release_year = String(args.primaryReleaseYear)
    if (args.region) params.region = args.region
    if (args.year !== undefined) params.year = String(args.year)

    return fetchTmdbCached(context, paginated(tmdbMovieMinimalSchema), '/search/movie', params)
  },
})

export const searchTv = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    includeAdult: v.optional(v.boolean()),
    language: v.optional(v.string()),
    firstAirDateYear: v.optional(v.number()),
  },
  handler: async (context, args) => {
    const params: Record<string, string> = {
      query: args.query,
      page: String(args.page || 1),
    }

    if (args.includeAdult !== undefined) params.include_adult = String(args.includeAdult)
    if (args.language) params.language = args.language
    if (args.firstAirDateYear !== undefined) params.first_air_date_year = String(args.firstAirDateYear)

    return fetchTmdbCached(context, paginated(tmdbTvMinimalSchema), '/search/tv', params)
  },
})

export const getMovieDetails = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbMovieSchema, `/movie/${args.tmdbId}`)
  },
})

export const getShowDetails = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbTvSchema, `/tv/${args.tmdbId}`)
  },
})

export const getMovieWatchProviders = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(
      context,
      tmdbWatchProvidersSchema,
      `/movie/${args.tmdbId}/watch/providers`,
      {},
      CACHE_DURATIONS.ONE_WEEK,
    )
  },
})

export const getShowWatchProviders = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(
      context,
      tmdbWatchProvidersSchema,
      `/tv/${args.tmdbId}/watch/providers`,
      {},
      CACHE_DURATIONS.ONE_WEEK,
    )
  },
})

export const getMovieVideos = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(
      context,
      tmdbVideosResponseSchema,
      `/movie/${args.tmdbId}/videos`,
      {},
      CACHE_DURATIONS.ONE_WEEK,
    )
  },
})

export const getMovieRecommendations = action({
  args: { tmdbId: v.number(), page: v.optional(v.number()) },
  handler: async (context, args) => {
    const params: Record<string, string> = {}
    if (args.page) params.page = String(args.page)

    return fetchTmdbCached(
      context,
      paginated(tmdbMovieMinimalSchema),
      `/movie/${args.tmdbId}/recommendations`,
      params,
      CACHE_DURATIONS.ONE_WEEK,
    )
  },
})

export const getTvRecommendations = action({
  args: { tmdbId: v.number(), page: v.optional(v.number()) },
  handler: async (context, args) => {
    const params: Record<string, string> = {}
    if (args.page) params.page = String(args.page)

    return fetchTmdbCached(
      context,
      paginated(tmdbTvMinimalSchema),
      `/tv/${args.tmdbId}/recommendations`,
      params,
      CACHE_DURATIONS.ONE_WEEK,
    )
  },
})
export const getTvVideos = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbVideosResponseSchema, `/tv/${args.tmdbId}/videos`, {}, CACHE_DURATIONS.ONE_WEEK)
  },
})

export const getMovieCredits = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbCreditsSchema, `/movie/${args.tmdbId}/credits`, {}, CACHE_DURATIONS.ONE_WEEK)
  },
})

export const getTvCredits = action({
  args: { tmdbId: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbCreditsSchema, `/tv/${args.tmdbId}/credits`, {}, CACHE_DURATIONS.ONE_WEEK)
  },
})

export const getShowSeasonDetails = action({
  args: { tmdbId: v.number(), seasonNumber: v.number() },
  handler: async (context, args) => {
    return fetchTmdbCached(context, tmdbSeasonSchema, `/tv/${args.tmdbId}/season/${args.seasonNumber}`)
  },
})

export const getUpcomingTv = action({
  args: { page: v.optional(v.number()) },
  handler: async (context, args) => {
    const page = args.page || 1
    const pageSize = 20

    const tvWatchlist: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'tv'
    }> = await context.runQuery(api.upcoming.getUpcomingTvWatchlist, {})

    const tvUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'tv'
      episode: TmdbTv
      airDate: string
    }> = []

    for (const show of tvWatchlist) {
      try {
        const showDetails = await fetchTmdbCached(context, tmdbTvSchema, `/tv/${show.tmdbId}`)

        const nextEpisode = showDetails.next_episode_to_air
        if (!nextEpisode) continue

        const airDateString = nextEpisode.air_date
        if (!airDateString) continue

        const airDate = new Date(airDateString)
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)

        if (airDate < yesterday) continue

        tvUpcoming.push({
          tmdbId: show.tmdbId,
          name: show.name,
          poster: show.poster,
          backdrop: show.backdrop,
          type: 'tv',
          episode: showDetails,
          airDate: airDateString,
        })
      } catch (error) {
        console.error(`Failed to fetch TV details for ${show.tmdbId}:`, error)
      }
    }

    const sortedTv = tvUpcoming.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())

    const offset = (page - 1) * pageSize
    const paginatedResults = sortedTv.slice(offset, offset + pageSize)

    return {
      page,
      results: paginatedResults,
      total_pages: Math.ceil(sortedTv.length / pageSize),
      total_results: sortedTv.length,
    }
  },
})

export const getUpcomingMovies = action({
  args: { page: v.optional(v.number()) },
  handler: async (context, args) => {
    const page = args.page || 1
    const pageSize = 20

    const movieWatchlist: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'movie'
    }> = await context.runQuery(api.upcoming.getUpcomingMoviesWatchlist, {})

    const movieUpcoming: Array<{
      tmdbId: number
      name: string
      poster: string | null
      backdrop: string | null
      type: 'movie'
      movie: TmdbMovie
      airDate: string
    }> = []

    for (const movie of movieWatchlist) {
      try {
        const movieDetails = await fetchTmdbCached(context, tmdbMovieSchema, `/movie/${movie.tmdbId}`)

        const airDateString = movieDetails.release_date
        if (!airDateString) continue

        const airDate = new Date(airDateString)
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)

        if (airDate < yesterday) continue

        movieUpcoming.push({
          tmdbId: movie.tmdbId,
          name: movie.name,
          poster: movie.poster,
          backdrop: movie.backdrop,
          type: 'movie',
          movie: movieDetails,
          airDate: airDateString,
        })
      } catch (error) {
        console.error(`Failed to fetch movie details for ${movie.tmdbId}:`, error)
      }
    }

    const sortedMovies = movieUpcoming.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime())

    const offset = (page - 1) * pageSize
    const paginatedResults = sortedMovies.slice(offset, offset + pageSize)

    return {
      page,
      results: paginatedResults,
      total_pages: Math.ceil(sortedMovies.length / pageSize),
      total_results: sortedMovies.length,
    }
  },
})

export const getTrendingMovies = action({
  args: {
    page: v.optional(v.number()),
    time_window: v.optional(v.union(v.literal('day'), v.literal('week'))),
  },
  handler: async (context, args) => {
    const timeWindow = args.time_window || 'week'
    const page = args.page || 1

    return fetchTmdbCached(context, paginated(tmdbMovieSchema), `/trending/movie/${timeWindow}`, {
      page: String(page),
    })
  },
})

export const getTrendingTv = action({
  args: {
    page: v.optional(v.number()),
    time_window: v.optional(v.union(v.literal('day'), v.literal('week'))),
  },
  handler: async (context, args) => {
    const timeWindow = args.time_window || 'week'
    const page = args.page || 1

    return fetchTmdbCached(context, paginated(tmdbTvSchema), `/trending/tv/${timeWindow}`, {
      page: String(page),
    })
  },
})
