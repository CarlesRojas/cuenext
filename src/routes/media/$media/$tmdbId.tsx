import { api } from '#/../convex/_generated/api'
import BackButton from '#/component/BackButton'
import { MovieDetails } from '#/component/MovieDetails'
import { ShowDetails } from '#/component/ShowDetails'
import { ShowSeasons } from '#/component/ShowSeasons'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
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

  return (
    <div className="flex w-full flex-col gap-8">
      <BackButton className="md:left-aside fixed top-3 left-3 z-50 md:top-8" />

      {media === 'movie' && movie.data && <MovieDetails movie={movie.data} />}

      {media === 'tv' && show.data && <ShowDetails show={show.data} />}
      {media === 'tv' && show.data && <ShowSeasons show={show.data} />}
    </div>
  )
}
