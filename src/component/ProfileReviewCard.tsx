import { ProgressiveImage } from '#/component/ProgressiveImage'
import { ReviewDialog } from '#/component/ReviewDialog'
import { StarRating } from '#/component/StarRating'
import { Button } from '#/component/ui/button'
import { ShowMore } from '#/component/ui/show-more'
import useSearchParams from '#/hooks/useSearchParams'
import type { MediaType } from '#/type/media'
import { faPen, faThumbsUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

interface ProfileReviewCardProps {
  type: MediaType
  tmdbId: number
  title: string
  rating: number | null
  content: string
  poster: string | null
  backdrop: string | null
  upvoteCount: number
}

// One of your own reviews as it appears on your profile: the title's cover beside what you
// wrote, the score you gave it and how many readers upvoted it.
export function ProfileReviewCard({
  type,
  tmdbId,
  title,
  rating,
  content,
  poster,
  backdrop,
  upvoteCount,
}: ProfileReviewCardProps) {
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // The author's own upvote is cast automatically, so it is not applause worth showing.
  const readerUpvotes = Math.max(0, upvoteCount - 1)

  return (
    <div className="flex h-full w-80 max-w-[85vw] gap-3 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-3 shadow-xl">
      <Link
        to="/media/$media/$tmdbId"
        params={{ tmdbId: tmdbId.toString(), media: type }}
        search={searchParams}
        className="duration-slow aspect-2/3 h-fit w-20 min-w-20 overflow-hidden rounded-[14px] border border-neutral-500/40 bg-neutral-900 transition-transform hover:scale-[1.05] focus-visible:scale-[1.05]"
      >
        <ProgressiveImage
          paths={[poster, backdrop]}
          alt={title}
          className="size-full object-cover object-center"
          loading="lazy"
          minSize="w185"
          maxSize="w185"
        />
      </Link>

      <div className="flex min-w-0 grow flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 leading-5 font-semibold">{title || `#${tmdbId}`}</h4>

          <Button size="iconSmall" variant="ghost" title="Edit your review" onClick={() => setIsDialogOpen(true)}>
            <FontAwesomeIcon icon={faPen} className="size-3.5" />
          </Button>
        </div>

        {rating !== null && <StarRating voteAverage={rating} className="mt-0" showOutOfTen />}

        <ShowMore lines={3} text={content} className="text-sm" containerClassName="grow" />

        {readerUpvotes > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-white/40">
            <FontAwesomeIcon icon={faThumbsUp} className="size-3.5" />
            <span className="font-semibold tabular-nums">{readerUpvotes}</span>
          </div>
        )}
      </div>

      <ReviewDialog
        type={type}
        tmdbId={tmdbId}
        title={title}
        poster={poster}
        backdrop={backdrop}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
