import { api } from '#/../convex/_generated/api'
import { useFollowedIdsCache } from '#/hooks/useFollowedIds'
import { useMediaUserState, useMediaUserStateCache } from '#/hooks/useMediaUserState'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { MovieSectionItem } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

// Section items already carry watchedAt, so watchlist cards derive the watched state
// locally by passing `knownIsWatched` and skip the query; the detail page (which builds
// the item from TMDB data) leaves it undefined and subscribes to the shared per-title
// user-state query.
export function useWatchMovie(movie: MovieSectionItem, knownIsWatched?: boolean) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { userState, isUserStateLoading } = useMediaUserState('movie', movie.tmdbId, knownIsWatched === undefined)
  const isWatched = knownIsWatched !== undefined ? knownIsWatched : userState?.isWatched
  const isWatchedLoading = knownIsWatched === undefined && isUserStateLoading

  const markMovieWatched = useDbMutation(api.watch.markMovieWatched)
  const unmarkMovieWatched = useDbMutation(api.watch.unmarkMovieWatched)
  const patchUserState = useMediaUserStateCache()
  // Watching a movie follows it too when it was not already followed.
  const patchFollowedIds = useFollowedIdsCache()

  const watch = useMutation({
    mutationFn: async (args: Parameters<typeof markMovieWatched>[0]) => {
      const result = await markMovieWatched(args)
      patchUserState('movie', args.tmdbId, { isWatched: true })
      patchFollowedIds('movie', args.tmdbId, true)

      return result
    },
  })

  const unwatch = useMutation({
    mutationFn: async (args: { wasNotFollowed?: boolean } & Parameters<typeof unmarkMovieWatched>[0]) => {
      await unmarkMovieWatched(args)
      patchUserState('movie', args.tmdbId, { isWatched: false })
      if (args.wasNotFollowed) patchFollowedIds('movie', args.tmdbId, false)
    },
  })

  const onToggleWatch = async () => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `movie-${movie.tmdbId}`

    if (isWatched) {
      await unwatch.mutateAsync({ tmdbId: movie.tmdbId })

      showUndoToast(
        movie.name,
        'unwatch',
        mediaKey,
        async () =>
          await watch.mutateAsync({
            tmdbId: movie.tmdbId,
            name: movie.name,
            poster: movie.poster ?? null,
            backdrop: movie.backdrop ?? null,
            releaseDate: movie.releaseDate,
          }),
      )
    } else {
      const result = await watch.mutateAsync({
        tmdbId: movie.tmdbId,
        name: movie.name,
        poster: movie.poster ?? null,
        backdrop: movie.backdrop ?? null,
        releaseDate: movie.releaseDate,
      })

      showUndoToast(
        movie.name,
        'watch',
        mediaKey,
        async () =>
          await unwatch.mutateAsync({
            ...result,
            tmdbId: movie.tmdbId,
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
