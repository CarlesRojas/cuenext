import { api } from '#/../convex/_generated/api'
import { useConvexOnce } from '#/lib/convexOneShot'
import type { MediaType } from '#/type/media'
import { useClerk } from '@clerk/tanstack-react-start'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

export interface MyRating {
  rating: number
  hasContent: boolean
}

// Every rating the signed-in user has given, keyed by title. Poster grids can hold dozens
// of covers, and the detail page has a rate button of its own, so they all read from this
// one entry rather than each opening a query per title.
//
// Only the user writes their own ratings, and the review actions patch this in place after
// they do, so it is read once instead of subscribed to.
export function useMyRatings() {
  const clerk = useClerk()
  const options = useConvexOnce(api.reviews.getMyRatings, {})

  const { data } = useQuery({ ...options, enabled: !!clerk.isSignedIn })

  return useMemo(() => {
    const ratings = new Map<string, MyRating>()
    for (const entry of data ?? [])
      ratings.set(`${entry.type}-${entry.tmdbId}`, { rating: entry.rating, hasContent: entry.hasContent })

    return ratings
  }, [data])
}

export function useMyRating(type: MediaType, tmdbId: number) {
  const ratings = useMyRatings()

  return ratings.get(`${type}-${tmdbId}`)?.rating ?? null
}

// Whether the user's row for this title carries a written review, which is what decides
// between offering to write one and offering to edit it.
export function useHasWrittenReview(type: MediaType, tmdbId: number) {
  const ratings = useMyRatings()

  return ratings.get(`${type}-${tmdbId}`)?.hasContent ?? false
}
