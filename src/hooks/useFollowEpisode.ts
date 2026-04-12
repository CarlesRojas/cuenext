import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useFollowEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isFollowed, isFetching: isFollowedLoading } = useQuery({
    ...convexQuery(api.library.checkIsFollowed, { type: 'tv', tmdbId: episode.id }),
    enabled: clerk.isSignedIn,
  })

  const markAsFollowed = useDbMutation(api.library.follow)
  const unmarkAsFollowed = useDbMutation(api.library.unfollow)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const tmdbWatchlist = useAction(api.tmdbAccount.addToWatchlist)

  const follow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await markAsFollowed({
        type: 'tv',
        tmdbId: id,
        name: episode.name,
        poster: episode.poster_path ?? null,
        backdrop: episode.backdrop_path ?? null,
        releaseDate: 0,
      })
      await updateNextEpisode({ tmdbId: id })
      await tmdbWatchlist({ media: 'tv', tmdbId: id, add: true })
    },
  })

  const unfollow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await unmarkAsFollowed({ type: 'tv', tmdbId: id })
      await updateNextEpisode({ tmdbId: id })
      await tmdbWatchlist({ media: 'tv', tmdbId: id, add: false })
    },
  })

  const toggleFollow = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `tv-${id}`

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
