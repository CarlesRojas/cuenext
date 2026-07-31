import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { optionalUser, requireIdentity } from './requireUser'

const mediaType = v.union(v.literal('movie'), v.literal('tv'))

export const MAX_REVIEW_LENGTH = 5000

// A title's review list is read in one shot, so it is capped. Titles never get anywhere
// near this today; when they do, this is the read to turn into a paginated one.
const REVIEW_PAGE_SIZE = 50

function assertRating(rating: number | null) {
  if (rating === null) return
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error('A rating must be a whole 1 to 10')
}

async function findVote(context: any, userId: string, reviewId: string) {
  return await context.db
    .query('reviewVote')
    .withIndex('by_user_review', (q: any) => q.eq('userId', userId).eq('reviewId', reviewId))
    .unique()
}

// The community average is materialized instead of recomputed, so every rating write moves
// the count and the sum by the delta it causes.
async function applySummaryDelta(
  context: any,
  type: 'movie' | 'tv',
  tmdbId: number,
  countDelta: number,
  sumDelta: number,
) {
  if (countDelta === 0 && sumDelta === 0) return

  const summary = await context.db
    .query('reviewSummary')
    .withIndex('by_type_tmdbId', (q: any) => q.eq('type', type).eq('tmdbId', tmdbId))
    .unique()

  const now = Date.now()

  if (!summary) {
    if (countDelta <= 0) return
    await context.db.insert('reviewSummary', {
      type,
      tmdbId,
      ratingCount: countDelta,
      ratingSum: sumDelta,
      updatedAt: now,
    })
    return
  }

  await context.db.patch(summary._id, {
    ratingCount: Math.max(0, summary.ratingCount + countDelta),
    ratingSum: Math.max(0, summary.ratingSum + sumDelta),
    updatedAt: now,
  })
}

// userId identifies a Clerk account and never leaves the backend. The client gets isOwn
// instead, which is all the UI needs to decide whether to offer edit and delete.
function reviewPayload(review: Doc<'review'>, userId: string | null, hasUpvoted: boolean) {
  return {
    id: review._id,
    type: review.type,
    tmdbId: review.tmdbId,
    rating: review.rating,
    content: review.content,
    authorName: review.authorName,
    authorImage: review.authorImage,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    upvoteCount: review.upvoteCount,
    hasUpvoted,
    isOwn: userId !== null && review.userId === userId,
  }
}

export type ReviewPayload = ReturnType<typeof reviewPayload>

