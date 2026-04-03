import { cn } from '#/lib/cn'
import { faCheckCircle, faCirclePlus, faEye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface PosterCardProps {
  id: string | number
  title: string
  imageUrl?: string
  className?: string

  showWatch?: boolean
  isWatched?: boolean
  onToggleWatch?: () => void

  showFollow?: boolean
  isFollowed?: boolean
  onToggleFollow?: () => void
}

export function PosterCard({
  title,
  imageUrl,
  className,

  showWatch = false,
  isWatched = false,
  onToggleWatch,

  showFollow = false,
  isFollowed = false,
  onToggleFollow,
}: PosterCardProps) {
  return (
    <div
      className={cn(
        // If the size changes, also update src/component/Section.tsx
        'group relative flex aspect-2/3 w-32 max-w-32 min-w-32 flex-col gap-2 overflow-hidden rounded-xl bg-neutral-800 transition-transform duration-300 hover:scale-105 hover:shadow-xl md:w-44 md:max-w-44 md:min-w-44',
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-center text-sm text-neutral-500">
          {title}
        </div>
      )}

      {showFollow && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {onToggleFollow && (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                onToggleFollow()
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/80"
              title={isFollowed ? 'Unfollow' : 'Follow'}
            >
              <FontAwesomeIcon
                icon={isFollowed ? faCheckCircle : faCirclePlus}
                className={isFollowed ? 'text-sky-500' : ''}
              />
            </button>
          )}
        </div>
      )}

      {showWatch && (
        <div className="absolute right-2 bottom-2 left-2 flex justify-between gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {onToggleWatch && (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                onToggleWatch()
              }}
              className="flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-black/60 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/90"
            >
              <FontAwesomeIcon icon={faEye} className={isWatched ? 'text-sky-500' : ''} />
              {isWatched ? 'Watched' : 'Mark Watched'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
