import { cn } from '#/lib/cn'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { Link } from '@tanstack/react-router'

interface CommonProps {
  className?: string
}

interface LoadingProps extends CommonProps {
  isLoading: true
}

interface LoadedProps extends CommonProps, TmdbTvMinimal {
  isLoading?: false
}

type Props = LoadingProps | LoadedProps

export function SearchEpisode(props: Props) {
  if (props.isLoading) {
    return (
      <div
        className={cn(
          'relative flex animate-pulse gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl',
          'h-40 max-h-40 min-h-40 w-full',
          'transition-opacity duration-300',
          props.className,
        )}
      />
    )
  }

  const { id, className, name, overview, poster_path, backdrop_path, first_air_date } = props

  const posterUrl = getTmdbImageUrl(poster_path, 'w342') || getTmdbImageUrl(poster_path, 'original') || null
  const backdropUrl = getTmdbImageUrl(backdrop_path, 'w780') || getTmdbImageUrl(backdrop_path, 'original') || null

  return (
    <div
      className={cn(
        'group/poster relative flex',
        'h-40 max-h-40 min-h-40 w-full',
        // isWatchLoading || isFollowLoading ? 'pointer-events-none' : '',
        className,
      )}
    >
      <Link
        to="/tv/$tmdbId"
        params={{ tmdbId: id.toString() }}
        className="relative grid h-full w-full grid-cols-[auto_1fr] grid-rows-1 gap-2 overflow-hidden rounded-2xl border border-neutral-500/40 bg-neutral-800 shadow-xl transition-transform duration-300 hover:scale-[1.05] focus-visible:scale-[1.05] disabled:pointer-events-none"
        // disabled={isWatchLoading || isFollowLoading}
      >
        {posterUrl ? (
          <>
            <img
              src={posterUrl}
              alt={name}
              className="absolute inset-y-0 left-0 aspect-2/3 h-full scale-200 rounded-2xl object-cover opacity-30 blur-2xl lg:hidden"
              loading="lazy"
            />

            <img
              src={posterUrl}
              alt={name}
              className="relative aspect-2/3 h-full rounded-2xl object-cover lg:hidden"
              loading="lazy"
            />
          </>
        ) : (
          <div className="flex aspect-2/3 h-full items-center justify-center rounded-2xl bg-neutral-900 text-center text-base text-neutral-500 lg:hidden" />
        )}

        {backdropUrl ? (
          <>
            <img
              src={backdropUrl}
              alt={name}
              className="absolute inset-0 hidden aspect-video h-full scale-150 rounded-2xl object-cover opacity-30 blur-2xl lg:block"
              loading="lazy"
            />

            <img
              src={backdropUrl}
              alt={name}
              className="relative hidden aspect-video h-full rounded-2xl object-cover lg:block"
              loading="lazy"
            />
          </>
        ) : (
          <div className="hidden aspect-video h-full items-center justify-center rounded-2xl bg-neutral-900 text-center text-base text-neutral-500 lg:block" />
        )}

        <div className="flex flex-col justify-between p-3 lg:p-4">
          <div className="flex flex-col">
            <h2 className="line-clamp-1 text-lg leading-6 font-semibold">{name}</h2>
            <p className="line-clamp-1 text-sm text-neutral-400">{first_air_date}</p>
          </div>

          <p className="line-clamp-4 text-sm leading-snug text-neutral-400">{overview}</p>
        </div>
      </Link>

      {/* {showWatch && onToggleWatch && (
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
          size="iconSmall"
          className="absolute top-1 right-1 z-10 disabled:opacity-100"
          onClick={e => {
            e.preventDefault()
            onToggleFollow()
          }}
          data-checked={!isFollowLoading && isFollowed}
          title={isFollowed ? 'Unfollow' : 'Follow'}
          disabled={isFollowLoading}
        >
          <FontAwesomeIcon icon={isFollowLoading ? faSpinner : faPlus} spin={isFollowLoading} />
        </Button>
      )} */}
    </div>
  )
}
