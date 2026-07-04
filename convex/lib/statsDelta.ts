import type { MutationCtx } from '../_generated/server'

interface StatsDelta {
  episodesWatchedCount?: number
  showTimeMinutes?: number
  moviesWatchedCount?: number
  movieTimeMinutes?: number
}

// Applies an incremental change to the user's materialized stats row. When no row exists
// the delta is intentionally dropped: the baseline hasn't been computed yet, and the first
// stats.recomputeStats run will count this change as part of its full scan.
export async function applyStatsDelta(context: MutationCtx, userId: string, delta: StatsDelta) {
  const stats = await context.db
    .query('userStats')
    .withIndex('by_user', q => q.eq('userId', userId))
    .unique()

  if (!stats) return

  await context.db.patch(stats._id, {
    episodesWatchedCount: Math.max(0, stats.episodesWatchedCount + (delta.episodesWatchedCount ?? 0)),
    showTimeMinutes: Math.max(0, stats.showTimeMinutes + (delta.showTimeMinutes ?? 0)),
    moviesWatchedCount: Math.max(0, stats.moviesWatchedCount + (delta.moviesWatchedCount ?? 0)),
    movieTimeMinutes: Math.max(0, stats.movieTimeMinutes + (delta.movieTimeMinutes ?? 0)),
  })
}

// Missing runtime rows count as 0, matching the full recompute (which also sums 0 for
// episodes whose runtime TMDB doesn't provide).
export async function getEpisodeRuntime(
  context: MutationCtx,
  showTmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<number> {
  const info = await context.db
    .query('episodeInfo')
    .withIndex('by_showTmdbId_season_episode', q =>
      q.eq('showTmdbId', showTmdbId).eq('seasonNumber', seasonNumber).eq('episodeNumber', episodeNumber),
    )
    .unique()

  return info?.runtime ?? 0
}

export async function getMovieRuntime(context: MutationCtx, tmdbId: number): Promise<number> {
  const info = await context.db
    .query('movieInfo')
    .withIndex('by_tmdbId', q => q.eq('tmdbId', tmdbId))
    .unique()

  return info?.runtime ?? 0
}
