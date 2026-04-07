import { api } from '#/../convex/_generated/api'
import ShowEpisode from '#/component/ShowEpisode'
import { ShowSeason } from '#/component/ShowSeason'
import { useShowInfo } from '#/hooks/useShowInfo'
import { cn } from '#/lib/cn'
import type { TmdbTv } from '#/type/tmdb'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'

interface Props {
  show: TmdbTv
}

export function ShowSeasons({ show }: Props) {
  const seasonQueries = useQueries({
    queries: (show.seasons || []).map(season => ({
      ...convexAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: show.id,
        seasonNumber: season.season_number,
      }),
      enabled: !!show.seasons?.length,
    })),
  })

  const showInfo = useShowInfo(show.id)

  const nextEpisode = useQuery({
    ...convexQuery(api.watch.getNextEpisode, { tmdbId: show.id }),
  })

  const seasons = seasonQueries
    .map(query => query.data)
    .filter((season): season is NonNullable<typeof season> => season != null)

  const specials = seasons.find(season => season.season_number === 0)
  const regularSeasons = seasons.filter(season => season.season_number !== 0)

  const allSeasonsLoaded = seasonQueries.every(query => !query.isPending)
  if (allSeasonsLoaded && seasons.length === 0) return null

  const completeNextEpisode = nextEpisode.data
    ? regularSeasons
        .flatMap(season => season.episodes || [])
        .find(
          episode =>
            nextEpisode.data &&
            episode.season_number - 1 === nextEpisode.data.seasonNumber &&
            episode.episode_number - 1 === nextEpisode.data.episodeNumber,
        )
    : null

  if (regularSeasons.length <= 0 && !specials) return null

  const continuousEpisodeNumbers = showInfo?.continuousEpisodeNumbers || regularSeasons.length === 1

  return (
    <div className="screen-px pb-4 md:pb-8">
      <div className="page-width mx-[unset] flex flex-col gap-4">
        {completeNextEpisode && <h2 className="text-lg font-semibold opacity-80">Next Episode</h2>}

        {completeNextEpisode && (
          <ShowEpisode
            episode={completeNextEpisode}
            continuousEpisodeNumbers={continuousEpisodeNumbers}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
            showId={show.id}
          />
        )}

        {regularSeasons.length > 0 && (
          <h2 className={cn('text-lg font-semibold opacity-80', completeNextEpisode && 'mt-4')}>All episodes</h2>
        )}

        {regularSeasons.map(season => (
          <ShowSeason
            key={season.id}
            showId={show.id}
            season={season}
            continuousEpisodeNumbers={continuousEpisodeNumbers}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
          />
        ))}

        {specials && (
          <h2
            className={cn(
              'tracking mt-4 text-lg font-semibold opacity-80',
              (completeNextEpisode || regularSeasons.length > 0) && 'mt-4',
            )}
          >
            Specials
          </h2>
        )}

        {specials && (
          <ShowSeason
            key={specials.id}
            showId={show.id}
            season={specials}
            isSpecials
            continuousEpisodeNumbers={continuousEpisodeNumbers}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
          />
        )}
      </div>
    </div>
  )
}
