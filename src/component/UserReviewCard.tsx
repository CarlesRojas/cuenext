import type { ReviewPayload } from '#/../convex/reviews'
import { ReviewAvatar } from '#/component/ReviewAvatar'
import { ReviewThreadDialog } from '#/component/ReviewThreadDialog'
import { StarRating } from '#/component/StarRating'
import { UpvoteButton } from '#/component/UpvoteButton'
import { Button } from '#/component/ui/button'
import { ShowMore } from '#/component/ui/show-more'
import { faComment } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface UserReviewCardProps {
  review: ReviewPayload
}

// A review written on CueNext. Same card shape as the TMDB ones, plus the upvote count it
// is sorted by and the way into its discussion thread.
export function UserReviewCard({ review }: UserReviewCardProps) {
  const [isThreadOpen, setIsThreadOpen] = useState(false)

  const reviewDate = new Date(review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="relative flex h-full flex-col gap-3 rounded-[22px] border border-sky-500/30 bg-neutral-800 p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <ReviewAvatar name={review.authorName} image={review.authorImage} className="size-12 min-h-12 min-w-12" />

        <div className="flex grow justify-between gap-3">
          <div className="flex flex-col">
            <h4 className="line-clamp-1 leading-4 font-semibold">
              {review.isOwn ? `${review.authorName} (you)` : review.authorName}
            </h4>
            <time className="line-clamp-1 text-sm text-neutral-400">{reviewDate}</time>
          </div>

          {review.rating !== null && <StarRating voteAverage={review.rating} className="mt-0 h-fit" showOutOfTen />}
        </div>
      </div>

      <ShowMore lines={4} onClick={() => setIsThreadOpen(true)} text={review.content} containerClassName="grow" />

      <div className="flex flex-wrap items-center gap-2">
        <UpvoteButton
          targetKind="review"
          targetId={review.id}
          upvoteCount={review.upvoteCount}
          hasUpvoted={review.hasUpvoted}
        />

        <Button size="pill" variant="ghost" onClick={() => setIsThreadOpen(true)}>
          <FontAwesomeIcon icon={faComment} className="size-3.5" />
          <span>
            {review.replyCount === 0 ? 'Reply' : review.replyCount === 1 ? '1 reply' : `${review.replyCount} replies`}
          </span>
        </Button>
      </div>

      {isThreadOpen && <ReviewThreadDialog reviewId={review.id} open={isThreadOpen} onOpenChange={setIsThreadOpen} />}
    </div>
  )
}
