import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

interface UseWatchEpisodesProps {
  showId: number
}

interface EpisodeIdentifier {
  seasonNumber: number
  episodeNumber: number
}

export function useWatchEpisodes({ showId }: UseWatchEpisodesProps) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const markEpisodesWatched = useDbMutation(api.watch.markMultipleEpisodesAsWatched)
  const unmarkEpisodesWatched = useDbMutation(api.watch.unmarkMultipleEpisodesAsWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const watchEpisodes = useMutation({
    mutationFn: async ({ episodes }: { episodes: EpisodeIdentifier[] }) => {
      const wasStopped = await markEpisodesWatched({
        showTmdbId: showId,
        episodes,
      })

      await updateNextEpisode({ tmdbId: showId })
      return wasStopped
    },
  })

  const unwatchEpisodes = useMutation({
    mutationFn: async ({ episodes, wasStopped }: { episodes: EpisodeIdentifier[]; wasStopped?: boolean }) => {
      await unmarkEpisodesWatched({
        showTmdbId: showId,
        episodes,
        wasStopped,
      })

      await updateNextEpisode({ tmdbId: showId })
    },
  })

  const watchMultipleEpisodes = async (episodes: EpisodeIdentifier[], title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const wasStopped = await watchEpisodes.mutateAsync({ episodes })
    showUndoToast(
      title,
      'watchMultiple',
      `tv-${showId}`,
      async () => await unwatchEpisodes.mutateAsync({ episodes, wasStopped }),
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
