import RowCard from '#/component/RowCard'
import type { TmdbMovie } from '#/type/tmdb'

interface UpcomingMovieItem {
  tmdbId: number
  name: string
  poster: string | null
  backdrop: string | null
  type: 'movie'
  movie: TmdbMovie
  airDate: string
}

export default function UpcomingMovie(props: UpcomingMovieItem) {
  const { tmdbId, name, movie, airDate } = props

  const formattedAirDate = new Date(airDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const runtime = movie.runtime ? `${movie.runtime}m` : undefined

  const daysUntilAir = Math.ceil((new Date(airDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <RowCard
      media="movie"
      key={tmdbId}
      id={tmdbId}
      title={name}
      posterPath={movie.poster_path}
      backdropPath={movie.backdrop_path}
      subtitle={[formattedAirDate, runtime].filter(Boolean).join(' • ')}
      overview={movie.overview}
      rightContent={
        daysUntilAir > 0 && (
          <div className="flex flex-col items-end justify-center">
            <span className="text-lg leading-tight font-semibold whitespace-nowrap text-sky-500">{daysUntilAir}</span>
            <span className="text-xs leading-tight whitespace-nowrap text-sky-500">
              {daysUntilAir === 1 ? 'day' : 'days'}
            </span>
          </div>
        )
      }
    />
  )
}
