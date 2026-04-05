import { api } from '#/../convex/_generated/api'
import { MovieDetails } from '#/component/MovieDetails'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/movie/$tmdbId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { tmdbId } = Route.useParams()
  const tmdbIdNumber = Number(tmdbId)

  const movie = useQuery({
    ...convexAction(api.tmdb.getMovieDetails, { tmdbId: tmdbIdNumber }),
  })

  return <div className="flex w-full flex-col gap-8">{movie.data && <MovieDetails movie={movie.data} />}</div>
}
