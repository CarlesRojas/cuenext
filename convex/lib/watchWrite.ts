import type { MutationCtx } from '../_generated/server'
import { recomputeNextEpisodeInDb } from './nextEpisodeCompute'
import { applyStatsDelta, getEpisodeRuntime, getMovieRuntime } from './statsDelta'

// The mark-watched bodies of the watch mutations, parameterized by userId so the widget's
// HTTP actions (which authenticate with a widget token instead of a Clerk identity) can
// run the exact same logic. The public mutations resolve the user with requireUser and
// delegate here, so the two paths can't drift.

export interface MarkEpisodeWatchedArgs {
  showTmdbId: number
  seasonNumber: number
  episodeNumber: number
  showName: string
  showPoster: string | null
  showBackdrop: string | null
  releaseDate: number
  watchedAt?: number
}

export async function markEpisodeWatchedForUser(
  context: MutationCtx,
  userId: string,
  { showName, showPoster, showBackdrop, watchedAt, ...args }: MarkEpisodeWatchedArgs,
) {
  const watchTimestamp = watchedAt ?? Date.now()

  const existing = await context.db
    .query('episode')
    .withIndex('by_user_show_season_episode', q =>
      q
        .eq('userId', userId)
        .eq('showTmdbId', args.showTmdbId)
        .eq('seasonNumber', args.seasonNumber)
        .eq('episodeNumber', args.episodeNumber),
    )
    .unique()

  if (!existing) {
    await context.db.insert('episode', {
      userId,
      watchedAt: watchTimestamp,
      showTmdbId: args.showTmdbId,
      seasonNumber: args.seasonNumber,
      episodeNumber: args.episodeNumber,
    })

    const runtime = await getEpisodeRuntime(context, args.showTmdbId, args.seasonNumber, args.episodeNumber)
    await applyStatsDelta(context, userId, { episodesWatchedCount: 1, showTimeMinutes: runtime })
  }

  const stoppedEntry = await context.db
    .query('stopped')
    .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.showTmdbId))
    .unique()

  const wasStopped = !!stoppedEntry

  if (stoppedEntry) await context.db.delete(stoppedEntry._id)

  const followEntry = await context.db
    .query('follow')
    .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'tv').eq('tmdbId', args.showTmdbId))
    .unique()

  const wasNotFollowed = !followEntry

  if (wasNotFollowed)
    await context.db.insert('follow', {
      userId,
      type: 'tv' as const,
      tmdbId: args.showTmdbId,
      name: showName,
      poster: showPoster,
      backdrop: showBackdrop,
      followedAt: watchTimestamp,
      releaseDate: args.releaseDate,
    })

  const nextEpisodeRecomputed = await recomputeNextEpisodeInDb(context, userId, args.showTmdbId)

  return { wasStopped, wasNotFollowed, nextEpisodeRecomputed }
}

export interface MarkMovieWatchedArgs {
  tmdbId: number
  name: string
  poster: string | null
  backdrop: string | null
  releaseDate: number
  watchedAt?: number
}

export async function markMovieWatchedForUser(
  context: MutationCtx,
  userId: string,
  { name, poster, backdrop, watchedAt, ...args }: MarkMovieWatchedArgs,
) {
  const watchTimestamp = watchedAt ?? Date.now()

  const existing = await context.db
    .query('movie')
    .withIndex('by_user_tmdbId', q => q.eq('userId', userId).eq('tmdbId', args.tmdbId))
    .unique()

  if (!existing) {
    await context.db.insert('movie', { userId, tmdbId: args.tmdbId, watchedAt: watchTimestamp })

    const runtime = await getMovieRuntime(context, args.tmdbId)
    await applyStatsDelta(context, userId, { moviesWatchedCount: 1, movieTimeMinutes: runtime })
  }

  const followEntry = await context.db
    .query('follow')
    .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', 'movie').eq('tmdbId', args.tmdbId))
    .unique()

  const wasNotFollowed = !followEntry

  if (wasNotFollowed)
    await context.db.insert('follow', {
      userId,
      type: 'movie' as const,
      tmdbId: args.tmdbId,
      name,
      poster,
      backdrop,
      followedAt: watchTimestamp,
      releaseDate: args.releaseDate,
    })

  return { wasNotFollowed }
}
