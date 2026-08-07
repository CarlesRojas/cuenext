import { api } from '#/../convex/_generated/api'
import type { ReviewPayload } from '#/../convex/reviews'
import { convexOnceKey, useConvexOnce } from '#/lib/convexOneShot'
import type { MediaType } from '#/type/media'
import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'
import { toast } from 'sonner'

export const MAX_REVIEW_LENGTH = 2000

// The rating average moves only when somebody rates the title, so it is read once and left
// alone rather than subscribed to. Anyone rating from this browser patches it in place.
const RATING_SUMMARY_STALE_TIME = 5 * 60 * 1000

export function ratingSummaryKey(type: MediaType, tmdbId: number) {
  return convexOnceKey(api.reviews.getTitleRatingSummary, { type, tmdbId })
}

export function myRatingsKey() {
  return convexOnceKey(api.reviews.getMyRatings, {})
}

// The community rating totals for a title. This is all the detail page header needs, and it
// is a single row read - the review list is loaded separately, by the section that shows it.
export function useTitleRatingSummary(type: MediaType, tmdbId: number) {
  const options = useConvexOnce(api.reviews.getTitleRatingSummary, { type, tmdbId }, RATING_SUMMARY_STALE_TIME)
  const { data } = useQuery({ ...options, enabled: !!tmdbId })

  return { ratingCount: data?.ratingCount ?? 0, ratingSum: data?.ratingSum ?? 0 }
}

// The written reviews of a title. `enabled` is how the caller keeps this off the wire until
// the reviews section is actually on screen.
export function useTitleReviewList(type: MediaType, tmdbId: number, enabled = true) {
  const options = useConvexOnce(api.reviews.getTitleReviews, { type, tmdbId })
  const { data, isPending } = useQuery({ ...options, enabled: enabled && !!tmdbId })

  return { reviews: data ?? [], isReviewsLoading: isPending }
}

// The signed-in user's own row for a title, read only while the rate dialog is open.
export function useMyTitleReview(type: MediaType, tmdbId: number, enabled = true) {
  const clerk = useClerk()
  const options = useConvexOnce(api.reviews.getMyTitleReview, { type, tmdbId })
  const { data } = useQuery({ ...options, enabled: enabled && !!tmdbId && !!clerk.isSignedIn })

  return data ?? null
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
  const queryClient = useQueryClient()

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

  // Nothing here is subscribed to any more, so a write has to say what it changed. The
  // affected keys are dropped rather than patched where the new value is not derivable
  // locally (the review list, whose ordering the server decides).
  const invalidateTitle = (type: MediaType, tmdbId: number) => {
    queryClient.invalidateQueries({ queryKey: ratingSummaryKey(type, tmdbId) })
    queryClient.invalidateQueries({ queryKey: myRatingsKey() })
    queryClient.invalidateQueries({ queryKey: convexOnceKey(api.reviews.getMyTitleReview, { type, tmdbId }) })
    queryClient.invalidateQueries({ queryKey: convexOnceKey(api.reviews.getTitleReviews, { type, tmdbId }) })
    // getMyReviews on the profile page is still a live subscription, so it updates itself.
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

      const saved = await run(() =>
        saveReviewMutation({
          ...args,
          fallbackAuthorName: user?.fullName ?? user?.username ?? undefined,
          fallbackAuthorImage: user?.imageUrl ?? null,
        }),
      )

      if (saved !== undefined) invalidateTitle(args.type, args.tmdbId)

      return saved
    },

    deleteReview: async (args: Parameters<typeof deleteReviewMutation>[0] & { type: MediaType; tmdbId: number }) => {
      if (!requireSignIn()) return

      const { type, tmdbId, ...rest } = args
      const deleted = await run(() => deleteReviewMutation(rest))

      if (deleted !== undefined) invalidateTitle(type, tmdbId)

      return deleted
    },

    // The title is needed to find the cached list this review sits in, since the list is no
    // longer a subscription that would refresh itself.
    toggleUpvote: async (args: { reviewId: ReviewPayload['id']; type: MediaType; tmdbId: number }) => {
      if (!requireSignIn()) return

      const result = await run(() => toggleUpvoteMutation({ reviewId: args.reviewId }))
      if (!result) return result

      queryClient.setQueryData<ReviewPayload[]>(
        convexOnceKey(api.reviews.getTitleReviews, { type: args.type, tmdbId: args.tmdbId }),
        reviews =>
          reviews?.map(review =>
            review.id === args.reviewId
              ? { ...review, hasUpvoted: result.hasUpvoted, upvoteCount: result.upvoteCount }
              : review,
          ),
      )

      return result
    },
  }
}
