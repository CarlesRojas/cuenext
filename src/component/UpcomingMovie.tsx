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
    />
  )
}
