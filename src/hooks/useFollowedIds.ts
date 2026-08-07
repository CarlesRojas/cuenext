import { api } from '#/../convex/_generated/api'
import { convexOnceKey, useConvexOnce } from '#/lib/convexOneShot'
import { useClerk } from '@clerk/tanstack-react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

export function followedIdsKey(type: 'movie' | 'tv') {
  return convexOnceKey(api.library.listFollowedIds, { type })
}

// The user's followed tmdbIds for a type, read once. All cards of the same type call this
// with identical args, so react-query dedupes them into one shared entry instead of one
// checkIsFollowed lookup per card.
//
// Following is something only this user does, and the toggle below patches the set as it
// happens, so a live subscription would only be paying to be told what we just did.
export function useFollowedIds(type: 'movie' | 'tv') {
  const clerk = useClerk()
  const options = useConvexOnce(api.library.listFollowedIds, { type })

  const { data, isFetching } = useQuery({ ...options, enabled: !!clerk.isSignedIn })

  const followedIds = useMemo(() => new Set(data ?? []), [data])

  return { followedIds, isFollowedLoading: isFetching }
}

export function useFollowedIdsCache() {
  const queryClient = useQueryClient()

  return (type: 'movie' | 'tv', tmdbId: number, isFollowed: boolean) => {
    queryClient.setQueryData<number[]>(followedIdsKey(type), ids => {
      if (!ids) return ids

      if (isFollowed) return ids.includes(tmdbId) ? ids : [...ids, tmdbId]

      return ids.filter(id => id !== tmdbId)
    })
  }
}
