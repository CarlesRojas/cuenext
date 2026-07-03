import { PosterCard } from '#/component/PosterCard'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import type { MovieSectionItem } from '#/type/section'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  // Section items carry watchedAt, so the card needs no lookup.
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchMovie(movie, !!movie.watchedAt)

  return (
    <PosterCard
      id={movie.tmdbId}
      title={movie.name}
      media="movie"
      imagePaths={[movie.poster, movie.backdrop]}
      showWatch
      isWatched={isWatched}
      onToggleWatch={onToggleWatch}
      isWatchLoading={isWatchedLoading}
    />
  )
}
