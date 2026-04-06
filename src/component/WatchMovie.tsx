import { PosterCard } from '#/component/PosterCard'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { MovieSectionItem } from '#/type/section'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  const { isWatched, isWatchedLoading, handleToggleWatch } = useWatchMovie(movie)

  return (
    <PosterCard
      id={movie.tmdbId}
      title={movie.name}
      media="movie"
      imageUrl={getTmdbImageUrl(movie.poster, 'w342') || getTmdbImageUrl(movie.poster, 'original')}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      isWatchLoading={isWatchedLoading}
    />
  )
}
