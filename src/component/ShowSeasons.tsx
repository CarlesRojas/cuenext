import ShowEpisode from '#/component/ShowEpisode'
import { ShowSeason } from '#/component/ShowSeason'
import { useShowBundle } from '#/hooks/useShowBundle'
import { useShowWatchState } from '#/hooks/useShowWatchState'
import { cn } from '#/lib/cn'
import type { TmdbTv } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'

interface Props {
  show: TmdbTv
}

export function ShowSeasons({ show }: Props) {
  const clerk = useClerk()

  // One request carrying the show and every season, rather than one request per season. It
  // also carries the episode numbering the page needs, so there is no separate showInfo
  // lookup here either.
  const { regularSeasons, continuousEpisodeNumbers } = useShowBundle(show.id)

  const { watchedEpisodes, nextEpisode } = useShowWatchState(show.id, clerk.isSignedIn)

  if (regularSeasons.length === 0) return null

  const completeNextEpisode = nextEpisode
    ? regularSeasons
        .flatMap(season => season.episodes || [])
        .find(
          episode =>
            episode.season_number - 1 === nextEpisode.seasonNumber &&
            episode.episode_number - 1 === nextEpisode.episodeNumber,
        )
    : null

  return (
    <div className="screen-px pb-8">
      <div className="page-width flex flex-col gap-3">
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
          <h2 className={cn('text-lg font-semibold opacity-80', completeNextEpisode && 'mt-8')}>All episodes</h2>
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
            seasonWatchedEpisodes={watchedEpisodes?.filter(we => we.seasonNumber === season.season_number - 1)}
            previousUnwatchedEpisodes={
              watchedEpisodes
                ? regularSeasons
                    .slice(0, index)
                    .flatMap(s => s.episodes || [])
                    .filter(
                      ep =>
                        !watchedEpisodes.some(
                          we => we.seasonNumber === ep.season_number - 1 && we.episodeNumber === ep.episode_number - 1,
                        ),
                    )
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
