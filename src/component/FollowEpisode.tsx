import { PosterCard } from '#/component/PosterCard'
import RowCard from '#/component/RowCard'
import { useFollowEpisode } from '#/hooks/useFollowEpisode'
import type { TmdbTvMinimal } from '#/type/tmdb'

interface Props {
  episode: TmdbTvMinimal
  variant: 'poster' | 'row'
  number?: number
  followButtonText?: string
}

export default function FollowEpisode({ episode, variant, number, followButtonText }: Props) {
  const { isFollowed, isFollowedLoading, toggleFollow } = useFollowEpisode(episode)

  const { id, name, overview, poster_path, backdrop_path, first_air_date } = episode

  if (variant === 'row') {
    const releaseDate = first_air_date ? new Date(first_air_date) : null
    const formattedReleaseDate = releaseDate
      ? releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : undefined

    return (
      <RowCard
        media="tv"
        key={id}
        id={id}
        title={name}
        posterPath={poster_path}
        backdropPath={backdrop_path}
        subtitle={formattedReleaseDate}
        overview={overview}
        showFollow
        isFollowed={isFollowed}
        onToggleFollow={() => toggleFollow(id, name)}
        isFollowLoading={isFollowedLoading}
        followButtonText={followButtonText}
      />
    )
  }

  return (
    <PosterCard
      media="tv"
      key={id}
      id={id}
      title={name}
      imagePaths={[poster_path, backdrop_path]}
      number={number}
      showFollow
      isFollowed={isFollowed}
      onToggleFollow={() => toggleFollow(id, name)}
      isFollowLoading={isFollowedLoading}
      followButtonText={followButtonText}
    />
  )
}
