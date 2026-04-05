import { PosterCard } from '#/component/PosterCard'
import { useWatchMovie } from '#/hooks/useWatchMovie'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { MovieSectionItem } from '#/type/section'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  const { isWatched, isLoading, handleToggleWatch } = useWatchMovie(movie)

  return (
    <PosterCard
      id={movie.tmdbId}
      title={movie.name}
      mediaType="movie"
      imageUrl={getTmdbImageUrl(movie.poster, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      isWatchLoading={isLoading}
    />
  )
}
