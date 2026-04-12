import type z from 'zod'
import { paginated, tmdbMovieMinimalSchema, tmdbTvMinimalSchema } from './tmdb'

export const tmdbWatchlistTvResponseSchema = paginated(tmdbTvMinimalSchema)

export const tmdbWatchlistMoviesResponseSchema = paginated(tmdbMovieMinimalSchema)

export const tmdbFavoritesTvResponseSchema = paginated(tmdbTvMinimalSchema)

export const tmdbFavoritesMoviesResponseSchema = paginated(tmdbMovieMinimalSchema)

export type TmdbWatchlistTvResponse = z.infer<typeof tmdbWatchlistTvResponseSchema>
export type TmdbWatchlistMoviesResponse = z.infer<typeof tmdbWatchlistMoviesResponseSchema>
export type TmdbFavoritesTvResponse = z.infer<typeof tmdbFavoritesTvResponseSchema>
export type TmdbFavoritesMoviesResponse = z.infer<typeof tmdbFavoritesMoviesResponseSchema>
