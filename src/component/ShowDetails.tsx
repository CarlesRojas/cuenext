import { CommunityRating } from '#/component/CommunityRating'
import { ProgressiveImage } from '#/component/ProgressiveImage'
import { RateButton } from '#/component/RateButton'
import { StarRating } from '#/component/StarRating'
import { Button } from '#/component/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/component/ui/dropdown-menu'
import { ShowMore } from '#/component/ui/show-more'
import { useFavoriteEpisode } from '#/hooks/useFavoriteEpisode'
import { useFollowEpisode } from '#/hooks/useFollowEpisode'
import { useStopEpisode } from '#/hooks/useStopEpisode'
import { cn } from '#/lib/cn'
import type { TmdbTv } from '#/type/tmdb'
import { faBookmark, faEllipsis, faHeart, faPlay, faStop } from '@fortawesome/free-solid-svg-icons'
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
          'screen-px screen-py z-10 flex flex-col gap-1 pt-[28dvh] transition-[padding]',
          'md:pt-[25dvh] lg:pt-[30dvh] xl:pt-[35dvh]',
          !hasImage && 'pt-23!',
        )}
      >
        <div className="flex w-full flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">{name}</h1>

          <p className="leading-snug font-medium tracking-wide text-white/60">
            {[formattedReleaseDate, seasonsText].filter(Boolean).join(' • ')}
          </p>
        </div>

        <div className="mb-2 flex w-full max-w-3xl items-start justify-between gap-2">
          <div className="flex flex-wrap items-start gap-x-5">
            <StarRating voteAverage={show.vote_average} voteCount={show.vote_count} label="TMDB" />
            <CommunityRating type="tv" tmdbId={id} />
          </div>

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
                  onClick={() => toggleFollow(id, name)}
                  disabled={isFollowedLoading}
                >
                  <FontAwesomeIcon icon={faBookmark} className="size-4" />
                  <span>{'Untrack'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => toggleStopped(id, name)}
                  disabled={isStoppedLoading}
                  variant={isStopped ? 'default' : 'destructive'}
                >
                  <FontAwesomeIcon icon={isStopped ? faPlay : faStop} className="size-5" />
                  <span>{isStopped ? 'Resume Watching' : 'Stop Watching'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isFollowed && (
              <Button variant="default" onClick={() => toggleFollow(id, name)} disabled={isFollowedLoading}>
                <FontAwesomeIcon icon={faBookmark} className="size-4" />
                <span>{'Track'}</span>
              </Button>
            )}

            <RateButton type="tv" tmdbId={id} title={name} />

            <Button
              size="icon"
              variant="favorite"
              onClick={() => toggleFavorite(id, name)}
              disabled={isFavoritedLoading}
              data-state={!isFavoritedLoading && isFavorited ? 'on' : 'off'}
            >
              <FontAwesomeIcon icon={faHeart} className="size-5" />
            </Button>
          </div>
        </div>

        {overview && <ShowMore lines={2} text={overview} containerClassName="max-w-3xl" />}

        {(genres || status) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {status && (
              <p
                className={cn(
                  'w-fit rounded-full bg-green-500/10 px-2 text-xs leading-6 font-medium tracking-wide text-green-400/80 capitalize backdrop-blur-md',
                  ['ended', 'canceled'].includes(status.toLowerCase()) && 'bg-red-500/10 text-red-400/80',
                )}
              >
                {status}
              </p>
            )}

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
