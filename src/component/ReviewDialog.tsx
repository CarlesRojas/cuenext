import { RatingInput } from '#/component/RatingInput'
import { Button } from '#/component/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/component/ui/dialog'
import { Textarea } from '#/component/ui/textarea'
import { MAX_REVIEW_LENGTH, useReviewActions, useTitleReviews } from '#/hooks/useTitleReviews'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

interface ReviewDialogProps {
  type: MediaType
  tmdbId: number
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Rating and review are the same row, so this dialog covers both: rate without writing,
// write without rating, or do both. None of it is sent to TMDB.
export function ReviewDialog({ type, tmdbId, title, open, onOpenChange }: ReviewDialogProps) {
  const { myReview } = useTitleReviews(type, tmdbId, open)
  const { saveReview, deleteReview } = useReviewActions()

  const [rating, setRating] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Reopening starts from whatever is stored, so an edit never begins from a stale draft.
  useEffect(() => {
    if (!open) return

    setRating(myReview?.rating ?? null)
    setContent(myReview?.content ?? '')
  }, [open, myReview?.rating, myReview?.content])

  const isEmpty = rating === null && content.trim() === ''
  const isTooLong = content.length > MAX_REVIEW_LENGTH

  const onSave = async () => {
    if (isEmpty || isTooLong) return

    setIsSaving(true)
    const saved = await saveReview({ type, tmdbId, rating, content })
    setIsSaving(false)

    if (saved !== undefined) onOpenChange(false)
  }

  const onDelete = async () => {
    if (!myReview) return

    setIsSaving(true)
    await deleteReview({ reviewId: myReview.id })
    setIsSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>{myReview ? 'Edit your review' : 'Rate & review'}</DialogTitle>
          <DialogDescription className="text-white/50">{title}</DialogDescription>
        </DialogHeader>

        <RatingInput value={rating} onChange={setRating} disabled={isSaving} />

        <div className="flex flex-col gap-1">
          <Textarea
            value={content}
            onChange={event => setContent(event.target.value)}
            disabled={isSaving}
            rows={5}
            maxLength={MAX_REVIEW_LENGTH}
            placeholder="Write a review (optional)"
            className="max-h-[35dvh] min-h-28 rounded-[18px] border-neutral-500/40 focus-visible:border-sky-500/50 focus-visible:ring-0"
          />

          <div className="flex justify-between gap-2 text-xs tracking-wide text-white/40">
            <span>{'One review per title. You can edit it any time.'}</span>
            <span className={cn('tabular-nums', isTooLong && 'text-red-400')}>
              {`${content.length} / ${MAX_REVIEW_LENGTH}`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSave} disabled={isEmpty || isTooLong || isSaving}>
            {isSaving && <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" />}
            <span>{myReview ? 'Save' : 'Post'}</span>
          </Button>

          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {'Cancel'}
          </Button>

          {myReview && (
            <Button variant="negative" onClick={onDelete} disabled={isSaving} className="mr-auto">
              <FontAwesomeIcon icon={faTrash} className="size-4" />
              <span>{'Delete'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
