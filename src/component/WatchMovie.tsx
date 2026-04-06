import { PosterCard } from '#/component/PosterCard'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import type { MovieSectionItem } from '#/type/section'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchMovie(movie)

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
