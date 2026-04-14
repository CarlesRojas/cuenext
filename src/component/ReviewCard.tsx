import { ProgressiveImage } from '#/component/ProgressiveImage'
import { StarRating } from '#/component/StarRating'
import { Button } from '#/component/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '#/component/ui/dialog'
import { ShowMore } from '#/component/ui/show-more'
import { cn } from '#/lib/cn'
import type { TmdbReview } from '#/type/tmdb'
import { faTimes, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface Props {
  review: TmdbReview
  inDialog?: boolean
}

const ReviewCard = ({ review, inDialog = false }: Props) => {
  const { author, author_details, created_at, content } = review
  const { name, avatar_path, rating } = author_details

  const reviewDate = new Date(created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div
      className={cn(
        'relative flex h-full flex-col gap-3 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-4 shadow-xl',
        inDialog && 'rounded-0 h-fit border-0 bg-transparent p-0 shadow-none lg:p-0',
      )}
    >
      <div className={cn('flex items-center gap-3', inDialog && 'px-4.5 pr-16.5')}>
        <div className="relative h-12 w-12 min-w-12 rounded-full border border-neutral-500/40 bg-neutral-900 shadow-xl">
          {avatar_path ? (
            <>
              <ProgressiveImage
                paths={[avatar_path]}
                alt={name}
                className="absolute inset-0 -z-10 h-full w-full rounded-full object-cover object-center opacity-50 blur-md"
                minSize="w92"
                maxSize="w92"
              />

              <ProgressiveImage
                paths={[avatar_path]}
                alt={name}
                className="h-full w-full rounded-full object-cover object-center"
                minSize="w92"
                maxSize="w92"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="size-5 max-h-5 max-w-5 text-neutral-500" size="8x" />
            </div>
          )}
        </div>

        <div className="flex grow justify-between gap-3">
          <div className="flex flex-col">
            <h4 className="line-clamp-1 leading-4 font-semibold">{author}</h4>
            <time className="line-clamp-1 text-sm text-neutral-400">{reviewDate}</time>
          </div>

          {rating && <StarRating voteAverage={rating} className="mt-0 h-fit" showOutOfTen />}
        </div>
      </div>

      {!inDialog && <ShowMore lines={4} onClick={() => setIsDialogOpen(true)} text={content} />}

      {inDialog && (
        <p className="scroll-container max-h-[50dvh] overflow-x-hidden p-0 px-4.5 tracking-wide text-white/70 select-all">
          {content}
        </p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={open => setIsDialogOpen(open)}>
        <DialogContent className="px-0 py-4.5">
          <ReviewCard review={review} inDialog />

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

export default ReviewCard
