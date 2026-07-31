import { api } from '#/../convex/_generated/api'
import type { Id } from '#/../convex/_generated/dataModel'
import type { ReviewCommentPayload } from '#/../convex/reviews'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'

export interface ThreadNode {
  comment: ReviewCommentPayload
  depth: number
  children: Array<ThreadNode>
}

// Comments arrive flat with a parent id. Siblings are ordered most upvoted first and then
// oldest first, so a discussion still reads top to bottom inside an equally voted branch.
function buildThread(comments: Array<ReviewCommentPayload>): Array<ThreadNode> {
  const byParent = new Map<string | null, Array<ReviewCommentPayload>>()

  for (const comment of comments) {
    const key = comment.parentCommentId ?? null
    const siblings = byParent.get(key)
    if (siblings) siblings.push(comment)
    else byParent.set(key, [comment])
  }

  for (const siblings of byParent.values())
    siblings.sort((a, b) => b.upvoteCount - a.upvoteCount || a.createdAt - b.createdAt)

  const build = (parentId: string | null, depth: number): Array<ThreadNode> =>
    (byParent.get(parentId) ?? []).map(comment => ({
      comment,
      depth,
      children: build(comment.id, depth + 1),
    }))

  return build(null, 0)
}

export function useReviewThread(reviewId: Id<'review'> | null, enabled = true) {
  const { data, isPending } = useQuery({
    ...convexQuery(api.reviews.getReviewThread, { reviewId: reviewId as Id<'review'> }),
    enabled: enabled && !!reviewId,
  })

  return {
    review: data?.review ?? null,
    thread: data ? buildThread(data.comments) : [],
    commentCount: data?.comments.filter(comment => !comment.isDeleted).length ?? 0,
    isThreadLoading: isPending,
  }
}