// Everything the reviews section of a detail page needs: the community rating totals, the
// signed-in user's own row (rating included, even when they never wrote a review) and the
// written reviews, most upvoted first.
export const getTitleReviews = query({
  args: { type: mediaType, tmdbId: v.number() },
  handler: async (context, args) => {
    const userId = await optionalUser(context)

    const summary = await context.db
      .query('reviewSummary')
      .withIndex('by_type_tmdbId', q => q.eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    const reviews = await context.db
      .query('review')
      .withIndex('by_type_tmdbId_upvotes', q => q.eq('type', args.type).eq('tmdbId', args.tmdbId))
      .order('desc')
      .filter(q => q.neq(q.field('content'), ''))
      .take(REVIEW_PAGE_SIZE)

    const myReview = userId
      ? await context.db
          .query('review')
          .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
          .unique()
      : null

    const withVotes = []
    for (const review of reviews) {
      const vote = userId ? await findVote(context, userId, review._id) : null
      withVotes.push(reviewPayload(review, userId, !!vote))
    }

    return {
      // The count and the sum are both returned so the client can fold the TMDB votes into
      // the same average instead of showing two competing scores.
      ratingCount: summary?.ratingCount ?? 0,
      ratingSum: summary?.ratingSum ?? 0,
      myRating: myReview?.rating ?? null,
      myReview: myReview
        ? {
            id: myReview._id,
            rating: myReview.rating,
            content: myReview.content,
            updatedAt: myReview.updatedAt,
          }
        : null,
      reviews: withVotes,
    }
  },
})

// One row per user per title: rating a title you already reviewed edits that review instead
// of adding a second one, so nobody can review the same title twice. A row with a rating and
// no content is a rating-only row and stays out of the review list.
export const saveReview = mutation({
  args: {
    type: mediaType,
    tmdbId: v.number(),
    rating: v.union(v.number(), v.null()),
    content: v.optional(v.string()),
    // Only used when the auth provider does not put the name and picture claims in the
    // token; the identity always wins when it carries them.
    fallbackAuthorName: v.optional(v.string()),
    fallbackAuthorImage: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (context, args) => {
    const identity = await requireIdentity(context)
    const userId = identity.userId

    const authorName = identity.hasName ? identity.authorName : (args.fallbackAuthorName ?? identity.authorName)
    const authorImage = identity.authorImage ?? args.fallbackAuthorImage ?? null

    assertRating(args.rating)

    const content = (args.content ?? '').trim()
    if (content.length > MAX_REVIEW_LENGTH) throw new Error(`A review can be at most ${MAX_REVIEW_LENGTH} characters`)
    if (args.rating === null && content === '') throw new Error('Add a rating or write something first')

    const existing = await context.db
      .query('review')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    const now = Date.now()

    if (existing) {
      await context.db.patch(existing._id, {
        rating: args.rating,
        content,
        authorName,
        authorImage,
        updatedAt: now,
      })

      const hadRating = existing.rating !== null
      const hasRating = args.rating !== null

      await applySummaryDelta(
        context,
        args.type,
        args.tmdbId,
        (hasRating ? 1 : 0) - (hadRating ? 1 : 0),
        (args.rating ?? 0) - (existing.rating ?? 0),
      )

      return existing._id
    }

    // Posting a review counts as standing behind it, so it starts with the author's own
    // upvote already cast. They can still take it back like any other upvote.
    const reviewId = await context.db.insert('review', {
      userId,
      type: args.type,
      tmdbId: args.tmdbId,
      rating: args.rating,
      content,
      authorName,
      authorImage,
      createdAt: now,
      updatedAt: now,
      upvoteCount: 1,
    })

    await context.db.insert('reviewVote', { userId, reviewId, createdAt: now })

    if (args.rating !== null) await applySummaryDelta(context, args.type, args.tmdbId, 1, args.rating)

    return reviewId
  },
})

// Removes the review and every vote cast on it.
export const deleteReview = mutation({
  args: { reviewId: v.id('review') },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const review = await context.db.get(args.reviewId)
    if (!review) return
    if (review.userId !== userId) throw new Error('That review belongs to someone else')

    const votes = await context.db
      .query('reviewVote')
      .withIndex('by_review', q => q.eq('reviewId', review._id))
      .collect()

    for (const vote of votes) await context.db.delete(vote._id)

    await context.db.delete(review._id)

    if (review.rating !== null) await applySummaryDelta(context, review.type, review.tmdbId, -1, -review.rating)
  },
})

// Upvotes only, and toggling one off is the only way back down. The count lives on the
// review row so the list can sort on it without reading the vote rows.
export const toggleUpvote = mutation({
  args: { reviewId: v.id('review') },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const review = await context.db.get(args.reviewId)
    if (!review) throw new Error('That review no longer exists')

    const existing = await findVote(context, userId, review._id)

    if (existing) {
      await context.db.delete(existing._id)
      const upvoteCount = Math.max(0, review.upvoteCount - 1)
      await context.db.patch(review._id, { upvoteCount })

      return { hasUpvoted: false, upvoteCount }
    }

    await context.db.insert('reviewVote', { userId, reviewId: review._id, createdAt: Date.now() })

    const upvoteCount = review.upvoteCount + 1
    await context.db.patch(review._id, { upvoteCount })

    return { hasUpvoted: true, upvoteCount }
  },
})
