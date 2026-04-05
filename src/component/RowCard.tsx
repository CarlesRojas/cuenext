import { Button } from '#/component/ui/button'
import type { MediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { faClapperboard, faPlus, faSpinner, faTv } from '@fortawesome/free-solid-svg-icons'
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
  subtitle?: string
  posterUrl?: string
  backdropUrl?: string
  overview: string

  showFollow?: boolean
  followButtonText?: string
  isFollowed?: boolean
  onToggleFollow?: () => void
  isFollowLoading?: boolean
}

type Props = LoadingProps | LoadedProps

export default function RowCard(props: Props) {
  if (props.isLoading) {
    return (
      <div
        className={cn(
          'relative flex animate-pulse gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'h-40 max-h-40 min-h-40 w-full',
          'transition-opacity duration-300',
          props.className,
        )}
      />
    )
  }

  const {
    className,

    id,
    title,
    mediaType,
    posterUrl,
    backdropUrl,
    subtitle,
    overview,

    followButtonText,
    showFollow = false,
    isFollowed = false,
    onToggleFollow,
    isFollowLoading = false,
  } = props

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
        to={`/${mediaType}/${id}` as LinkProps['to']}
        className="relative grid h-full w-full grid-cols-[auto_1fr] grid-rows-1 gap-2 overflow-hidden rounded-[22px] border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform duration-300 hover:scale-[1.05] focus-visible:scale-[1.05] disabled:pointer-events-none"
        disabled={isFollowLoading}
      >
        {posterUrl ? (
          <>
            <img
              src={posterUrl}
              alt={title}
              className="absolute inset-y-0 left-0 aspect-2/3 h-full scale-200 rounded-[22px] object-cover opacity-30 blur-2xl lg:hidden"
              loading="lazy"
            />

            <img
              src={posterUrl}
              alt={title}
              className="relative aspect-2/3 h-full rounded-[22px] object-cover lg:hidden"
              loading="lazy"
            />
          </>
        ) : (
          <div className="flex aspect-2/3 h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:hidden">
            <FontAwesomeIcon
              icon={mediaType === 'movie' ? faClapperboard : faTv}
              size="6x"
              className="max-w-10 opacity-40"
            />
          </div>
        )}

        {backdropUrl ? (
          <>
            <img
              src={backdropUrl}
              alt={title}
              className="absolute inset-0 hidden aspect-video h-full scale-150 rounded-[22px] object-cover opacity-30 blur-2xl lg:block"
              loading="lazy"
            />

            <img
              src={backdropUrl}
              alt={title}
              className="relative hidden aspect-video h-full rounded-[22px] object-cover lg:block"
              loading="lazy"
            />
          </>
        ) : (
          <div className="hidden aspect-video h-full items-center justify-center rounded-[22px] bg-neutral-900 lg:flex">
            <FontAwesomeIcon
              icon={mediaType === 'movie' ? faClapperboard : faTv}
              size="6x"
              className="max-w-10 opacity-40"
            />
          </div>
        )}

        <div className="flex flex-col justify-between p-3 lg:p-4">
          <div className={cn('flex flex-col', showFollow && onToggleFollow && 'pr-24')}>
            <h2 className="line-clamp-1 text-lg leading-6 font-semibold">{title}</h2>
            {subtitle && <p className="line-clamp-1 text-sm text-neutral-400">{subtitle}</p>}
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
          title={isFollowed ? 'Unfollow' : 'Follow'}
          disabled={isFollowLoading}
        >
          {followButtonText && <span className="text-sm">{followButtonText}</span>}
          <FontAwesomeIcon icon={isFollowLoading ? faSpinner : faPlus} spin={isFollowLoading} />
        </Button>
      )}
    </div>
  )
}
