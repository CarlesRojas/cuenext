import { PosterCard } from '#/component/PosterCard'
import RowCard from '#/component/RowCard'
import { useFollowMovie } from '#/hooks/useFollowMovie'

import type { TmdbMovieMinimal } from '#/type/tmdb'

interface Props {
  movie: TmdbMovieMinimal
  variant: 'poster' | 'row'
  number?: number
  followButtonText?: string
}

export default function FollowMovie({ movie, variant, number, followButtonText }: Props) {
  const { isFollowed, isFollowedLoading, toggleFollow } = useFollowMovie(movie)

  const { id, title, overview, poster_path, backdrop_path, release_date } = movie

  if (variant === 'row') {
    const releaseDate = release_date ? new Date(release_date) : null
    const formattedReleaseDate = releaseDate
      ? releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : undefined

    return (
      <RowCard
        media="movie"
        key={id}
        id={id}
        title={title}
        posterPath={poster_path}
        backdropPath={backdrop_path}
        subtitle={formattedReleaseDate}
        overview={overview}
        showFollow
        isFollowed={isFollowed}
        onToggleFollow={() => toggleFollow(id, title)}
        isFollowLoading={isFollowedLoading}
        followButtonText={followButtonText}
      />
    )
  }

  return (
    <PosterCard
      media="movie"
      key={id}
      id={id}
      title={title}
      number={number}
      imagePaths={[poster_path, backdrop_path]}
      showFollow
      isFollowed={isFollowed}
      onToggleFollow={() => toggleFollow(id, title)}
      isFollowLoading={isFollowedLoading}
    />
  )
}
