import z from 'zod'

export const USER_DATA_EXPORT_VERSION = 1

// Shape of the cuenext_{username}_data.json file. Importing a file exported from another
// account recreates the same follows, favorites, stopped titles and watch history; derived
// data (next episodes, stats) is rebuilt on the importing account.
export const UserDataExportSchema = z.object({
  app: z.literal('cuenext'),
  version: z.literal(USER_DATA_EXPORT_VERSION),
  exportedAt: z.number(),
  follows: z.array(
    z.object({
      type: z.enum(['movie', 'tv']),
      tmdbId: z.number(),
      name: z.string(),
      poster: z.string().nullable(),
      backdrop: z.string().nullable(),
      releaseDate: z.number(),
      followedAt: z.number(),
    }),
  ),
  favorites: z.array(
    z.object({
      type: z.enum(['movie', 'tv']),
      tmdbId: z.number(),
      favoritedAt: z.number(),
    }),
  ),
  stopped: z.array(
    z.object({
      tmdbId: z.number(),
      stoppedAt: z.number(),
    }),
  ),
  watchedMovies: z.array(
    z.object({
      tmdbId: z.number(),
      watchedAt: z.number(),
    }),
  ),
  watchedEpisodes: z.array(
    z.object({
      showTmdbId: z.number(),
      seasonNumber: z.number(),
      episodeNumber: z.number(),
      watchedAt: z.number(),
    }),
  ),
})

export type UserDataExport = z.infer<typeof UserDataExportSchema>
