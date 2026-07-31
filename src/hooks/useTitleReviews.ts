import { api } from '#/../convex/_generated/api'
import type { MediaType } from '#/type/media'
import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'
import { toast } from 'sonner'

export const MAX_REVIEW_LENGTH = 2000

export function titleReviewsQuery(type: MediaType, tmdbId: number) {
  return convexQuery(api.reviews.getTitleReviews, { type, tmdbId })
}

// CueNext reviews and rating totals for one title. Reviews are public, so this runs for
// signed-out visitors too; every component on the detail page that calls this with the same
// title shares a single subscription.
export function useTitleReviews(type: MediaType, tmdbId: number, enabled = true) {
  const { data, isPending } = useQuery({ ...titleReviewsQuery(type, tmdbId), enabled: enabled && !!tmdbId })

  return {
    ratingCount: data?.ratingCount ?? 0,
    ratingSum: data?.ratingSum ?? 0,
    myRating: data?.myRating ?? null,
    myReview: data?.myReview ?? null,
    reviews: data?.reviews ?? [],
    isReviewsLoading: isPending,
  }
}

// TMDB votes and CueNext votes rate the same title, so they are shown as one score: the two
// vote pools are summed and averaged together rather than competing side by side.
export function combineRatings(
  tmdbAverage: number | undefined,
  tmdbCount: number | undefined,
  cueNextSum: number,
  cueNextCount: number,
) {
  const tmdbVotes = tmdbCount ?? 0
  const tmdbSum = (tmdbAverage ?? 0) * tmdbVotes

  const voteCount = tmdbVotes + cueNextCount
  if (voteCount === 0) return { voteAverage: 0, voteCount: 0 }

  return { voteAverage: (tmdbSum + cueNextSum) / voteCount, voteCount }
}

export function reviewErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  // Convex prefixes thrown errors with server frame noise; the readable part is what the
  // mutation itself threw.
  const match = raw.match(/Uncaught Error:\s*(.*?)(\n|$)/)

  return (match?.[1] ?? raw).trim() || 'Something went wrong'
}

// Write side of the reviews section. Every action needs an account, so each one funnels
// through the same sign-in prompt first and reports failures as a toast.
export function useReviewActions() {
  const clerk = useClerk()
  const { user } = useUser()

  const saveReviewMutation = useDbMutation(api.reviews.saveReview)
  const deleteReviewMutation = useDbMutation(api.reviews.deleteReview)
  const toggleUpvoteMutation = useDbMutation(api.reviews.toggleUpvote)

  const requireSignIn = () => {
    if (clerk.isSignedIn) return true

    clerk.openSignIn({ forceRedirectUrl: window.location.href })

    return false
  }

  const run = async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await action()
    } catch (error) {
      toast.error(reviewErrorMessage(error))

      return undefined
    }
  }

  return {
    isSignedIn: !!clerk.isSignedIn,
    requireSignIn,

    // Clerk only forwards the name and picture claims when the Convex JWT template asks
    // for them, so the profile the browser already has is sent along as a fallback.
    saveReview: async (
      args: Omit<Parameters<typeof saveReviewMutation>[0], 'fallbackAuthorName' | 'fallbackAuthorImage'>,
    ) => {
      if (!requireSignIn()) return
      return await run(() =>
        saveReviewMutation({
          ...args,
          fallbackAuthorName: user?.fullName ?? user?.username ?? undefined,
          fallbackAuthorImage: user?.imageUrl ?? null,
        }),
      )
    },

    deleteReview: async (args: Parameters<typeof deleteReviewMutation>[0]) => {
      if (!requireSignIn()) return
      return await run(() => deleteReviewMutation(args))
    },

    toggleUpvote: async (args: Parameters<typeof toggleUpvoteMutation>[0]) => {
      if (!requireSignIn()) return
      return await run(() => toggleUpvoteMutation(args))
    },
  }
}
