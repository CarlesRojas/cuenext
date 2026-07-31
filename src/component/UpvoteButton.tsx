import type { Id } from '#/../convex/_generated/dataModel'
import { Button } from '#/component/ui/button'
import { useReviewActions } from '#/hooks/useTitleReviews'
import { cn } from '#/lib/cn'
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface UpvoteButtonProps {
  reviewId: Id<'review'>
  upvoteCount: number
  hasUpvoted: boolean
  className?: string
}

// Upvotes only, no downvotes. Pressing it again takes the upvote back, and the count it
// keeps is what reviews are sorted by.
export function UpvoteButton({ reviewId, upvoteCount, hasUpvoted, className }: UpvoteButtonProps) {
  const { toggleUpvote } = useReviewActions()
  const [isPending, setIsPending] = useState(false)

  const onClick = async () => {
    setIsPending(true)
    await toggleUpvote({ reviewId })
    setIsPending(false)
  }

  return (
    <Button
      variant="upvote"
      size="pill"
      data-state={hasUpvoted ? 'on' : 'off'}
      disabled={isPending}
      aria-pressed={hasUpvoted}
      title={hasUpvoted ? 'Remove upvote' : 'Upvote'}
      className={cn(className)}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faThumbsUp} className="size-3.5" />
      <span className="font-semibold tabular-nums">{upvoteCount}</span>
    </Button>
  )
}
