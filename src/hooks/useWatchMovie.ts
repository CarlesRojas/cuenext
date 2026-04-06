import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { MovieSectionItem } from '#/type/section'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useWatchMovie(movie: MovieSectionItem) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isWatched, isFetching: isWatchedLoading } = useQuery(
    convexQuery(api.progress.checkMovieWatched, { tmdbId: movie.tmdbId }),
  )

  const markMovieWatched = useDbMutation(api.progress.markMovieWatched)
  const unmarkMovieWatched = useDbMutation(api.progress.unmarkMovieWatched)

  const watch = useMutation({
    mutationFn: async () => {
      await markMovieWatched({ tmdbId: movie.tmdbId })
    },
  })

  const unwatch = useMutation({
    mutationFn: async () => {
      await unmarkMovieWatched({ tmdbId: movie.tmdbId })
    },
  })

  const handleToggleWatch = async () => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `movie-${movie.tmdbId}`

    if (isWatched) {
      await unwatch.mutateAsync()
      showUndoToast(movie.name, 'unwatch', mediaKey, async () => await watch.mutateAsync())
    } else {
      await watch.mutateAsync()
      showUndoToast(movie.name, 'watch', mediaKey, async () => await unwatch.mutateAsync())
    }
  }

  const isLoading = isWatchedLoading || watch.isPending || unwatch.isPending

  return {
    isWatched,
    isWatchedLoading: isLoading,
    handleToggleWatch,
  }
}
