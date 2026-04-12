import { api } from '#/../convex/_generated/api'
import ShowEpisode from '#/component/ShowEpisode'
import { ShowSeason } from '#/component/ShowSeason'
import useShowInfo from '#/hooks/useShowInfo'
import { cn } from '#/lib/cn'
import type { TmdbTv } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'

interface Props {
  show: TmdbTv
}

export function ShowSeasons({ show }: Props) {
  const clerk = useClerk()

  const seasonQueries = useQueries({
    queries: (show.seasons || []).map(season => ({
      ...convexAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: show.id,
        seasonNumber: season.season_number,
      }),
      enabled: !!show.seasons?.length,
    })),
  })

  const watchedEpisodes = useQuery({
    ...convexQuery(api.watch.getWatchedEpisodesForShow, { showTmdbId: show.id }),
    enabled: clerk.isSignedIn,
  })

  const showInfo = useShowInfo({ showId: show.id })

  const nextEpisode = useQuery({
    ...convexQuery(api.watch.getNextEpisode, { tmdbId: show.id }),
  })

  const seasons = seasonQueries
    .map(query => query.data)
    .filter((season): season is NonNullable<typeof season> => season != null)

  // const specials = seasons.find(season => season.season_number === 0)
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

  if (regularSeasons.length <= 0) return null

  const continuousEpisodeNumbers = showInfo.data?.continuousEpisodeNumbers || regularSeasons.length === 1

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

        {regularSeasons.map((season, index) => (
          <ShowSeason
            key={season.id}
            showId={show.id}
            season={season}
            continuousEpisodeNumbers={continuousEpisodeNumbers}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
            seasonWatchedEpisodes={watchedEpisodes.data?.filter(we => we.seasonNumber === season.season_number - 1)}
            previousUnwatchedEpisodes={
              watchedEpisodes.data
                ? regularSeasons
                    .slice(0, index)
                    .flatMap(s => s.episodes || [])
                    .filter(
                      ep =>
                        !watchedEpisodes.data.some(
                          we => we.seasonNumber === ep.season_number - 1 && we.episodeNumber === ep.episode_number - 1,
                        ),
                    )
                : undefined
            }
          />
        ))}

        {/* {specials && (
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
            previousUnwatchedEpisodes={[]}
          />
        )} */}
      </div>
    </div>
  )
}
