import { api } from '#/../convex/_generated/api'
import { ShowDetails } from '#/component/ShowDetails'
import { convexAction } from '@convex-dev/react-query'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tv/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId } = Route.useParams()
  const tmdbIdNumber = Number(tmdbId)

  const show = useQuery({
    ...convexAction(api.tmdb.getShowDetails, { tmdbId: tmdbIdNumber }),
  })

  const seasonQueries = useQueries({
    queries: (show.data?.seasons || []).map(season => ({
      ...convexAction(api.tmdb.getShowSeasonDetails, {
        tmdbId: tmdbIdNumber,
        seasonNumber: season.season_number,
      }),
      enabled: !!show.data?.seasons?.length,
    })),
  })

  const seasons = seasonQueries.map(query => query.data).filter(Boolean)
  const allSeasonsLoaded = seasonQueries.every(query => !query.isPending)

  return (
    <div className="flex w-full flex-col gap-8">
      {show.data && <ShowDetails show={show.data} />}

      {/* {show.data && allSeasonsLoaded && seasons.length > 0 && (
        <ShowSeasons show={show.data} seasons={seasons as TmdbSeason[]} />
      )} */}
    </div>
  )
}
