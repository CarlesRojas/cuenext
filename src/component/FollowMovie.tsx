import { PosterCard } from '#/component/PosterCard'
import { useFollowMovie } from '#/hooks/useFollowMovie'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbMovie } from '#/type/tmdb'

interface Props {
  movie: TmdbMovie
  number?: number
}

export default function WatchMovie({ movie, number }: Props) {
  const { isFollowed, isLoading, toggleFollow } = useFollowMovie(movie)

  return (
    <PosterCard
      mediaType="movie"
      key={movie.id}
      id={movie.id}
      title={movie.title}
      number={number}
      imageUrl={getTmdbImageUrl(movie.poster_path, 'w342') || undefined}
      showFollow
      isFollowed={isFollowed}
      onToggleFollow={() => toggleFollow(movie.id, movie.title)}
      isFollowLoading={isLoading}
    />
  )
}
