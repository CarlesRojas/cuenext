// Write helpers shared by the review mutations and the user data importer, so an imported
// rating lands in exactly the same shape as one written in the app.

// The community average is materialized instead of recomputed, so every rating write moves
// the count and the sum by the delta it causes.
export async function applySummaryDelta(
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

// The name and picture an account is published under. The identity carries them only when
// the Clerk JWT template forwards those claims, so what the browser knows about its own
// signed-in user is accepted as a fallback; it can only ever set the caller's own card.
export async function upsertProfile(context: any, userId: string, name: string, image: string | null) {
  const existing = await context.db
    .query('userProfile')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .unique()

  if (!existing) {
    await context.db.insert('userProfile', { userId, name, image, updatedAt: Date.now() })
    return
  }

  if (existing.name !== name || existing.image !== image)
    await context.db.patch(existing._id, { name, image, updatedAt: Date.now() })
}

interface NewReview {
  userId: string
  authorName: string
  authorImage: string | null
  type: 'movie' | 'tv'
  tmdbId: number
  rating: number | null
  content: string
  createdAt: number
  updatedAt: number
}

// Posting a review counts as standing behind it, so it starts with the author's own upvote
// already cast. They can still take it back like any other upvote.
export async function insertReview(context: any, review: NewReview) {
  const { userId, ...rest } = review

  const reviewId = await context.db.insert('review', { userId, ...rest, upvoteCount: 1 })

  await context.db.insert('reviewVote', { userId, reviewId, createdAt: Date.now() })

  if (review.rating !== null) await applySummaryDelta(context, review.type, review.tmdbId, 1, review.rating)

  return reviewId
}
