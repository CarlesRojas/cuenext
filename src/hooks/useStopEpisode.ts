import { api } from '#/../convex/_generated/api'
import { useMediaUserState, useMediaUserStateCache } from '#/hooks/useMediaUserState'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useStopEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { userState, isUserStateLoading } = useMediaUserState('tv', episode.id)
  const isStopped = userState?.isStopped
  const isStoppedLoading = isUserStateLoading

  const setStopped = useDbMutation(api.stopped.setStopped)
  const setUnstopped = useDbMutation(api.stopped.setUnstopped)
  const patchUserState = useMediaUserStateCache()

  const stopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await setStopped({ tmdbId: id })
      patchUserState('tv', id, { isStopped: true })
    },
  })

  const unstopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await setUnstopped({ tmdbId: id })
      patchUserState('tv', id, { isStopped: false })
    },
  })

  const toggleStopped = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `tv-${id}`

    if (isStopped) {
      await unstopItem.mutateAsync({ id })
      showUndoToast(title, 'unstop', mediaKey, async () => await stopItem.mutateAsync({ id }))
    } else {
      await stopItem.mutateAsync({ id })
      showUndoToast(title, 'stop', mediaKey, async () => await unstopItem.mutateAsync({ id }))
    }
  }

  const isLoading = isStoppedLoading || stopItem.isPending || unstopItem.isPending

  return {
    isStopped,
    isStoppedLoading: isLoading,
    toggleStopped,
  }
}
