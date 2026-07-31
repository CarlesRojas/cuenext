import { cn } from '#/lib/cn'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface ReviewAvatarProps {
  name: string
  image: string | null
  className?: string
}

// CueNext authors come from Clerk, so their avatar is an absolute URL rather than a TMDB
// path and cannot go through ProgressiveImage.
export function ReviewAvatar({ name, image, className }: ReviewAvatarProps) {
  const [hasFailed, setHasFailed] = useState(false)

  return (
    <div
      className={cn(
        'relative size-10 min-h-10 min-w-10 overflow-hidden rounded-full border border-neutral-500/40 bg-neutral-900',
        className,
      )}
    >
      {image && !hasFailed ? (
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="size-full object-cover object-center"
          onError={() => setHasFailed(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <FontAwesomeIcon icon={faUser} className="size-4 max-h-4 max-w-4 text-neutral-500" />
        </div>
      )}
    </div>
  )
}
