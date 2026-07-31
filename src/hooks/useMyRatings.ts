import { api } from '#/../convex/_generated/api'
import type { MediaType } from '#/type/media'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'

// Every rating the signed-in user has given, keyed by title. Poster grids can hold dozens
// of covers, so they all read their rating from this one shared subscription rather than
// each opening its own.
export function useMyRatings() {
  const clerk = useClerk()

  const { data } = useQuery({ ...convexQuery(api.reviews.getMyRatings, {}), enabled: !!clerk.isSignedIn })

  const ratings = new Map<string, number>()
  for (const rating of data ?? []) ratings.set(`${rating.type}-${rating.tmdbId}`, rating.rating)

  return ratings
}

export function useMyRating(type: MediaType, tmdbId: number) {
  const ratings = useMyRatings()

  return ratings.get(`${type}-${tmdbId}`) ?? null
}
