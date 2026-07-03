import { api } from '#/../convex/_generated/api'
import { useFollowedIds } from '#/hooks/useFollowedIds'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbMovieMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useFollowMovie(movie: TmdbMovieMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { followedIds, isFollowedLoading } = useFollowedIds('movie')
  const isFollowed = followedIds.has(movie.id)

  const markAsFollowed = useDbMutation(api.library.follow)
  const unmarkAsFollowed = useDbMutation(api.library.unfollow)

  const follow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await markAsFollowed({
        type: 'movie',
        tmdbId: id,
        name: movie.title,
        poster: movie.poster_path ?? null,
        backdrop: movie.backdrop_path ?? null,
        releaseDate: new Date(movie.release_date).getTime(),
      })
    },
  })

  const unfollow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await unmarkAsFollowed({ type: 'movie', tmdbId: id })
    },
  })

  const toggleFollow = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `movie-${id}`

    if (isFollowed) {
      await unfollow.mutateAsync({ id })
      showUndoToast(title, 'unfollow', mediaKey, async () => await follow.mutateAsync({ id }))
    } else {
      await follow.mutateAsync({ id })
      showUndoToast(title, 'follow', mediaKey, async () => await unfollow.mutateAsync({ id }))
    }
  }

  const isLoading = isFollowedLoading || follow.isPending || unfollow.isPending

  return {
    isFollowed,
    isFollowedLoading: isLoading,
    toggleFollow,
  }
}
