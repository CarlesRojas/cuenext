import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TvSectionItem } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useWatchEpisode(episode: TvSectionItem) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isWatched, isFetching: isWatchedLoading } = useQuery({
    ...convexQuery(api.progress.checkEpisodeWatched, {
      showTmdbId: episode.tmdbId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    }),
  })

  const markEpisodeWatched = useDbMutation(api.progress.markEpisodeWatched)
  const unmarkEpisodeWatched = useDbMutation(api.progress.unmarkEpisodeWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const watch = useMutation({
    mutationFn: async () => {
      const wasManuallyStopped = await markEpisodeWatched({
        showTmdbId: episode.tmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      })
      await updateNextEpisode({ tmdbId: episode.tmdbId })
      return wasManuallyStopped
    },
  })

  const unwatch = useMutation({
    mutationFn: async ({ wasManuallyStopped }: { wasManuallyStopped?: boolean }) => {
      await unmarkEpisodeWatched({
        showTmdbId: episode.tmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        wasManuallyStopped,
      })
      await updateNextEpisode({ tmdbId: episode.tmdbId })
    },
  })

  const handleToggleWatch = async () => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const title = `S${episode.seasonNumber + 1} E${episode.episodeNumber + 1} of ${episode.name}`
    const mediaKey = `tv-${episode.tmdbId}`

    if (isWatched) {
      await unwatch.mutateAsync({})
      showUndoToast(title, 'unwatch', mediaKey, async () => await watch.mutateAsync())
    } else {
      const wasManuallyStopped = await watch.mutateAsync()
      showUndoToast(
        title,
        'watch',
        mediaKey,
        async () => await unwatch.mutateAsync({ wasManuallyStopped: wasManuallyStopped ?? undefined }),
      )
    }
  }

  const isLoading = isWatchedLoading || watch.isPending || unwatch.isPending

  return {
    isWatched,
    isWatchedLoading: isLoading,
    handleToggleWatch,
  }
}
