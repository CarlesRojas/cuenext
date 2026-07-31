import { api } from '#/../convex/_generated/api'
import type { MediaType } from '#/type/media'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'
import { toast } from 'sonner'

export const MAX_REVIEW_LENGTH = 5000
export const MAX_COMMENT_LENGTH = 2000

export function titleReviewsQuery(type: MediaType, tmdbId: number) {
  return convexQuery(api.reviews.getTitleReviews, { type, tmdbId })
}

// CueNext reviews and the community rating for one title. Reviews are public, so this runs
// for signed-out visitors too; every component on the detail page that calls this with the
// same title shares a single subscription.
export function useTitleReviews(type: MediaType, tmdbId: number, enabled = true) {
  const { data, isPending } = useQuery({ ...titleReviewsQuery(type, tmdbId), enabled: enabled && !!tmdbId })

  return {
    average: data?.average ?? null,
    ratingCount: data?.ratingCount ?? 0,
    myRating: data?.myRating ?? null,
    myReview: data?.myReview ?? null,
    reviews: data?.reviews ?? [],
    isReviewsLoading: isPending,
  }
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

  const saveReview = useDbMutation(api.reviews.saveReview)
  const deleteReview = useDbMutation(api.reviews.deleteReview)
  const clearReviewContent = useDbMutation(api.reviews.clearReviewContent)
  const addComment = useDbMutation(api.reviews.addComment)
  const editComment = useDbMutation(api.reviews.editComment)
  const deleteComment = useDbMutation(api.reviews.deleteComment)
  const toggleUpvote = useDbMutation(api.reviews.toggleUpvote)

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

    saveReview: async (args: Parameters<typeof saveReview>[0]) => {
      if (!requireSignIn()) return
      return await run(() => saveReview(args))
    },

    deleteReview: async (args: Parameters<typeof deleteReview>[0]) => {
      if (!requireSignIn()) return
      return await run(() => deleteReview(args))
    },

    clearReviewContent: async (args: Parameters<typeof clearReviewContent>[0]) => {
      if (!requireSignIn()) return
      return await run(() => clearReviewContent(args))
    },

    addComment: async (args: Parameters<typeof addComment>[0]) => {
      if (!requireSignIn()) return
      return await run(() => addComment(args))
    },

    editComment: async (args: Parameters<typeof editComment>[0]) => {
      if (!requireSignIn()) return
      return await run(() => editComment(args))
    },

    deleteComment: async (args: Parameters<typeof deleteComment>[0]) => {
      if (!requireSignIn()) return
      return await run(() => deleteComment(args))
    },

    toggleUpvote: async (args: Parameters<typeof toggleUpvote>[0]) => {
      if (!requireSignIn()) return
      return await run(() => toggleUpvote(args))
    },
  }
}
