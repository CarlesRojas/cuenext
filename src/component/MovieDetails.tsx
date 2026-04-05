import { Button } from '#/component/ui/button'
import { useFavoriteMovie } from '#/hooks/useFavoriteMovie'
import { useFollowMovie } from '#/hooks/useFollowMovie'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { cn } from '#/lib/cn'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovie } from '#/type/tmdb'
import { faEye, faEyeSlash, faHeart, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface MovieDetailsProps {
  movie: TmdbMovie
}

export function MovieDetails({ movie }: MovieDetailsProps) {
  const { id, title, poster_path, backdrop_path, release_date, runtime, overview, status, genres, tagline } = movie

  const { isFollowed, isLoading: isFollowLoading, toggleFollow } = useFollowMovie(movie)
  const { isFavorited, isLoading: isFavoriteLoading, toggleFavorite } = useFavoriteMovie(movie)
  const {
    isWatched,
    isLoading: isWatchLoading,
    handleToggleWatch,
  } = useWatchMovie({
    ...movie,
    name: title,
    poster: poster_path,
    tmdbId: id,
  })

  const runtimeText = runtime ? `${runtime} min` : null

  const posterUrl = getTmdbImageUrl(poster_path, 'original')
  const backdropUrl = getTmdbImageUrl(backdrop_path, 'original') || posterUrl

  const formattedReleaseDate = release_date
    ? new Date(release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

  const isReleased = release_date ? new Date(release_date) <= new Date() : true
  const releaseStatus = isReleased ? 'released' : 'coming soon'

  return (
    <div className="flex h-fit w-full flex-col gap-8">
      <section
        className="absolute inset-0 aspect-video max-h-[50dvh] min-h-[30dvh] max-w-dvw min-w-dvw overflow-hidden"
        style={{ maskImage: 'linear-gradient(to bottom, black 30%, transparent)' }}
      >
        <img src={backdropUrl} alt={title} className="h-full max-h-full w-full max-w-full object-cover object-center" />

        <div
          className="absolute inset-0 size-full backdrop-blur"
          style={{ maskImage: 'linear-gradient(to bottom, transparent 30%, black)' }}
        />

        <div className="absolute inset-0 size-full bg-radial from-transparent from-40% to-neutral-950 to-90%" />
      </section>

      <section className="screen-px screen-py z-10 flex flex-col gap-3 pt-[20dvh] transition-[padding] md:pt-[25dvh] lg:pt-[30dvh] xl:pt-[35dvh]">
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

        {overview && <p className="max-w-3xl leading-relaxed font-medium tracking-wide text-white/60">{overview}</p>}

        <div className="flex max-w-3xl flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toggleFollow(id, title)} disabled={isFollowLoading}>
            <FontAwesomeIcon icon={isFollowed ? faMinus : faPlus} className="size-4" />
            <span>{isFollowed ? 'Unfollow' : 'Follow'}</span>
          </Button>

          {!isFollowLoading && isFollowed && (
            <Button variant="secondary" onClick={() => handleToggleWatch()} disabled={isWatchLoading}>
              <FontAwesomeIcon icon={isWatched ? faEyeSlash : faEye} className="size-4" />
              <span>{isWatched ? 'Mark as Unwatched' : 'Mark as Watched'}</span>
            </Button>
          )}

          {!isFollowLoading && isFollowed && (
            <Button
              size="icon"
              variant="favorite"
              onClick={() => toggleFavorite(id, title)}
              disabled={isFavoriteLoading}
              data-state={!isFavoriteLoading && isFavorited ? 'on' : 'off'}
            >
              <FontAwesomeIcon icon={faHeart} className="size-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
