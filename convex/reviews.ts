import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { optionalUser, requireIdentity } from './requireUser'

const mediaType = v.union(v.literal('movie'), v.literal('tv'))
const voteTarget = v.union(v.literal('review'), v.literal('comment'))

export const MAX_REVIEW_LENGTH = 5000
export const MAX_COMMENT_LENGTH = 2000

// A title's review list and a thread are both read in one shot, so both are capped. Titles
// never get anywhere near these numbers today; when they do, these are the two reads to
// turn into paginated ones.
const REVIEW_PAGE_SIZE = 50
const THREAD_COMMENT_LIMIT = 500

function assertRating(rating: number | null) {
  if (rating === null) return
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error('A rating must be a whole 1 to 10')
}

async function findVote(context: any, userId: string, targetKind: 'review' | 'comment', targetId: string) {
  return await context.db
    .query('reviewVote')
    .withIndex('by_user_target', (q: any) =>
      q.eq('userId', userId).eq('targetKind', targetKind).eq('targetId', targetId),
    )
    .unique()
}

async function deleteVotesFor(context: any, targetKind: 'review' | 'comment', targetId: string) {
  const votes = await context.db
    .query('reviewVote')
    .withIndex('by_target', (q: any) => q.eq('targetKind', targetKind).eq('targetId', targetId))
    .collect()

  for (const vote of votes) await context.db.delete(vote._id)
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
    replyCount: review.replyCount,
    hasUpvoted,
    isOwn: userId !== null && review.userId === userId,
  }
}

function commentPayload(comment: Doc<'reviewComment'>, userId: string | null, hasUpvoted: boolean) {
  return {
    id: comment._id,
    reviewId: comment.reviewId,
    parentCommentId: comment.parentCommentId,
    content: comment.content,
    authorName: comment.authorName,
    authorImage: comment.authorImage,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    upvoteCount: comment.upvoteCount,
    isDeleted: comment.isDeleted,
    hasUpvoted,
    isOwn: userId !== null && comment.userId === userId,
  }
}

export type ReviewPayload = ReturnType<typeof reviewPayload>
export type ReviewCommentPayload = ReturnType<typeof commentPayload>

// Everything the reviews section of a detail page needs: the community average, the
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
      const vote = userId ? await findVote(context, userId, 'review', review._id) : null
      withVotes.push(reviewPayload(review, userId, !!vote))
    }

    return {
      average: summary && summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : null,
      ratingCount: summary?.ratingCount ?? 0,
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

// The full discussion under one review. Comments come back flat with their parent id; the
// client nests them, which keeps the read to a single indexed scan.
export const getReviewThread = query({
  args: { reviewId: v.id('review') },
  handler: async (context, args) => {
    const userId = await optionalUser(context)

    const review = await context.db.get(args.reviewId)
    if (!review) return null

    const comments = await context.db
      .query('reviewComment')
      .withIndex('by_review', q => q.eq('reviewId', args.reviewId))
      .take(THREAD_COMMENT_LIMIT)

    const reviewVote = userId ? await findVote(context, userId, 'review', review._id) : null

    const withVotes = []
    for (const comment of comments) {
      const vote = userId ? await findVote(context, userId, 'comment', comment._id) : null
      withVotes.push(commentPayload(comment, userId, !!vote))
    }

    return {
      review: reviewPayload(review, userId, !!reviewVote),
      comments: withVotes,
    }
  },
})

// One row per user per title, so rating a title you already reviewed edits that review
// instead of adding a second one. A row with a rating and no content is a rating-only row.
export const saveReview = mutation({
  args: {
    type: mediaType,
    tmdbId: v.number(),
    rating: v.union(v.number(), v.null()),
    content: v.optional(v.string()),
  },
  handler: async (context, args) => {
    const { userId, authorName, authorImage } = await requireIdentity(context)

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
      upvoteCount: 0,
      replyCount: 0,
    })

    if (args.rating !== null) await applySummaryDelta(context, args.type, args.tmdbId, 1, args.rating)

    return reviewId
  },
})

// Clearing the written part while keeping the rating, so the review leaves the list but the
// title stays rated.
export const clearReviewContent = mutation({
  args: { reviewId: v.id('review') },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const review = await context.db.get(args.reviewId)
    if (!review) return
    if (review.userId !== userId) throw new Error('That review belongs to someone else')

    await context.db.patch(review._id, { content: '', updatedAt: Date.now() })
  },
})

