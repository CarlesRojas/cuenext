import { api } from '#/../convex/_generated/api'
import { useFollowedIds, useFollowedIdsCache } from '#/hooks/useFollowedIds'
import { useShowWatchStateCache } from '#/hooks/useShowWatchState'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useFollowEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { followedIds, isFollowedLoading } = useFollowedIds('tv')
  const isFollowed = followedIds.has(episode.id)

  const patchFollowedIds = useFollowedIdsCache()
  const { applyNextEpisode } = useShowWatchStateCache()

  const markAsFollowed = useDbMutation(api.library.follow)
  const unmarkAsFollowed = useDbMutation(api.library.unfollow)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

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
      patchFollowedIds('tv', id, true)

      // A show somebody else already tracks needs no TMDB work: the action finds the shared
      // season layout and writes this user's row from it in a single mutation.
      const refreshed = await updateNextEpisode({ tmdbId: id })
      if (refreshed) applyNextEpisode(id, refreshed)
    },
  })

  const unfollow = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await unmarkAsFollowed({ type: 'tv', tmdbId: id })
      patchFollowedIds('tv', id, false)

      const refreshed = await updateNextEpisode({ tmdbId: id })
      if (refreshed) applyNextEpisode(id, refreshed)
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
