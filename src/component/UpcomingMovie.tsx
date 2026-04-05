import RowCard from '#/component/RowCard'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
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

  const posterUrl =
    getTmdbImageUrl(movie.poster_path, 'w342') || getTmdbImageUrl(movie.poster_path, 'original') || undefined

  const backdropUrl =
    getTmdbImageUrl(movie.backdrop_path, 'w780') || getTmdbImageUrl(movie.backdrop_path, 'original') || posterUrl

  const formattedAirDate = new Date(airDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const runtime = movie.runtime ? `${movie.runtime}m` : undefined

  return (
    <RowCard
      mediaType="movie"
      key={tmdbId}
      id={tmdbId}
      title={name}
      posterUrl={posterUrl}
      backdropUrl={backdropUrl}
      subtitle={[formattedAirDate, runtime].filter(Boolean).join(' • ')}
      overview={movie.overview}
    />
  )
}
