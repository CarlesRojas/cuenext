import { api } from '#/../convex/_generated/api'
import { ShowSeason } from '#/component/ShowSeason'
import type { TmdbTv } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { useQueries } from '@tanstack/react-query'

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

  const seasons = seasonQueries
    .map(query => query.data)
    .filter((season): season is NonNullable<typeof season> => season != null)

  const specials = seasons.find(season => season.season_number === 0)
  const regularSeasons = seasons.filter(season => season.season_number !== 0)

  const allSeasonsLoaded = seasonQueries.every(query => !query.isPending)
  if (allSeasonsLoaded && seasons.length === 0) return null

  const episodeNumbersResetWithSeason = !regularSeasons.some(season => {
    const episodes = season.episodes
    if (!episodes) return false
    return episodes.some(episode => episode.episode_number > episodes.length)
  })

  return (
    <div className="screen-px pb-4 md:pb-8">
      <div className="page-width mx-[unset] flex flex-col gap-4">
        {regularSeasons.map(season => (
          <ShowSeason
            key={season.id}
            showId={show.id}
            season={season}
            episodeNumbersResetWithSeason={episodeNumbersResetWithSeason}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
          />
        ))}

        {specials && (
          <ShowSeason
            key={specials.id}
            showId={show.id}
            season={specials}
            isSpecials
            episodeNumbersResetWithSeason={episodeNumbersResetWithSeason}
            showName={show.name}
            showPoster={show.poster_path}
            showBackdrop={show.backdrop_path}
          />
        )}
      </div>
    </div>
  )
}
