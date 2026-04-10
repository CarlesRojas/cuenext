import { ProgressiveImage } from '#/component/ProgressiveImage'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import type { MediaType } from '#/type/media'
import { faBookmark, faClapperboard, faSpinner, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
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
  subtitle?: string
  posterPath?: string | null | undefined
  backdropPath?: string | null | undefined
  overview: string

  rightContent?: ReactNode
  showFollow?: boolean
  followButtonText?: string
  isFollowed?: boolean
  onToggleFollow?: () => void
  isFollowLoading?: boolean
}

type Props = LoadingProps | LoadedProps

export default function RowCard(props: Props) {
  const searchParams = useSearchParams()

  if (props.isLoading) {
    return (
      <div
        className={cn(
          'relative flex animate-pulse gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'h-40 max-h-40 min-h-40 w-full',
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
    posterPath,
    backdropPath,
    subtitle,
    overview,

    rightContent,
    followButtonText,
    showFollow = false,
    isFollowed = false,
    onToggleFollow,
    isFollowLoading = false,
  } = props

  const posterPaths = [posterPath]
  const backdropPaths = [backdropPath, posterPath]

  const [hasPosterImage, setHasPosterImage] = useState(true)
  const [hasBackdropImage, setHasBackdropImage] = useState(true)

  return (
    <div
      className={cn(
        'group/poster relative flex',
        'h-40 max-h-40 min-h-40 w-full',
        isFollowLoading ? 'pointer-events-none' : '',
        className,
      )}
    >
      <Link
        to="/media/$media/$tmdbId"
        params={{ tmdbId: id.toString(), media }}
        search={searchParams}
        className="duration-slow relative grid h-full w-full grid-cols-[auto_1fr] grid-rows-1 gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform hover:scale-[1.05] focus-visible:scale-[1.05] disabled:pointer-events-none"
        disabled={isFollowLoading}
      >
        {hasPosterImage ? (
          <div className="relative aspect-2/3 h-full rounded-[22px] bg-neutral-900 lg:hidden">
            <ProgressiveImage
              paths={posterPaths}
              alt={title}
              className="absolute inset-y-0 left-0 aspect-2/3 h-full scale-200 rounded-[22px] object-cover opacity-30 blur-2xl"
              minSize="w342"
              maxSize="w342"
              loading="lazy"
            />

            <ProgressiveImage
              paths={posterPaths}
              alt={title}
              className="aspect-2/3 h-full rounded-[22px] object-cover"
              onNoImage={() => setHasPosterImage(false)}
              minSize="w342"
              maxSize="w342"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-2/3 h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:hidden">
            <FontAwesomeIcon
              icon={media === 'movie' ? faClapperboard : faTv}
              size="6x"
              className="max-w-10 opacity-40"
            />
          </div>
        )}

        {hasBackdropImage ? (
          <div className="relative hidden aspect-video h-full rounded-[22px] bg-neutral-900 lg:block">
            <ProgressiveImage
              paths={backdropPaths}
              alt={title}
              className="absolute inset-0 aspect-video h-full scale-150 rounded-[22px] object-cover opacity-30 blur-2xl"
              minSize="w342"
              maxSize="w342"
              loading="lazy"
            />

            <ProgressiveImage
              paths={backdropPaths}
              alt={title}
              className="aspect-video h-full rounded-[22px] object-cover"
              onNoImage={() => setHasBackdropImage(false)}
              minSize="w342"
              maxSize="w342"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="hidden aspect-video h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:flex">
            <FontAwesomeIcon
              icon={media === 'movie' ? faClapperboard : faTv}
              size="6x"
              className="max-w-10 opacity-40"
            />
          </div>
        )}

        <div className="flex flex-col justify-between p-3 lg:p-4">
          <div className={cn('flex justify-between gap-3', showFollow && onToggleFollow && 'pr-24')}>
            <div className="flex flex-col">
              <h2 className="line-clamp-1 text-lg leading-6 font-semibold">{title}</h2>
              {subtitle && <p className="line-clamp-1 text-sm text-neutral-400">{subtitle}</p>}
            </div>

            {rightContent}
          </div>

          <p className="line-clamp-4 text-sm leading-snug text-neutral-400">{overview}</p>
        </div>
      </Link>

      {showFollow && onToggleFollow && (
        <Button
          variant="frost"
          size={followButtonText ? 'small' : 'iconSmall'}
          className="absolute top-1 right-1 z-10 gap-2 px-2 pl-3 disabled:opacity-100"
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