// Removes the review, its whole thread and every vote cast on any of it.
export const deleteReview = mutation({
  args: { reviewId: v.id('review') },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const review = await context.db.get(args.reviewId)
    if (!review) return
    if (review.userId !== userId) throw new Error('That review belongs to someone else')

    const comments = await context.db
      .query('reviewComment')
      .withIndex('by_review', q => q.eq('reviewId', review._id))
      .collect()

    for (const comment of comments) {
      await deleteVotesFor(context, 'comment', comment._id)
      await context.db.delete(comment._id)
    }

    await deleteVotesFor(context, 'review', review._id)
    await context.db.delete(review._id)

    if (review.rating !== null) await applySummaryDelta(context, review.type, review.tmdbId, -1, -review.rating)
  },
})

// A reply to the review itself (no parentCommentId) or to another comment in the same
// thread. Anyone signed in can reply, including the review author.
export const addComment = mutation({
  args: {
    reviewId: v.id('review'),
    parentCommentId: v.optional(v.id('reviewComment')),
    content: v.string(),
  },
  handler: async (context, args) => {
    const { userId, authorName, authorImage } = await requireIdentity(context)

    const content = args.content.trim()
    if (content === '') throw new Error('Write something first')
    if (content.length > MAX_COMMENT_LENGTH) throw new Error(`A reply can be at most ${MAX_COMMENT_LENGTH} characters`)

    const review = await context.db.get(args.reviewId)
    if (!review) throw new Error('That review no longer exists')

    if (args.parentCommentId) {
      const parent = await context.db.get(args.parentCommentId)
      if (!parent || parent.reviewId !== args.reviewId) throw new Error('That comment no longer exists')
    }

    const now = Date.now()

    const commentId = await context.db.insert('reviewComment', {
      reviewId: args.reviewId,
      parentCommentId: args.parentCommentId ?? null,
      userId,
      content,
      authorName,
      authorImage,
      createdAt: now,
      updatedAt: now,
      upvoteCount: 0,
      isDeleted: false,
    })

    await context.db.patch(review._id, { replyCount: review.replyCount + 1 })

    return commentId
  },
})

export const editComment = mutation({
  args: { commentId: v.id('reviewComment'), content: v.string() },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const comment = await context.db.get(args.commentId)
    if (!comment) throw new Error('That comment no longer exists')
    if (comment.userId !== userId) throw new Error('That comment belongs to someone else')

    const content = args.content.trim()
    if (content === '') throw new Error('Write something first')
    if (content.length > MAX_COMMENT_LENGTH) throw new Error(`A reply can be at most ${MAX_COMMENT_LENGTH} characters`)

    await context.db.patch(comment._id, { content, updatedAt: Date.now() })
  },
})

// A comment with replies under it becomes a tombstone so the rest of the thread keeps its
// shape; a leaf comment is removed outright.
export const deleteComment = mutation({
  args: { commentId: v.id('reviewComment') },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    const comment = await context.db.get(args.commentId)
    if (!comment) return
    if (comment.userId !== userId) throw new Error('That comment belongs to someone else')

    const replies = await context.db
      .query('reviewComment')
      .withIndex('by_parent', q => q.eq('parentCommentId', comment._id))
      .take(1)

    await deleteVotesFor(context, 'comment', comment._id)

    if (replies.length > 0)
      await context.db.patch(comment._id, {
        content: '',
        isDeleted: true,
        upvoteCount: 0,
        updatedAt: Date.now(),
      })
    else await context.db.delete(comment._id)

    const review = await context.db.get(comment.reviewId)
    if (review) await context.db.patch(review._id, { replyCount: Math.max(0, review.replyCount - 1) })
  },
})

// Upvotes only, and toggling one off is the only way back down. The count lives on the
// review or comment row so lists can sort on it without reading the vote rows.
export const toggleUpvote = mutation({
  args: { targetKind: voteTarget, targetId: v.string() },
  handler: async (context, args) => {
    const { userId } = await requireIdentity(context)

    let target: Doc<'review'> | Doc<'reviewComment'> | null = null

    if (args.targetKind === 'review') {
      const reviewId = context.db.normalizeId('review', args.targetId)
      target = reviewId ? await context.db.get(reviewId) : null
    } else {
      const commentId = context.db.normalizeId('reviewComment', args.targetId)
      const comment = commentId ? await context.db.get(commentId) : null
      if (comment?.isDeleted) throw new Error('That comment was deleted')
      target = comment
    }

    if (!target) throw new Error('That post no longer exists')

    const existing = await findVote(context, userId, args.targetKind, args.targetId)

    if (existing) {
      await context.db.delete(existing._id)
      const upvoteCount = Math.max(0, target.upvoteCount - 1)
      await context.db.patch(target._id, { upvoteCount })
      return { hasUpvoted: false, upvoteCount }
    }

    await context.db.insert('reviewVote', {
      userId,
      targetKind: args.targetKind,
      targetId: args.targetId,
      createdAt: Date.now(),
    })

    const upvoteCount = target.upvoteCount + 1
    await context.db.patch(target._id, { upvoteCount })

    return { hasUpvoted: true, upvoteCount }
  },
})
