import { api } from '#/../convex/_generated/api'
import { convexOnceKey, useConvexOnce } from '#/lib/convexOneShot'
import type { MediaType } from '#/type/media'
import { useClerk } from '@clerk/tanstack-react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface MediaUserState {
  isStopped: boolean
  isWatched: boolean
}

export function mediaUserStateKey(type: MediaType, tmdbId: number) {
  return convexOnceKey(api.media.getMediaUserState, { type, tmdbId })
}

// Every per-user flag the detail page needs for a title, in one entry. All hooks that call
// this with the same type and tmdbId share it, and the toggles below keep it current, so it
// is read once rather than subscribed to.
export function useMediaUserState(type: MediaType, tmdbId: number, enabled = true) {
  const clerk = useClerk()
  const options = useConvexOnce(api.media.getMediaUserState, { type, tmdbId })

  const { data, isFetching } = useQuery({ ...options, enabled: !!clerk.isSignedIn && enabled })

  return { userState: data, isUserStateLoading: isFetching }
}

export function useMediaUserStateCache() {
  const queryClient = useQueryClient()

  return (type: MediaType, tmdbId: number, changes: Partial<MediaUserState>) => {
    queryClient.setQueryData<MediaUserState>(mediaUserStateKey(type, tmdbId), state =>
      state ? { ...state, ...changes } : state,
    )
  }
}
