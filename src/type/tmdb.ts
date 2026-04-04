import { z } from 'zod'

export const tmdbMovieMinimalSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
})

export const tmdbMovieSchema = tmdbMovieMinimalSchema.extend({
  runtime: z.number().nullable().optional(),
  media_type: z.literal('movie').optional(),
})

export const tmdbTvMinimalSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  first_air_date: z.string().optional(),
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
    })
    .nullable()
    .optional(),
  status: z.string().optional(),
  media_type: z.literal('tv').optional(),
})

export const tmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
  media_type: z.literal('person').optional(),
})

export const tmdbMultiSearchResultSchema = z.discriminatedUnion('media_type', [
  tmdbMovieSchema.extend({ media_type: z.literal('movie') }),
  tmdbTvSchema.extend({ media_type: z.literal('tv') }),
  tmdbPersonSchema.extend({ media_type: z.literal('person') }),
])

export const tmdbEpisodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string(),
  air_date: z.string().nullable().optional(),
  episode_number: z.number(),
  season_number: z.number(),
  show_id: z.number().optional(),
  production_code: z.string().optional(),
  runtime: z.number().nullable().optional(),
  still_path: z.string().nullable().optional(),
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

export type TmdbMovieMinimal = z.infer<typeof tmdbMovieMinimalSchema>
export type TmdbMovie = z.infer<typeof tmdbMovieSchema>
export type TmdbTv = z.infer<typeof tmdbTvSchema>
export type TmdbTvMinimal = z.infer<typeof tmdbTvMinimalSchema>
export type TmdbPerson = z.infer<typeof tmdbPersonSchema>
export type TmdbMultiSearchResult = z.infer<typeof tmdbMultiSearchResultSchema>
export type TmdbEpisode = z.infer<typeof tmdbEpisodeSchema>
export type TmdbSeason = z.infer<typeof tmdbSeasonSchema>
