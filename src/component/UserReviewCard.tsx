import type { ReviewPayload } from '#/../convex/reviews'
import { ReviewAvatar } from '#/component/ReviewAvatar'
import { StarRating } from '#/component/StarRating'
import { UpvoteButton } from '#/component/UpvoteButton'
import { Button } from '#/component/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '#/component/ui/dialog'
import { ShowMore } from '#/component/ui/show-more'
import { cn } from '#/lib/cn'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface UserReviewCardProps {
  review: ReviewPayload
  inDialog?: boolean
}

// A review written on CueNext. Same card shape as the TMDB ones, plus the upvote count it
// is sorted by; the reader's own review is tinted so it stands out in the list.
export function UserReviewCard({ review, inDialog = false }: UserReviewCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const reviewDate = new Date(review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-3 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-4 shadow-xl',
        review.isOwn && 'border-sky-500/40 bg-sky-500/10',
        inDialog && 'rounded-0 h-fit border-0 bg-transparent p-0 shadow-none lg:p-0',
      )}
    >
      <div className={cn('flex items-center gap-3', inDialog && 'px-4.5 pr-16.5')}>
        <ReviewAvatar name={review.authorName} image={review.authorImage} className="size-12 min-h-12 min-w-12" />

        <div className="flex grow justify-between gap-3">
          <div className="flex flex-col">
            <h4 className="line-clamp-1 leading-4 font-semibold">{review.authorName}</h4>
            <time className="line-clamp-1 text-sm text-neutral-400">{reviewDate}</time>
          </div>

          {review.rating !== null && <StarRating voteAverage={review.rating} className="mt-0 h-fit" showOutOfTen />}
        </div>
      </div>

      {!inDialog && (
        <ShowMore lines={4} onClick={() => setIsDialogOpen(true)} text={review.content} containerClassName="grow" />
      )}

      {inDialog && (
        <p className="scroll-container max-h-[50dvh] overflow-x-hidden p-0 px-4.5 tracking-wide whitespace-pre-wrap text-white/70 select-all">
          {review.content}
        </p>
      )}

      {!inDialog && (
        <div className="flex flex-wrap items-center gap-2">
          <UpvoteButton reviewId={review.id} upvoteCount={review.upvoteCount} hasUpvoted={review.hasUpvoted} />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={open => setIsDialogOpen(open)}>
        <DialogContent className="px-0 py-4.5">
          <UserReviewCard review={review} inDialog />

          <DialogFooter className="px-4.5">
            <DialogClose asChild>
              <Button variant="secondary">
                <FontAwesomeIcon icon={faTimes} />
                <span>{'Close'}</span>
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
