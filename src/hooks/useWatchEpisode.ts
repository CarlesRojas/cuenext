import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TvSectionItemMinimal } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useWatchEpisode(episode: TvSectionItemMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: watchedEpisodes, isFetching: isWatchedLoading } = useQuery({
    ...convexQuery(api.watch.getWatchedEpisodesForShow, { showTmdbId: episode.showTmdbId }),
    enabled: clerk.isSignedIn,
  })

  const markEpisodeWatched = useDbMutation(api.watch.markEpisodeWatched)
  const unmarkEpisodeWatched = useDbMutation(api.watch.unmarkEpisodeWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const watch = useMutation({
    mutationFn: async (args: Parameters<typeof markEpisodeWatched>[0]) => {
      const result = await markEpisodeWatched(args)
      await updateNextEpisode({ tmdbId: args.showTmdbId })
      return result
    },
  })

  const unwatch = useMutation({
    mutationFn: async ({
      wasStopped,
      wasNotFollowed,
      ...args
    }: { wasStopped?: boolean; wasNotFollowed?: boolean } & Parameters<typeof unmarkEpisodeWatched>[0]) => {
      await unmarkEpisodeWatched(args)
      await updateNextEpisode({ tmdbId: episode.showTmdbId })
    },
  })

  const onToggleWatch = async () => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isWatched =
      Array.isArray(watchedEpisodes) &&
      watchedEpisodes.some(e => e.seasonNumber === episode.seasonNumber && e.episodeNumber === episode.episodeNumber)

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
      })

      showUndoToast(
        title,
        'watch',
        mediaKey,
        async () =>
          await unwatch.mutateAsync({
            ...result,
            showTmdbId: episode.showTmdbId,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
          }),
      )
    }
  }

  const isWatched =
    Array.isArray(watchedEpisodes) &&
    watchedEpisodes.some(e => e.seasonNumber === episode.seasonNumber && e.episodeNumber === episode.episodeNumber)
  const isLoading = isWatchedLoading || watch.isPending || unwatch.isPending

  return {
    isWatched,
    isWatchedLoading: isLoading,
    onToggleWatch,
  }
}
