import type { MediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { faCheckCircle, faCirclePlus, faEye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

type PosterCardProps = {
  className?: string
  number?: number
} & (
  | {
      isLoading: true
      id?: never
      title?: never
      mediaType?: never
      imageUrl?: never
      showWatch?: never
      isWatched?: never
      onToggleWatch?: never
      showFollow?: never
      isFollowed?: never
      onToggleFollow?: never
    }
  | {
      isLoading?: false
      id: string | number
      title: string
      mediaType: MediaType
      imageUrl?: string
      showWatch?: boolean
      isWatched?: boolean
      onToggleWatch?: () => void
      showFollow?: boolean
      isFollowed?: boolean
      onToggleFollow?: () => void
    }
)

export function PosterCard({
  id,
  title,
  mediaType,
  imageUrl,
  className,
  number,
  isLoading,

  showWatch = false,
  isWatched = false,
  onToggleWatch,

  showFollow = false,
  isFollowed = false,
  onToggleFollow,
}: PosterCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'relative flex aspect-2/3 animate-pulse flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'w-32 max-w-32 min-w-32 md:w-36 md:max-w-36 md:min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
          className,
        )}
      />
    )
  }

  return (
    <Link
      to={`/${mediaType}/${id}` as LinkProps['to']}
      className={cn(
        'group relative flex aspect-2/3 flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform duration-300 hover:scale-[1.07] hover:shadow-xl/20 focus-visible:scale-[1.07] focus-visible:shadow-xl/20',
        'w-32 max-w-32 min-w-32 md:w-36 md:max-w-36 md:min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
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

      {number && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-black/50 via-transparent to-transparent" />

          <div className="pointer-events-none absolute top-3 left-3 flex items-center justify-center">
            <p className="bg-linear-to-b from-white to-white/50 bg-clip-text text-5xl leading-10 font-bold text-transparent">
              {number}
            </p>
          </div>
        </>
      )}
    </Link>
  )
}
