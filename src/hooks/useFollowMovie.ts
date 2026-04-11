import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbMovieMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useConvex, useMutation as useDbMutation } from 'convex/react'
import type { PaginationResult } from 'convex/server'

export function useFollowMovie(movie: TmdbMovieMinimal) {
  const clerk = useClerk()
  const convex = useConvex()
  const { showUndoToast } = useUndoToast()

  const { data: followedMedia, isFetching: isFollowedLoading } = useQuery({
    queryKey: ['followed-movie'],
    queryFn: async () => {
      const allFollows: number[] = []
      let continueCursor: string | null = null
      let isDone = false

      while (!isDone) {
        const result: PaginationResult<number> = await convex.query(api.library.listFollowed, {
          type: 'movie',
          paginationOpts: { numItems: 100, cursor: continueCursor },
        })

        continueCursor = result.continueCursor
        isDone = result.isDone

        allFollows.push(...result.page)
      }

      return allFollows
    },
    enabled: clerk.isSignedIn,
  })

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

    const isFollowing = Array.isArray(followedMedia) && followedMedia.includes(id)
    const mediaKey = `movie-${id}`

    if (isFollowing) {
      await unfollow.mutateAsync({ id })
      showUndoToast(title, 'unfollow', mediaKey, async () => await follow.mutateAsync({ id }))
    } else {
      await follow.mutateAsync({ id })
      showUndoToast(title, 'follow', mediaKey, async () => await unfollow.mutateAsync({ id }))
    }
  }

  const isFollowed = Array.isArray(followedMedia) && followedMedia.includes(movie.id)
  const isLoading = isFollowedLoading || follow.isPending || unfollow.isPending

  return {
    isFollowed,
    isFollowedLoading: isLoading,
    toggleFollow,
  }
}
