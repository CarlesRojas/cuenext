import { Button } from '#/component/ui/button'
import type { MediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { faEye, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

interface CommonProps {
  className?: string
}

interface LoadingProps extends CommonProps {
  isLoading: true
}

interface LoadedProps extends CommonProps {
  isLoading?: false
  id: number
  title: string
  mediaType: MediaType
  number?: number
  imageUrl?: string

  showWatch?: boolean
  watchButtonText?: string
  isWatched?: boolean
  onToggleWatch?: () => void
  isWatchLoading?: boolean

  showFollow?: boolean
  isFollowed?: boolean
  onToggleFollow?: () => void
  isFollowLoading?: boolean

  progressPercentage?: number
}

type Props = LoadingProps | LoadedProps

export function PosterCard(props: Props) {
  if (props.isLoading) {
    return (
      <div
        className={cn(
          'relative flex aspect-2/3 animate-pulse flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'w-36 max-w-36 min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
          'opacity-0 transition-opacity duration-300',
          props.className,
        )}
      />
    )
  }

  const {
    id,
    title,
    mediaType,
    imageUrl,
    number,
    className,

    watchButtonText,
    showWatch = false,
    isWatched = false,
    onToggleWatch,
    isWatchLoading = false,

    showFollow = false,
    isFollowed = false,
    onToggleFollow,
    isFollowLoading = false,

    progressPercentage,
  } = props

  return (
    <div
      className={cn(
        'group/poster relative flex aspect-2/3 flex-col gap-2',
        'w-36 max-w-36 min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
        className,
      )}
    >
      <Link
        to={`/${mediaType}/${id}` as LinkProps['to']}
        className="relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform duration-300 hover:scale-[1.07] focus-visible:scale-[1.07]"
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

        {progressPercentage && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/50 via-transparent to-transparent" />

            <div
              className="absolute inset-x-0 bottom-0 -mb-px flex h-11 min-h-11 w-full items-center justify-center px-3.5 backdrop-blur"
              style={{ maskImage: 'linear-gradient(to top, black 50%, transparent)' }}
            >
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: '70%' }}
                  role="progressbar"
                  aria-valuenow={70}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </>
        )}
      </Link>

      {showWatch && onToggleWatch && (
        <Button
          variant="frost"
          size={watchButtonText ? 'small' : 'iconSmall'}
          className="absolute top-1 right-1 z-10 gap-2 px-2 disabled:opacity-100"
          onClick={e => {
            e.preventDefault()
            onToggleWatch()
          }}
          data-checked={isWatched}
          title={isWatched ? 'Mark Unwatched' : 'Mark Watched'}
          disabled={isWatchLoading}
        >
          {watchButtonText && <span className="text-sm">{watchButtonText}</span>}
          {<FontAwesomeIcon icon={isWatchLoading ? faSpinner : faEye} spin={isWatchLoading} />}
        </Button>
      )}

      {showFollow && onToggleFollow && (
        <Button
          variant="frost"
          size="iconSmall"
          className="absolute top-1 right-1 z-10 disabled:opacity-100"
          onClick={e => {
            e.preventDefault()
            onToggleFollow()
          }}
          data-checked={isFollowed}
          title={isFollowed ? 'Unfollow' : 'Follow'}
          disabled={isFollowLoading}
        >
          <FontAwesomeIcon icon={isFollowLoading ? faSpinner : faPlus} spin={isFollowLoading} />
        </Button>
      )}
    </div>
  )
}
