import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TvSectionItemMinimal } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

// All episode rows of a show share one getWatchedEpisodesForShow subscription (the show page
// already loads it with identical args, so react-query dedupes them) instead of each row
// issuing its own checkEpisodeWatched lookup. Callers that already know the watched state
// (watchlist cards, whose item is by definition the next unwatched episode) pass
// `knownIsWatched` to skip the query entirely.
export function useWatchEpisode(episode: TvSectionItemMinimal, knownIsWatched?: boolean) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: watchedEpisodes, isFetching } = useQuery({
    ...convexQuery(api.watch.getWatchedEpisodesForShow, { showTmdbId: episode.showTmdbId }),
    enabled: clerk.isSignedIn && knownIsWatched === undefined,
  })

  const isWatched =
    knownIsWatched !== undefined
      ? knownIsWatched
      : watchedEpisodes?.some(
          we => we.seasonNumber === episode.seasonNumber && we.episodeNumber === episode.episodeNumber,
        )

  const isWatchedLoading = knownIsWatched === undefined && isFetching

  const markEpisodeWatched = useDbMutation(api.watch.markEpisodeWatched)
  const unmarkEpisodeWatched = useDbMutation(api.watch.unmarkEpisodeWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const tmdbWatchlist = useAction(api.tmdbAccount.addToWatchlist)

  const watch = useMutation({
    mutationFn: async (args: Parameters<typeof markEpisodeWatched>[0]) => {
      const result = await markEpisodeWatched(args)
      // The mutation already recomputed the next episode unless its season data was stale.
      if (!result.nextEpisodeRecomputed) await updateNextEpisode({ tmdbId: args.showTmdbId })
      await tmdbWatchlist({ media: 'tv', tmdbId: args.showTmdbId, add: true })
      return result
    },
  })

  const unwatch = useMutation({
    mutationFn: async (
      args: { wasStopped?: boolean; wasNotFollowed?: boolean } & Parameters<typeof unmarkEpisodeWatched>[0],
    ) => {
      const result = await unmarkEpisodeWatched(args)
      if (!result.nextEpisodeRecomputed) await updateNextEpisode({ tmdbId: episode.showTmdbId })
      if (args.wasNotFollowed) await tmdbWatchlist({ media: 'tv', tmdbId: episode.showTmdbId, add: false })
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
            ...result,
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
