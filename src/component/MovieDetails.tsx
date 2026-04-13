import { ProgressiveImage } from '#/component/ProgressiveImage'
import { StarRating } from '#/component/StarRating'
import { Button } from '#/component/ui/button'
import { ShowMore } from '#/component/ui/show-more'
import { useFavoriteMovie } from '#/hooks/useFavoriteMovie'
import { useFollowMovie } from '#/hooks/useFollowMovie'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { cn } from '#/lib/cn'
import type { TmdbMovie } from '#/type/tmdb'
import { faBookmark, faEye, faHeart, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface MovieDetailsProps {
  movie: TmdbMovie
}

export function MovieDetails({ movie }: MovieDetailsProps) {
  const { id, title, poster_path, backdrop_path, release_date, runtime, overview, status, genres, tagline } = movie

  const { isFollowed, isFollowedLoading, toggleFollow } = useFollowMovie(movie)
  const { isFavorited, isFavoritedLoading, toggleFavorite } = useFavoriteMovie(movie)
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
          className="absolute inset-0 aspect-video max-h-[50dvh] min-h-[30dvh] max-w-dvw min-w-dvw overflow-hidden"
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
          'screen-px screen-py z-10 flex flex-col gap-3 pt-[20dvh] transition-[padding] md:pt-[25dvh] lg:pt-[30dvh] xl:pt-[35dvh]',
          !hasImage && 'pt-23!',
        )}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">{title}</h1>

        <p className="leading-snug font-medium tracking-wide">
          {[formattedReleaseDate, runtimeText, tagline].filter(Boolean).join(' • ')}
        </p>

        {(genres || status) && (
          <div className="flex flex-wrap gap-2">
            {genres?.map(genre => (
              <p
                key={genre.id}
                className="w-fit rounded-full border border-neutral-500/40 bg-white/10 px-2 py-px text-sm leading-6 font-medium tracking-wide backdrop-blur-md"
              >
                {genre.name}
              </p>
            ))}

            <p
              className={cn(
                'w-fit rounded-full border border-green-500/30 bg-green-500/10 px-2 py-px text-sm leading-6 font-medium tracking-wide text-green-400/70 capitalize backdrop-blur-md',
                !isReleased && 'border-blue-500/30 bg-blue-500/10 text-blue-400/70',
              )}
            >
              {releaseStatus}
            </p>
          </div>
        )}

        <StarRating voteAverage={movie.vote_average} voteCount={movie.vote_count} />

        {overview && <ShowMore lines={3} text={overview} containerClassName="max-w-3xl" />}

        <div className="flex max-w-3xl flex-wrap gap-2">
          <Button
            variant={isFollowed ? 'negative' : 'default'}
            onClick={() => toggleFollow(id, title)}
            disabled={isFollowedLoading}
          >
            <FontAwesomeIcon icon={isFollowed ? faMinus : faBookmark} className="size-4" />
            <span>{isFollowed ? 'Untrack' : 'Track'}</span>
          </Button>

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

          <Button
            size="icon"
            variant="favorite"
            onClick={() => toggleFavorite(id, title)}
            disabled={isFavoritedLoading}
            data-state={!isFavoritedLoading && isFavorited ? 'on' : 'off'}
          >
            <FontAwesomeIcon icon={isFavoritedLoading ? faSpinner : faHeart} className="size-5" />
          </Button>
        </div>
      </section>
    </div>
  )
}
