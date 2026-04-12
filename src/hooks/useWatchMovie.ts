import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { MovieSectionItem } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useWatchMovie(movie: MovieSectionItem) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isWatched, isFetching: isWatchedLoading } = useQuery(
    convexQuery(api.watch.checkMovieWatched, { tmdbId: movie.tmdbId }),
  )

  const markMovieWatched = useDbMutation(api.watch.markMovieWatched)
  const unmarkMovieWatched = useDbMutation(api.watch.unmarkMovieWatched)
  const tmdbWatchlist = useAction(api.tmdbAccount.addToWatchlist)

  const watch = useMutation({
    mutationFn: async (args: Parameters<typeof markMovieWatched>[0]) => {
      const result = await markMovieWatched(args)
      await tmdbWatchlist({ media: 'movie', tmdbId: args.tmdbId, add: true })
      return result
    },
  })

  const unwatch = useMutation({
    mutationFn: async (args: { wasNotFollowed?: boolean } & Parameters<typeof unmarkMovieWatched>[0]) => {
      await unmarkMovieWatched(args)
      if (args.wasNotFollowed) await tmdbWatchlist({ media: 'movie', tmdbId: args.tmdbId, add: false })
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
