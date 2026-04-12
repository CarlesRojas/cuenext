import { z } from 'zod'

export const tmdbMovieMinimalSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
})

export const tmdbMovieSchema = tmdbMovieMinimalSchema.extend({
  adult: z.boolean().optional(),
  budget: z.number().optional(),
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
    .optional(),
  homepage: z.string().nullable().optional(),
  imdb_id: z.string().nullable().optional(),
  origin_country: z.array(z.string()).optional(),
  original_language: z.string().optional(),
  original_title: z.string().optional(),
  popularity: z.number().optional(),
  revenue: z.number().optional(),
  runtime: z.number().nullable().optional(),
  spoken_languages: z
    .array(
      z.object({
        english_name: z.string(),
        iso_639_1: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  status: z.string().optional(),
  tagline: z.string().nullable().optional(),
  video: z.boolean().optional(),
  media_type: z.literal('movie').optional(),
})

export const tmdbTvMinimalSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  first_air_date: z.string().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
})

export const tmdbTvSchema = tmdbTvMinimalSchema.extend({
  episode_run_time: z.array(z.number()).optional(),
  number_of_seasons: z.number().optional(),
  seasons: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        overview: z.string(),
        air_date: z.string().nullable().optional(),
        episode_count: z.number(),
        poster_path: z.string().nullable().optional(),
        season_number: z.number(),
      }),
    )
    .optional(),
  next_episode_to_air: z
    .object({
      id: z.number(),
      name: z.string(),
      overview: z.string(),
      air_date: z.string().optional(),
      episode_number: z.number(),
      season_number: z.number(),
      runtime: z.number().nullable().optional(),
      episode_type: z.string().optional(),
      show_id: z.number().optional(),
      still_path: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  status: z.string().optional(),
  media_type: z.literal('tv').optional(),
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
    .optional(),
  tagline: z.string().nullable().optional(),
})

export const tmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
  media_type: z.literal('person').optional(),
})

export const tmdbEpisodeMinimalSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string(),
  air_date: z.string().nullable().optional(),
  episode_number: z.number(),
  season_number: z.number(),
  show_id: z.number().optional(),
  still_path: z.string().nullable().optional(),
})

export const tmdbEpisodeSchema = tmdbEpisodeMinimalSchema.extend({
  production_code: z.string().optional(),
  runtime: z.number().nullable().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
})

export const tmdbSeasonSchema = z.object({
  id: z.number(),
  _id: z.string().optional(),
  name: z.string(),
  overview: z.string(),
  air_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  season_number: z.number(),
  episodes: z.array(tmdbEpisodeSchema).optional(),
})

export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    page: z.number(),
    results: z.array(itemSchema),
    total_pages: z.number(),
    total_results: z.number(),
  })
}

export const tmdbReviewAuthorDetailsSchema = z.object({
  name: z.string(),
  username: z.string(),
  avatar_path: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
})

export const tmdbReviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  author_details: tmdbReviewAuthorDetailsSchema,
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.string(),
})

export const tmdbReviewsResponseSchema = paginated(tmdbReviewSchema)

export const tmdbProviderSchema = z.object({
  logo_path: z.string(),
  provider_id: z.number(),
  provider_name: z.string(),
  display_priority: z.number(),
})

export const tmdbWatchProvidersSchema = z.object({
  id: z.number(),
  results: z.record(
    z.string(),
    z.object({
      link: z.string().optional(),
      buy: z.array(tmdbProviderSchema).optional(),
      rent: z.array(tmdbProviderSchema).optional(),
      flatrate: z.array(tmdbProviderSchema).optional(),
      free: z.array(tmdbProviderSchema).optional(),
      ads: z.array(tmdbProviderSchema).optional(),
    }),
  ),
})

export const tmdbVideoSchema = z.object({
  iso_639_1: z.string(),
  iso_3166_1: z.string(),
  name: z.string(),
  key: z.string(),
  site: z.string(),
  size: z.number(),
  type: z.string(),
  official: z.boolean(),
  published_at: z.string(),
  id: z.string(),
})

export const tmdbVideosResponseSchema = z.object({
  id: z.number(),
  results: z.array(tmdbVideoSchema),
})

export const tmdbCastMemberSchema = z.object({
  adult: z.boolean().optional(),
  gender: z.number().optional(),
  id: z.number(),
  known_for_department: z.string().optional(),
  name: z.string(),
  original_name: z.string().optional(),
  popularity: z.number().optional(),
  profile_path: z.string().nullable().optional(),
  cast_id: z.number().optional(),
  character: z.string().optional(),
  credit_id: z.string(),
  order: z.number().optional(),
})

export const tmdbCrewMemberSchema = z.object({
  adult: z.boolean().optional(),
  gender: z.number().optional(),
  id: z.number(),
  known_for_department: z.string().optional(),
  name: z.string(),
  original_name: z.string().optional(),
  popularity: z.number().optional(),
  profile_path: z.string().nullable().optional(),
  credit_id: z.string(),
  department: z.string().optional(),
  job: z.string().optional(),
})

export const tmdbCreditsSchema = z.object({
  id: z.number(),
  cast: z.array(tmdbCastMemberSchema),
  crew: z.array(tmdbCrewMemberSchema),
})

export type TmdbMovieMinimal = z.infer<typeof tmdbMovieMinimalSchema>
export type TmdbMovie = z.infer<typeof tmdbMovieSchema>
export type TmdbTv = z.infer<typeof tmdbTvSchema>
export type TmdbTvMinimal = z.infer<typeof tmdbTvMinimalSchema>
export type TmdbPerson = z.infer<typeof tmdbPersonSchema>
export type TmdbEpisode = z.infer<typeof tmdbEpisodeSchema>
export type TmdbSeason = z.infer<typeof tmdbSeasonSchema>
export type TmdbProvider = z.infer<typeof tmdbProviderSchema>
export type TmdbWatchProviders = z.infer<typeof tmdbWatchProvidersSchema>
export type TmdbVideo = z.infer<typeof tmdbVideoSchema>
export type TmdbVideosResponse = z.infer<typeof tmdbVideosResponseSchema>
export type TmdbCastMember = z.infer<typeof tmdbCastMemberSchema>
export type TmdbCrewMember = z.infer<typeof tmdbCrewMemberSchema>
export type TmdbCredits = z.infer<typeof tmdbCreditsSchema>
export type TmdbReview = z.infer<typeof tmdbReviewSchema>
export type TmdbReviewAuthorDetails = z.infer<typeof tmdbReviewAuthorDetailsSchema>
export type TmdbReviewsResponse = z.infer<typeof tmdbReviewsResponseSchema>
