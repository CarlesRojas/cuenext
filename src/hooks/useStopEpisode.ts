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

  const { data: stoppedMedia, isFetching: isStoppedLoading } = useQuery({
    ...convexQuery(api.library.listStopped, { type: 'tv' }),
    enabled: clerk.isSignedIn,
  })

  const setStopped = useDbMutation(api.library.setStopped)

  const stopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => await setStopped({ type: 'tv', tmdbId: id, stopped: true }),
  })

  const unstopItem = useMutation({
    mutationFn: async ({ id }: { id: number }) => await setStopped({ type: 'tv', tmdbId: id, stopped: false }),
  })

  const toggleStopped = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isStopped = Array.isArray(stoppedMedia) && stoppedMedia.includes(id)
    const mediaKey = `tv-${id}`

    if (isStopped) {
      await unstopItem.mutateAsync({ id })
      showUndoToast(title, 'unstop', mediaKey, async () => await stopItem.mutateAsync({ id }))
    } else {
      await stopItem.mutateAsync({ id })
      showUndoToast(title, 'stop', mediaKey, async () => await unstopItem.mutateAsync({ id }))
    }
  }

  const isStopped = Array.isArray(stoppedMedia) && stoppedMedia.includes(episode.id)
  const isLoading = isStoppedLoading || stopItem.isPending || unstopItem.isPending

  return {
    isStopped,
    isStoppedLoading: isLoading,
    toggleStopped,
  }
}
