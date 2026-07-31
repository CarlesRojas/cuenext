import { ReviewDialog } from '#/component/ReviewDialog'
import { Button } from '#/component/ui/button'
import { useMyRating } from '#/hooks/useMyRatings'
import { useReviewActions } from '#/hooks/useTitleReviews'
import type { MediaType } from '#/type/media'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface PosterRateButtonProps {
  type: MediaType
  tmdbId: number
  title: string
}

// Sits on a poster where the track and watch buttons sit, and opens the same rate and
// review dialog the detail page uses. Plain until the title is rated, then it wears the
// rating in the same colours the detail page gives it.
export function PosterRateButton({ type, tmdbId, title }: PosterRateButtonProps) {
  const rating = useMyRating(type, tmdbId)
  const { isSignedIn, requireSignIn } = useReviewActions()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault()

    if (!isSignedIn) {
      requireSignIn()
      return
    }

    setIsDialogOpen(true)
  }

  return (
    <>
      <Button
        variant="rate"
        size={rating === null ? 'iconSmall' : 'small'}
        data-state={rating === null ? 'off' : 'on'}
        className="absolute top-1 right-1 z-10 m-0 gap-2 px-2"
        title={rating === null ? 'Rate & review' : `Your rating: ${rating} / 10`}
        onClick={onClick}
      >
        {rating !== null && <span className="text-sm tabular-nums">{rating}</span>}
        <FontAwesomeIcon icon={faStar} />
      </Button>

      <ReviewDialog type={type} tmdbId={tmdbId} title={title} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
