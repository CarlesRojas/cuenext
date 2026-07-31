import { ProgressiveImage } from '#/component/ProgressiveImage'
import { RatingInput } from '#/component/RatingInput'
import { Button } from '#/component/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/component/ui/dialog'
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
  // Stored with the rating so the profile can list and illustrate what you rated without
  // going back to TMDB for every row.
  poster?: string | null
  backdrop?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Rating and review are the same row, so this dialog covers both: rate without writing,
// write without rating, or do both. None of it is sent to TMDB.
export function ReviewDialog({ type, tmdbId, title, poster, backdrop, open, onOpenChange }: ReviewDialogProps) {
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
    const saved = await saveReview({
      type,
      tmdbId,
      rating,
      content,
      name: title,
      poster: poster ?? null,
      backdrop: backdrop ?? null,
    })
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
      {/* Opening with no star focused: the dialog should show the rating you already gave,
          not land focus on the first star. */}
      <DialogContent className="gap-5" onOpenAutoFocus={event => event.preventDefault()}>
        <DialogHeader className="flex-row items-center gap-3">
          <div className="aspect-2/3 h-16 min-h-16 w-11 min-w-11 overflow-hidden rounded-lg border border-neutral-500/40 bg-neutral-900">
            <ProgressiveImage
              paths={[poster, backdrop]}
              alt={title}
              className="size-full object-cover object-center"
              minSize="w185"
              maxSize="w185"
            />
          </div>

          <DialogTitle>{myReview ? 'Edit your review' : 'Rate & review'}</DialogTitle>
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

          <div className="flex justify-end gap-2 text-xs tracking-wide text-white/40">
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
