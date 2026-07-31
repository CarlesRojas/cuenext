import { ReviewAvatar } from '#/component/ReviewAvatar'
import { UpvoteButton } from '#/component/UpvoteButton'
import { Button } from '#/component/ui/button'
import { Textarea } from '#/component/ui/textarea'
import type { ThreadNode } from '#/hooks/useReviewThread'
import { MAX_COMMENT_LENGTH, useReviewActions } from '#/hooks/useTitleReviews'
import { cn } from '#/lib/cn'
import { faPen, faReply, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

// Replies keep nesting in the data, but the indentation stops here so a long back and
// forth does not squeeze itself off the screen on a phone.
const MAX_VISUAL_DEPTH = 3

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface CommentComposerProps {
  placeholder: string
  initialValue?: string
  submitLabel: string
  autoFocus?: boolean
  onSubmit: (content: string) => Promise<void>
  onCancel: () => void
}

export function CommentComposer({
  placeholder,
  initialValue = '',
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const [content, setContent] = useState(initialValue)
  const [isPending, setIsPending] = useState(false)

  const isEmpty = content.trim() === ''

  const submit = async () => {
    if (isEmpty || isPending) return

    setIsPending(true)
    await onSubmit(content)
    setIsPending(false)
    setContent('')
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus={autoFocus}
        value={content}
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
        disabled={isPending}
        placeholder={placeholder}
        className="min-h-20 rounded-[18px] border-neutral-500/40"
        onChange={event => setContent(event.target.value)}
      />

      <div className="flex flex-row-reverse justify-start gap-2">
        <Button size="pill" onClick={submit} disabled={isEmpty || isPending}>
          {isPending && <FontAwesomeIcon icon={faSpinner} className="size-3.5 animate-spin" />}
          <span>{submitLabel}</span>
        </Button>

        <Button size="pill" variant="secondary" onClick={onCancel} disabled={isPending}>
          {'Cancel'}
        </Button>
      </div>
    </div>
  )
}

interface ReviewCommentProps {
  node: ThreadNode
}

export function ReviewComment({ node }: ReviewCommentProps) {
  const { comment, depth, children } = node
  const { addComment, editComment, deleteComment } = useReviewActions()

  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const isEdited = comment.updatedAt > comment.createdAt

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ReviewAvatar name={comment.authorName} image={comment.authorImage} className="size-8 min-h-8 min-w-8" />

          <div className="flex flex-col">
            <span className="line-clamp-1 text-sm leading-4 font-semibold">
              {comment.isDeleted ? 'Deleted' : comment.authorName}
            </span>
            <time className="text-xs text-neutral-400">
              {`${formatDate(comment.createdAt)}${isEdited && !comment.isDeleted ? ' • edited' : ''}`}
            </time>
          </div>
        </div>

        {isEditing ? (
          <CommentComposer
            placeholder="Edit your reply"
            initialValue={comment.content}
            submitLabel="Save"
            autoFocus
            onCancel={() => setIsEditing(false)}
            onSubmit={async content => {
              await editComment({ commentId: comment.id, content })
              setIsEditing(false)
            }}
          />
        ) : (
          <p
            className={cn(
              'text-sm tracking-wide whitespace-pre-wrap text-white/70',
              comment.isDeleted && 'italic opacity-40',
            )}
          >
            {comment.isDeleted ? 'This reply was deleted' : comment.content}
          </p>
        )}

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            {!comment.isDeleted && (
              <UpvoteButton
                targetKind="comment"
                targetId={comment.id}
                upvoteCount={comment.upvoteCount}
                hasUpvoted={comment.hasUpvoted}
              />
            )}

            <Button size="pill" variant="ghost" onClick={() => setIsReplying(!isReplying)}>
              <FontAwesomeIcon icon={faReply} className="size-3.5" />
              <span>{'Reply'}</span>
            </Button>

            {comment.isOwn && !comment.isDeleted && (
              <>
                <Button size="pill" variant="ghost" onClick={() => setIsEditing(true)}>
                  <FontAwesomeIcon icon={faPen} className="size-3.5" />
                  <span>{'Edit'}</span>
                </Button>

                <Button
                  size="pill"
                  variant="ghost"
                  className="text-red-400/80 hover:text-red-400"
                  onClick={() => deleteComment({ commentId: comment.id })}
                >
                  <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                  <span>{'Delete'}</span>
                </Button>
              </>
            )}
          </div>
        )}

        {isReplying && (
          <CommentComposer
            placeholder={`Reply to ${comment.isDeleted ? 'this thread' : comment.authorName}`}
            submitLabel="Reply"
            autoFocus
            onCancel={() => setIsReplying(false)}
            onSubmit={async content => {
              const created = await addComment({
                reviewId: comment.reviewId,
                parentCommentId: comment.id,
                content,
              })
              if (created !== undefined) setIsReplying(false)
            }}
          />
        )}
      </div>

      {children.length > 0 && (
        <div className={cn('flex flex-col gap-4', depth < MAX_VISUAL_DEPTH && 'border-l border-neutral-500/30 pl-3')}>
          {children.map(child => (
            <ReviewComment key={child.comment.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}
