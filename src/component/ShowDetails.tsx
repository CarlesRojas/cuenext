import { ProgressiveImage } from '#/component/ProgressiveImage'
import { StarRating } from '#/component/StarRating'
import { Button } from '#/component/ui/button'
import { ShowMore } from '#/component/ui/show-more'
import { useFavoriteEpisode } from '#/hooks/useFavoriteEpisode'
import { useFollowEpisode } from '#/hooks/useFollowEpisode'
import { useStopEpisode } from '#/hooks/useStopEpisode'
import { cn } from '#/lib/cn'
import type { TmdbTv } from '#/type/tmdb'
import { faBookmark, faHeart, faMinus, faPlay, faStop } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface ShowDetailsProps {
  show: TmdbTv
}

export function ShowDetails({ show }: ShowDetailsProps) {
  const {
    id,
    name,
    poster_path,
    backdrop_path,
    first_air_date,
    number_of_seasons,
    overview,
    status,
    seasons: seasonsWithSpecials,
    genres,
    tagline,
  } = show

  const { isFollowed, isFollowedLoading, toggleFollow } = useFollowEpisode(show)
  const { isFavorited, isFavoritedLoading, toggleFavorite } = useFavoriteEpisode(show)
  const { isStopped, isStoppedLoading, toggleStopped } = useStopEpisode(show)

  const seasons = seasonsWithSpecials?.filter(season => season.season_number !== 0)
  const numberOfSeasons = seasons?.length || number_of_seasons || null
  const seasonsText = numberOfSeasons ? `${numberOfSeasons} Season${numberOfSeasons > 1 ? 's' : ''}` : null

  const [hasImage, setHasImage] = useState(true)

  const formattedReleaseDate = first_air_date
    ? new Date(first_air_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined

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
            alt={name}
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
          'screen-px screen-py z-10 flex flex-col gap-3 pt-[28dvh] transition-[padding]',
          'md:pt-[25dvh] lg:pt-[30dvh] xl:pt-[35dvh]',
          !hasImage && 'pt-23!',
        )}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">{name}</h1>

        <p className="leading-snug font-medium tracking-wide">
          {[formattedReleaseDate, seasonsText, tagline].filter(Boolean).join(' • ')}
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

            {status && (
              <p
                className={cn(
                  'w-fit rounded-full border border-green-500/30 bg-green-500/10 px-2 py-px text-sm leading-6 font-medium tracking-wide text-green-400/70 capitalize backdrop-blur-md',
                  ['ended', 'canceled'].includes(status.toLowerCase()) &&
                    'border-red-500/30 bg-red-500/10 text-red-400/70',
                )}
              >
                {status}
              </p>
            )}
          </div>
        )}

        <StarRating voteAverage={show.vote_average} voteCount={show.vote_count} />

        {overview && <ShowMore lines={3} text={overview} containerClassName="max-w-3xl" />}

        <div className="flex w-full max-w-3xl flex-wrap gap-2">
          <Button
            variant={isFollowed ? 'negative' : 'default'}
            onClick={() => toggleFollow(id, name)}
            disabled={isFollowedLoading}
          >
            <FontAwesomeIcon icon={isFollowed ? faMinus : faBookmark} className="size-4" />
            <span>{isFollowed ? 'Untrack' : 'Track'}</span>
          </Button>

          <Button
            size="icon"
            variant="favorite"
            onClick={() => toggleFavorite(id, name)}
            disabled={isFavoritedLoading}
            data-state={!isFavoritedLoading && isFavorited ? 'on' : 'off'}
          >
            <FontAwesomeIcon icon={faHeart} className="size-5" />
          </Button>

          {!isFollowedLoading && isFollowed && (
            <Button
              variant={isStopped ? 'secondary' : 'negative'}
              onClick={() => toggleStopped(id, name)}
              disabled={isStoppedLoading}
              data-state={!isStoppedLoading && isStopped ? 'on' : 'off'}
            >
              <FontAwesomeIcon icon={isStopped ? faPlay : faStop} className="size-5" />
              <span>{isStopped ? 'Resume Watching' : 'Stop Watching'}</span>
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
