import { CombinedRating } from '#/component/CombinedRating'
import { ProgressiveImage } from '#/component/ProgressiveImage'
import { RateButton } from '#/component/RateButton'
import { Button } from '#/component/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/component/ui/dropdown-menu'
import { ShowMore } from '#/component/ui/show-more'
import { useFollowMovie } from '#/hooks/useFollowMovie'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { cn } from '#/lib/cn'
import type { TmdbMovie } from '#/type/tmdb'
import { faBookmark, faEllipsis, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface MovieDetailsProps {
  movie: TmdbMovie
}

export function MovieDetails({ movie }: MovieDetailsProps) {
  const { id, title, poster_path, backdrop_path, release_date, runtime, overview, status, genres } = movie

  const { isFollowed, isFollowedLoading, toggleFollow } = useFollowMovie(movie)
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchMovie({
    ...movie,
    name: title,
    poster: poster_path,
    backdrop: backdrop_path,
    tmdbId: id,
    releaseDate: new Date(release_date).getTime(),
  })

  const runtimeText = runtime
    ? (() => {
        const hours = Math.floor(runtime / 60)
        const minutes = runtime % 60
        if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`

        return `${minutes}min`
      })()
    : null

  const [hasImage, setHasImage] = useState(true)

  const formattedReleaseDate = release_date
    ? new Date(release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  const isReleased = release_date ? new Date(release_date) <= new Date() : true
  const releaseStatus = isReleased ? 'released' : 'coming soon'

  return (
    <div className="flex h-fit w-full flex-col gap-8">
      {hasImage && (
        <section
          className={cn(
            'absolute inset-0 max-h-[40dvh] min-h-[40dvh] max-w-dvw min-w-dvw overflow-hidden',
            'md:aspect-video md:max-h-[50dvh] md:min-h-[30dvh]',
          )}
          style={{ maskImage: 'linear-gradient(to bottom, black 30%, transparent)' }}
        >
          <ProgressiveImage
            paths={[backdrop_path, poster_path]}
            onNoImage={() => setHasImage(false)}
            className="h-full max-h-full w-full max-w-full object-cover object-center"
            alt={title}
            minSize="w342"
          />

          <div
            className="absolute inset-0 size-full backdrop-blur"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 30%, black)' }}
          />

          <div className="absolute inset-0 size-full bg-radial from-transparent from-40% to-neutral-950 to-90%" />
        </section>
      )}

      {/* If these paddings change, change them in the onScroll function in src/routes/media/$media/$tmdbId.tsx */}
      <section
        className={cn(
          'screen-px screen-py z-10 flex flex-col gap-1 pt-[28dvh] transition-[padding]',
          'md:pt-[25dvh] lg:pt-[30dvh] xl:pt-[35dvh]',
          !hasImage && 'pt-23!',
        )}
      >
        <div className="flex w-full flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">{title}</h1>

          <p className="leading-snug font-medium tracking-wide text-white/60">
            {[formattedReleaseDate, runtimeText].filter(Boolean).join(' • ')}
          </p>
        </div>

        <div className="mb-2 flex w-full max-w-3xl items-start justify-between gap-2">
          <CombinedRating type="movie" tmdbId={id} tmdbAverage={movie.vote_average} tmdbCount={movie.vote_count} />

          <div className="flex w-fit flex-row-reverse flex-wrap gap-2">
            <DropdownMenu>
              {isFollowed && (
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary">
                    <FontAwesomeIcon icon={faEllipsis} className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
              )}

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => toggleFollow(id, title)}
                  disabled={isFollowedLoading}
                >
                  <FontAwesomeIcon icon={faBookmark} className="size-4" />
                  <span>{'Untrack'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isFollowed && (
              <Button variant="default" onClick={() => toggleFollow(id, title)} disabled={isFollowedLoading}>
                <FontAwesomeIcon icon={faBookmark} className="size-4" />
                <span>{'Track'}</span>
              </Button>
            )}

            <RateButton type="movie" tmdbId={id} title={title} poster={poster_path} backdrop={backdrop_path} />

            {isReleased && (
              <Button
                variant="watch"
                size="icon"
                data-state={isWatched ? 'on' : 'off'}
                title={isWatched ? 'Mark Unwatched' : 'Mark Watched'}
                onClick={() => onToggleWatch()}
                disabled={isWatchedLoading}
              >
                <FontAwesomeIcon icon={isWatchedLoading ? faSpinner : faEye} className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {overview && <ShowMore lines={2} text={overview} containerClassName="max-w-3xl" />}

        {(genres || status) && (
          <div className="mt-2 flex flex-wrap gap-1">
            <p
              className={cn(
                'w-fit rounded-full bg-green-500/10 px-2 text-xs leading-6 font-medium tracking-wide text-green-400/80 capitalize backdrop-blur-md',
                !isReleased && 'bg-blue-500/10 text-blue-400/80',
              )}
            >
              {releaseStatus}
            </p>

            {genres?.map(genre => (
              <p
                key={genre.id}
                className="w-fit rounded-full bg-white/10 px-2 text-xs leading-6 font-medium tracking-wide text-white/80 backdrop-blur-md"
              >
                {genre.name}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
