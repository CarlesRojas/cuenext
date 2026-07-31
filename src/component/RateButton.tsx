import { ReviewDialog } from '#/component/ReviewDialog'
import { Button } from '#/component/ui/button'
import { useReviewActions, useTitleReviews } from '#/hooks/useTitleReviews'
import type { MediaType } from '#/type/media'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface RateButtonProps {
  type: MediaType
  tmdbId: number
  title: string
  poster?: string | null
  backdrop?: string | null
}

// Sits with the other title actions and opens the rate + review dialog. Once rated it
// shows the score the signed-in user gave.
export function RateButton({ type, tmdbId, title, poster, backdrop }: RateButtonProps) {
  const { myRating } = useTitleReviews(type, tmdbId)
  const { isSignedIn, requireSignIn } = useReviewActions()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const onClick = () => {
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
        size={myRating === null ? 'icon' : 'default'}
        data-state={myRating === null ? 'off' : 'on'}
        title={myRating === null ? 'Rate & review' : `Your rating: ${myRating} / 10`}
        onClick={onClick}
      >
        <FontAwesomeIcon icon={faStar} className="size-5" />
        {myRating !== null && <span className="tabular-nums">{myRating}</span>}
      </Button>

      <ReviewDialog
        type={type}
        tmdbId={tmdbId}
        title={title}
        poster={poster}
        backdrop={backdrop}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  )
}
