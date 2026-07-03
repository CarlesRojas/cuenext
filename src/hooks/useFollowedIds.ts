import { api } from '#/../convex/_generated/api'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

// Loads the user's followed tmdbIds for a type with a single query. All cards of the
// same type call this with identical args, so react-query dedupes them into one shared
// subscription instead of one checkIsFollowed lookup per card.
export function useFollowedIds(type: 'movie' | 'tv') {
  const clerk = useClerk()

  const { data, isFetching } = useQuery({
    ...convexQuery(api.library.listFollowedIds, { type }),
    enabled: clerk.isSignedIn,
  })

  const followedIds = useMemo(() => new Set(data ?? []), [data])

  return { followedIds, isFollowedLoading: isFetching }
}
