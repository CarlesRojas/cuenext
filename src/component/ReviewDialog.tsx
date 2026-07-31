import { ProgressiveImage } from '#/component/ProgressiveImage'
import { RatingInput } from '#/component/RatingInput'
import { Button } from '#/component/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/component/ui/dialog'
import { Textarea } from '#/component/ui/textarea'
import { MAX_REVIEW_LENGTH, useReviewActions, useTitleReviews } from '#/hooks/useTitleReviews'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { faSpinner, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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
        <DialogHeader className="flex-row items-start gap-4">
          <div className="aspect-2/3 w-20 min-w-20 overflow-hidden rounded-xl border border-neutral-500/40 bg-neutral-900 sm:w-24 sm:min-w-24">
            <ProgressiveImage
              paths={[poster, backdrop]}
              alt={title}
              className="size-full object-cover object-center"
              minSize="w185"
              maxSize="w185"
            />
          </div>

          <div className="flex min-w-0 grow flex-col gap-3">
            <DialogTitle>{myReview ? 'Edit your review' : 'Rate & review'}</DialogTitle>

            <RatingInput value={rating} onChange={setRating} disabled={isSaving} />
          </div>
        </DialogHeader>

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
            <Button
              variant="negative"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isSaving}
              className="mr-auto"
            >
              <FontAwesomeIcon icon={faTrash} className="size-4" />
              <span>{'Delete'}</span>
            </Button>
          )}
        </DialogFooter>

        {/* Deleting drops the rating and the review together and cannot be undone, so it
            asks first. */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{`Do you want to delete your rating and review of ${title}?`}</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="negative" onClick={onDelete} disabled={isSaving}>
                  <FontAwesomeIcon icon={faTrash} className="size-4" />
                  <span>{'Delete'}</span>
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button variant="secondary" disabled={isSaving}>
                  <FontAwesomeIcon icon={faTimes} />
                  <span>{'Cancel'}</span>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
