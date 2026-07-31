import type { Id } from '#/../convex/_generated/dataModel'
import { ReviewAvatar } from '#/component/ReviewAvatar'
import { CommentComposer, ReviewComment } from '#/component/ReviewComment'
import { StarRating } from '#/component/StarRating'
import { UpvoteButton } from '#/component/UpvoteButton'
import { Button } from '#/component/ui/button'
import { Dialog, DialogContent, DialogTitle } from '#/component/ui/dialog'
import { useReviewThread } from '#/hooks/useReviewThread'
import { useReviewActions } from '#/hooks/useTitleReviews'
import { faComment, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface ReviewThreadDialogProps {
  reviewId: Id<'review'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The discussion under one review: the review itself, then every reply, most upvoted
// first. Anyone signed in can reply to the review or to any reply inside it.
export function ReviewThreadDialog({ reviewId, open, onOpenChange }: ReviewThreadDialogProps) {
  const { review, thread, commentCount, isThreadLoading } = useReviewThread(reviewId, open)
  const { addComment } = useReviewActions()

  const [isReplying, setIsReplying] = useState(false)

  const reviewDate = review
    ? new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-4 px-0 py-4.5">
        <DialogTitle className="px-4.5 pr-14 text-base font-semibold text-white/50">
          {commentCount === 1 ? '1 reply' : `${commentCount} replies`}
        </DialogTitle>

        <div className="scroll-container flex max-h-[65dvh] flex-col gap-5 overflow-x-hidden px-4.5">
          {isThreadLoading && !review && (
            <div className="flex justify-center py-8">
              <FontAwesomeIcon icon={faSpinner} className="size-5 animate-spin text-neutral-500" />
            </div>
          )}

          {review && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ReviewAvatar
                  name={review.authorName}
                  image={review.authorImage}
                  className="size-12 min-h-12 min-w-12"
                />

                <div className="flex grow justify-between gap-3">
                  <div className="flex flex-col">
                    <h4 className="line-clamp-1 leading-4 font-semibold">{review.authorName}</h4>
                    <time className="line-clamp-1 text-sm text-neutral-400">{reviewDate}</time>
                  </div>

                  {review.rating !== null && (
                    <StarRating voteAverage={review.rating} className="mt-0 h-fit" showOutOfTen />
                  )}
                </div>
              </div>

              {review.content && <p className="tracking-wide whitespace-pre-wrap text-white/70">{review.content}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <UpvoteButton
                  targetKind="review"
                  targetId={review.id}
                  upvoteCount={review.upvoteCount}
                  hasUpvoted={review.hasUpvoted}
                />

                <Button size="pill" variant="ghost" onClick={() => setIsReplying(!isReplying)}>
                  <FontAwesomeIcon icon={faComment} className="size-3.5" />
                  <span>{'Reply'}</span>
                </Button>
              </div>

              {isReplying && (
                <CommentComposer
                  placeholder={`Reply to ${review.authorName}`}
                  submitLabel="Reply"
                  autoFocus
                  onCancel={() => setIsReplying(false)}
                  onSubmit={async content => {
                    const created = await addComment({ reviewId: review.id, content })
                    if (created !== undefined) setIsReplying(false)
                  }}
                />
              )}
            </div>
          )}

          {thread.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-neutral-500/30 pt-4">
              {thread.map(node => (
                <ReviewComment key={node.comment.id} node={node} />
              ))}
            </div>
          )}

          {review && thread.length === 0 && !isReplying && (
            <p className="pb-2 text-sm tracking-wide text-white/40">{'No replies yet. Start the discussion.'}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
