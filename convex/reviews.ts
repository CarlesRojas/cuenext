import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { applySummaryDelta, insertReview, upsertProfile } from './lib/reviewWrite'
import { optionalUser, requireIdentity } from './requireUser'

const mediaType = v.union(v.literal('movie'), v.literal('tv'))

export const MAX_REVIEW_LENGTH = 2000

// A title's review list is read in one shot, so it is capped. Titles never get anywhere
// near this today; when they do, this is the read to turn into a paginated one.
const REVIEW_PAGE_SIZE = 50

// A review is a rating first: the written part is optional, the score never is.
function assertRating(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error('A rating must be a whole 1 to 10')
}

async function findVote(context: any, userId: string, reviewId: string) {
  return await context.db
    .query('reviewVote')
    .withIndex('by_user_review', (q: any) => q.eq('userId', userId).eq('reviewId', reviewId))
    .unique()
}

// userId identifies a Clerk account and never leaves the backend. The client gets isOwn
// instead, which is all the UI needs to decide whether to offer edit and delete. The author
// card comes from the profile row when there is one, so changing your picture updates every
// review you ever wrote; the values stored on the review are the fallback.
function reviewPayload(
  review: Doc<'review'>,
  userId: string | null,
  hasUpvoted: boolean,
  profile: Doc<'userProfile'> | null,
) {
  return {
    id: review._id,
    type: review.type,
    tmdbId: review.tmdbId,
    rating: review.rating,
    content: review.content,
    authorName: profile?.name ?? review.authorName,
    authorImage: profile?.image ?? review.authorImage,
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

    // One profile read per distinct author, not per review.
    const profiles = new Map<string, Doc<'userProfile'> | null>()
    for (const review of reviews) {
      if (profiles.has(review.userId)) continue

      const profile = await context.db
        .query('userProfile')
        .withIndex('by_user', q => q.eq('userId', review.userId))
        .unique()

      profiles.set(review.userId, profile)
    }

    const withVotes = []
    for (const review of reviews) {
      const vote = userId ? await findVote(context, userId, review._id) : null
      withVotes.push(reviewPayload(review, userId, !!vote, profiles.get(review.userId) ?? null))
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

// Publishes the signed-in user's display name and picture into our own database, so every
// reader of their reviews gets them from us and they stay current when the account picture
// changes. Called on sign-in and before writing a review.
export const syncProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (context, args) => {
    const identity = await requireIdentity(context)

    const name = identity.hasName ? identity.authorName : args.name?.trim() || identity.authorName
    const image = identity.authorImage ?? args.image ?? null

    await upsertProfile(context, identity.userId, name, image)
  },
})

// Every rating the signed-in user has given, so a grid of posters can show each cover's
// rating from one subscription instead of one query per cover. Bounded by how many titles
// the user has rated.
export const getMyRatings = query({
  args: {},
  handler: async context => {
    const userId = await optionalUser(context)
    if (!userId) return []

    const reviews = await context.db
      .query('review')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return reviews
      .filter(review => review.rating !== null)
      .map(review => ({ type: review.type, tmdbId: review.tmdbId, rating: review.rating as number }))
  },
})

// The signed-in user's own reviews with the title metadata needed to illustrate them,
// best rated first. Feeds both profile sections: the rated titles grid reads the rated
// rows, the reviews list reads the ones that were written.
export const getMyReviews = query({
  args: { type: mediaType },
  handler: async (context, args) => {
    const userId = await optionalUser(context)
    if (!userId) return []

    const reviews = await context.db
      .query('review')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return reviews
      .filter(review => review.type === args.type)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.updatedAt - a.updatedAt)
      .map(review => ({
        id: review._id,
        type: review.type,
        tmdbId: review.tmdbId,
        rating: review.rating,
        content: review.content,
        name: review.name ?? '',
        poster: review.poster ?? null,
        backdrop: review.backdrop ?? null,
        upvoteCount: review.upvoteCount,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      }))
  },
})

// One row per user per title: rating a title you already reviewed edits that review instead
// of adding a second one, so nobody can review the same title twice. Every row carries a
// rating; the ones without content are rating-only and stay out of the review list.
export const saveReview = mutation({
  args: {
    type: mediaType,
    tmdbId: v.number(),
    rating: v.number(),
    content: v.optional(v.string()),
    // Title metadata for the profile lists, copied in from whatever screen opened the
    // dialog; a follow row for the same title fills the gaps.
    name: v.optional(v.string()),
    poster: v.optional(v.union(v.string(), v.null())),
    backdrop: v.optional(v.union(v.string(), v.null())),
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

    await upsertProfile(context, userId, authorName, authorImage)

    assertRating(args.rating)

    const content = (args.content ?? '').trim()
    if (content.length > MAX_REVIEW_LENGTH) throw new Error(`A review can be at most ${MAX_REVIEW_LENGTH} characters`)

    const existing = await context.db
      .query('review')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    const follow = await context.db
      .query('follow')
      .withIndex('by_user_type_tmdbId', q => q.eq('userId', userId).eq('type', args.type).eq('tmdbId', args.tmdbId))
      .unique()

    const name = args.name ?? follow?.name ?? existing?.name
    const poster = args.poster ?? follow?.poster ?? existing?.poster ?? null
    const backdrop = args.backdrop ?? follow?.backdrop ?? existing?.backdrop ?? null

    const now = Date.now()

    if (existing) {
      await context.db.patch(existing._id, {
        rating: args.rating,
        content,
        name,
        poster,
        backdrop,
        authorName,
        authorImage,
        updatedAt: now,
      })

      // An older row could predate mandatory ratings, so it may be joining the average now.
      const hadRating = existing.rating !== null

      await applySummaryDelta(context, args.type, args.tmdbId, hadRating ? 0 : 1, args.rating - (existing.rating ?? 0))

      return existing._id
    }

    return await insertReview(context, {
      userId,
      authorName,
      authorImage,
      type: args.type,
      tmdbId: args.tmdbId,
      rating: args.rating,
      content,
      name,
      poster,
      backdrop,
      createdAt: now,
      updatedAt: now,
    })
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
