import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useStopEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isStopped, isFetching: isStoppedLoading } = useQuery({
    ...convexQuery(api.stopped.checkIsStopped, { tmdbId: episode.id }),
    enabled: clerk.isSignedIn,
  })

  const setStopped = useDbMutation(api.stopped.setStopped)
  const setUnstopped = useDbMutation(api.stopped.setUnstopped)

  const stopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => await setStopped({ tmdbId: id }),
  })

  const unstopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => await setUnstopped({ tmdbId: id }),
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
