import { ProgressiveImage } from '#/component/ProgressiveImage'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { faBookmark, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

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
  media: MediaType
  number?: number
  imagePaths?: (string | null | undefined)[]

  showWatch?: boolean
  watchButtonText?: string
  isWatched?: boolean
  onToggleWatch?: () => void
  isWatchLoading?: boolean

  showFollow?: boolean
  followButtonText?: string
  isFollowed?: boolean
  onToggleFollow?: () => void
  isFollowLoading?: boolean

  progressPercentage?: number
}

type Props = LoadingProps | LoadedProps

export function PosterCard(props: Props) {
  const searchParams = useSearchParams()
  const [hasImage, setHasImage] = useState(true)

  if (props.isLoading) {
    return (
      <div
        className={cn(
          'relative flex aspect-2/3 animate-pulse flex-col gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'w-36 max-w-36 min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
          'duration-slow transition-opacity',
          props.className,
        )}
      />
    )
  }

  const {
    className,

    id,
    title,
    media,
    imagePaths,
    number,
    progressPercentage,

    watchButtonText,
    showWatch = false,
    isWatched = false,
    onToggleWatch,
    isWatchLoading = false,

    followButtonText,
    showFollow = false,
    isFollowed = false,
    onToggleFollow,
    isFollowLoading = false,
  } = props

  return (
    <div
      className={cn(
        'group/poster relative flex aspect-2/3 flex-col gap-2',
        'w-36 max-w-36 min-w-36 lg:w-40 lg:max-w-40 lg:min-w-40 xl:w-44 xl:max-w-44 xl:min-w-44',
        isWatchLoading || isFollowLoading ? 'pointer-events-none' : '',
        className,
      )}
    >
      <Link
        to="/media/$media/$tmdbId"
        params={{ tmdbId: id.toString(), media }}
        search={searchParams}
        className="duration-slow relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform hover:scale-[1.07] focus-visible:scale-[1.07] disabled:pointer-events-none"
        disabled={isWatchLoading || isFollowLoading}
      >
        <ProgressiveImage
          paths={imagePaths || []}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          minSize="w185"
          maxSize="w185"
          onNoImage={() => setHasImage(false)}
        />

        {!hasImage && (
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
                  className="duration-slow h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${progressPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={progressPercentage}
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
          data-checked={!isWatchLoading && isWatched}
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
          size={followButtonText ? 'small' : 'iconSmall'}
          className="absolute top-1 right-1 z-10 gap-2 px-2 disabled:opacity-100"
          onClick={e => {
            e.preventDefault()
            onToggleFollow()
          }}
          data-checked={!isFollowLoading && isFollowed}
          title={isFollowed ? 'Untrack' : 'Track'}
          disabled={isFollowLoading}
        >
          {followButtonText && <span className="text-sm">{followButtonText}</span>}
          <FontAwesomeIcon icon={isFollowLoading ? faSpinner : faBookmark} spin={isFollowLoading} />
        </Button>
      )}
    </div>
  )
}
