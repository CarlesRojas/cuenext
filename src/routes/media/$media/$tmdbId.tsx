import { api } from '#/../convex/_generated/api'
import { MovieDetails } from '#/component/MovieDetails'
import { ShowDetails } from '#/component/ShowDetails'
import { ShowSeasons } from '#/component/ShowSeasons'
import type { TmdbSeason } from '#/type/tmdb'
import { convexAction } from '@convex-dev/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/media/$media/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId, media } = Route.useParams()
  const tmdbIdNumber = Number(tmdbId)

  const show = useQuery({
    ...convexAction(api.tmdb.getShowDetails, { tmdbId: tmdbIdNumber }),
    enabled: media === 'tv',
  })

  const movie = useQuery({
    ...convexAction(api.tmdb.getMovieDetails, { tmdbId: tmdbIdNumber }),
    enabled: media === 'movie',
  })

  const seasonQueries = useQueries({
    queries: (show.data?.seasons || []).map(season => ({
      ...convexAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: tmdbIdNumber,
        seasonNumber: season.season_number,
      }),
      enabled: media === 'tv' && !!show.data?.seasons?.length,
    })),
  })

  const seasons = seasonQueries.map(query => query.data).filter(Boolean)
  const allSeasonsLoaded = seasonQueries.every(query => !query.isPending)

  return (
    <div className="flex w-full flex-col gap-8">
      {media === 'movie' && movie.data && <MovieDetails movie={movie.data} />}

      {media === 'tv' && show.data && <ShowDetails show={show.data} />}

      {media === 'tv' && show.data && allSeasonsLoaded && seasons.length > 0 && (
        <ShowSeasons show={show.data} seasons={seasons as TmdbSeason[]} />
      )}
    </div>
  )
}
