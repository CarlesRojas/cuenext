import { api } from '#/../convex/_generated/api'
import { useFollowedIdsCache } from '#/hooks/useFollowedIds'
import { useMediaUserStateCache } from '#/hooks/useMediaUserState'
import type { EpisodeIdentifier } from '#/hooks/useShowWatchState'
import { useShowWatchStateCache } from '#/hooks/useShowWatchState'
import { useUndoToast } from '#/hooks/useUndoToast'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

interface UseWatchEpisodesProps {
  showId: number
  showName: string
  showPoster?: string | null
  showBackdrop?: string | null
}

export function useWatchEpisodes({ showId, showName, showPoster, showBackdrop }: UseWatchEpisodesProps) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const markEpisodesWatched = useDbMutation(api.watch.markMultipleEpisodesAsWatched)
  const unmarkEpisodesWatched = useDbMutation(api.watch.unmarkMultipleEpisodesAsWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const { applyEpisodes, applyNextEpisode } = useShowWatchStateCache()

  // Marking a season watched also un-stops and follows the show, so the entries holding
  // those two flags are corrected from what the mutation reports.
  const patchUserState = useMediaUserStateCache()
  const patchFollowedIds = useFollowedIdsCache()

  const watchEpisodes = useMutation({
    mutationFn: async ({ episodes }: { episodes: EpisodeIdentifier[] }) => {
      const result = await markEpisodesWatched({
        showTmdbId: showId,
        episodes,
        showName,
        showPoster: showPoster ?? null,
        showBackdrop: showBackdrop ?? null,
        releaseDate: 0,
      })

      applyEpisodes(showId, episodes, true, result.nextEpisode)
      patchUserState('tv', showId, { isStopped: false })
      patchFollowedIds('tv', showId, true)

      // The mutation already recomputed the next episode unless its season data was stale.
      if (!result.nextEpisodeRecomputed) {
        const refreshed = await updateNextEpisode({ tmdbId: showId })
        if (refreshed) applyNextEpisode(showId, refreshed)
      }

      return result
    },
  })

  const unwatchEpisodes = useMutation({
    mutationFn: async ({
      episodes,
      wasStopped,
      wasNotFollowed,
    }: {
      episodes: EpisodeIdentifier[]
      wasStopped?: boolean
      wasNotFollowed?: boolean
    }) => {
      const result = await unmarkEpisodesWatched({
        showTmdbId: showId,
        episodes,
        wasStopped,
        wasNotFollowed,
      })

      applyEpisodes(showId, episodes, false, result.nextEpisode)
      // Undoing restores whatever the mark had changed, and only that.
      if (wasStopped) patchUserState('tv', showId, { isStopped: true })
      if (wasNotFollowed) patchFollowedIds('tv', showId, false)

      if (!result.nextEpisodeRecomputed) {
        const refreshed = await updateNextEpisode({ tmdbId: showId })
        if (refreshed) applyNextEpisode(showId, refreshed)
      }
    },
  })

  const watchMultipleEpisodes = async (episodes: EpisodeIdentifier[], title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const result = await watchEpisodes.mutateAsync({ episodes })
    showUndoToast(
      title,
      'watchMultiple',
      `tv-${showId}`,
      async () =>
        await unwatchEpisodes.mutateAsync({
          episodes,
          wasStopped: result.wasStopped,
          wasNotFollowed: result.wasNotFollowed,
        }),
    )
  }

  const unwatchMultipleEpisodes = async (episodes: EpisodeIdentifier[], title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    await unwatchEpisodes.mutateAsync({ episodes })
    showUndoToast(title, 'unwatchMultiple', `tv-${showId}`, async () => await watchEpisodes.mutateAsync({ episodes }))
  }

  return {
    isWatchEpisodesLoading: watchEpisodes.isPending || unwatchEpisodes.isPending,
    watchMultipleEpisodes,
    unwatchMultipleEpisodes,
  }
}
