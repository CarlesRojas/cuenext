import { api } from '#/../convex/_generated/api'
import { useFollowedIdsCache } from '#/hooks/useFollowedIds'
import { useMediaUserStateCache } from '#/hooks/useMediaUserState'
import { useShowWatchState, useShowWatchStateCache } from '#/hooks/useShowWatchState'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TvSectionItemMinimal } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

// All episode rows of a show share one show-watch-state entry (the show page already loads
// it with identical args, so react-query dedupes them) instead of each row issuing its own
// per-episode lookup. Callers that already know the watched state (watchlist cards, whose
// item is by definition the next unwatched episode) pass `knownIsWatched` to skip it.
export function useWatchEpisode(episode: TvSectionItemMinimal, knownIsWatched?: boolean) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { watchedEpisodes, isWatchStateLoading } = useShowWatchState(episode.showTmdbId, knownIsWatched === undefined)
  const { applyEpisodes, applyNextEpisode } = useShowWatchStateCache()

  // Marking an episode watched also un-stops the show and follows it if it was not already,
  // so the entries holding those two flags are corrected from what the mutation reports.
  const patchUserState = useMediaUserStateCache()
  const patchFollowedIds = useFollowedIdsCache()

  const isWatched =
    knownIsWatched !== undefined
      ? knownIsWatched
      : watchedEpisodes?.some(
          we => we.seasonNumber === episode.seasonNumber && we.episodeNumber === episode.episodeNumber,
        )

  const isWatchedLoading = knownIsWatched === undefined && isWatchStateLoading

  const markEpisodeWatched = useDbMutation(api.watch.markEpisodeWatched)
  const unmarkEpisodeWatched = useDbMutation(api.watch.unmarkEpisodeWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const watch = useMutation({
    mutationFn: async (args: Parameters<typeof markEpisodeWatched>[0]) => {
      const result = await markEpisodeWatched(args)

      // The mutation returns the recomputed next episode, so the cache is updated from its
      // answer instead of re-reading the show's state.
      applyEpisodes(args.showTmdbId, [args], true, result.nextEpisode)
      patchUserState('tv', args.showTmdbId, { isStopped: false })
      patchFollowedIds('tv', args.showTmdbId, true)

      // Unless its season data was stale, in which case the action refreshes it.
      if (!result.nextEpisodeRecomputed) {
        const refreshed = await updateNextEpisode({ tmdbId: args.showTmdbId })
        if (refreshed) applyNextEpisode(args.showTmdbId, refreshed)
      }

      return result
    },
  })

  const unwatch = useMutation({
    mutationFn: async (
      args: { wasStopped?: boolean; wasNotFollowed?: boolean } & Parameters<typeof unmarkEpisodeWatched>[0],
    ) => {
      const result = await unmarkEpisodeWatched(args)

      applyEpisodes(episode.showTmdbId, [args], false, result.nextEpisode)
      // Undoing a watch restores whatever the mark had changed, and only that.
      if (args.wasStopped) patchUserState('tv', episode.showTmdbId, { isStopped: true })
      if (args.wasNotFollowed) patchFollowedIds('tv', episode.showTmdbId, false)

      if (!result.nextEpisodeRecomputed) {
        const refreshed = await updateNextEpisode({ tmdbId: episode.showTmdbId })
        if (refreshed) applyNextEpisode(episode.showTmdbId, refreshed)
      }
    },
  })

  const onToggleWatch = async () => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const title = `S${episode.seasonNumber + 1} E${episode.episodeNumber + 1} of ${episode.name}`
    const mediaKey = `tv-${episode.showTmdbId}`

    if (isWatched) {
      await unwatch.mutateAsync({
        showTmdbId: episode.showTmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      })

      showUndoToast(
        title,
        'unwatch',
        mediaKey,
        async () =>
          await watch.mutateAsync({
            showTmdbId: episode.showTmdbId,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            showName: episode.name,
            showPoster: episode.poster ?? null,
            showBackdrop: episode.backdrop ?? null,
            releaseDate: 0,
          }),
      )
    } else {
      const result = await watch.mutateAsync({
        showTmdbId: episode.showTmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        showName: episode.name,
        showPoster: episode.poster ?? null,
        showBackdrop: episode.backdrop ?? null,
        releaseDate: 0,
      })

      showUndoToast(
        title,
        'watch',
        mediaKey,
        async () =>
          await unwatch.mutateAsync({
            wasStopped: result.wasStopped,
            wasNotFollowed: result.wasNotFollowed,
            showTmdbId: episode.showTmdbId,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
          }),
      )
    }
  }

  const isLoading = isWatchedLoading || watch.isPending || unwatch.isPending

  return {
    isWatched,
    isWatchedLoading: isLoading,
    onToggleWatch,
  }
}
