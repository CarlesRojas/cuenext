import { api } from '#/../convex/_generated/api'
import { convexOnceKey, useConvexOnce } from '#/lib/convexOneShot'
import { useClerk } from '@clerk/tanstack-react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FunctionReturnType } from 'convex/server'

export type ShowWatchState = FunctionReturnType<typeof api.watch.getShowWatchState>
export type NextEpisodeState = ShowWatchState['nextEpisode']

export interface EpisodeIdentifier {
  seasonNumber: number
  episodeNumber: number
}

export function showWatchStateKey(showTmdbId: number) {
  return convexOnceKey(api.watch.getShowWatchState, { showTmdbId })
}

const episodeKey = (episode: EpisodeIdentifier) => `${episode.seasonNumber}-${episode.episodeNumber}`

// Which episodes of a show the signed-in user has watched, and which one they are up to.
// Both used to be live subscriptions, and both re-ran on every single episode toggled - to
// report a change this browser had just made. They are read once now, and the watch
// mutations hand back the recomputed state for the cache below.
export function useShowWatchState(showTmdbId: number, enabled = true) {
  const clerk = useClerk()
  const options = useConvexOnce(api.watch.getShowWatchState, { showTmdbId })

  const { data, isFetching } = useQuery({
    ...options,
    enabled: enabled && !!clerk.isSignedIn && !!showTmdbId,
  })

  return {
    watchedEpisodes: data?.watched,
    nextEpisode: data?.nextEpisode ?? null,
    isWatchStateLoading: isFetching,
  }
}

export function useShowWatchStateCache() {
  const queryClient = useQueryClient()

  // `nextEpisode` comes back from the mutation that caused the change, so the client never
  // has to reproduce the server's next-episode logic or read it back.
  const applyEpisodes = (
    showTmdbId: number,
    episodes: EpisodeIdentifier[],
    watched: boolean,
    nextEpisode?: NextEpisodeState,
  ) => {
    queryClient.setQueryData<ShowWatchState>(showWatchStateKey(showTmdbId), state => {
      if (!state) return state

      const changedKeys = new Set(episodes.map(episodeKey))

      const watchedEpisodes = watched
        ? [
            ...state.watched,
            ...episodes
              .filter(episode => !state.watched.some(existing => episodeKey(existing) === episodeKey(episode)))
              .map(episode => ({ seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber })),
          ]
        : state.watched.filter(existing => !changedKeys.has(episodeKey(existing)))

      return { watched: watchedEpisodes, nextEpisode: nextEpisode ?? state.nextEpisode }
    })
  }

  // The season layout can only be refreshed by the action, which returns the row it wrote.
  const applyNextEpisode = (showTmdbId: number, nextEpisode: NextEpisodeState) => {
    queryClient.setQueryData<ShowWatchState>(showWatchStateKey(showTmdbId), state =>
      state ? { ...state, nextEpisode } : state,
    )
  }

  const invalidate = (showTmdbId: number) => {
    queryClient.invalidateQueries({ queryKey: showWatchStateKey(showTmdbId) })
  }

  return { applyEpisodes, applyNextEpisode, invalidate }
}
