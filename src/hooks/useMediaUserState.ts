import { api } from '#/../convex/_generated/api'
import type { MediaType } from '#/type/media'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'

// One subscription per title covering every per-user flag the detail page needs. All hooks
// that call this with the same type and tmdbId share a single query.
export function useMediaUserState(type: MediaType, tmdbId: number, enabled = true) {
  const clerk = useClerk()

  const { data, isFetching } = useQuery({
    ...convexQuery(api.media.getMediaUserState, { type, tmdbId }),
    enabled: clerk.isSignedIn && enabled,
  })

  return { userState: data, isUserStateLoading: isFetching }
}
