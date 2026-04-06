import { PosterCard } from '#/component/PosterCard'
import RowCard from '#/component/RowCard'
import { useFollowEpisode } from '#/hooks/useFollowEpisode'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
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

  const posterUrl = getTmdbImageUrl(poster_path, 'w342') || getTmdbImageUrl(poster_path, 'original')

  if (variant === 'row') {
    const backdropUrl =
      getTmdbImageUrl(backdrop_path, 'w780') || getTmdbImageUrl(backdrop_path, 'original') || posterUrl

    const releaseDate = first_air_date ? new Date(first_air_date) : null
    const formattedReleaseDate = releaseDate
      ? releaseDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : undefined

    return (
      <RowCard
        mediaType="tv"
        key={id}
        id={id}
        title={name}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
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
      mediaType="tv"
      key={id}
      id={id}
      title={name}
      imageUrl={posterUrl}
      number={number}
      showFollow
      isFollowed={isFollowed}
      onToggleFollow={() => toggleFollow(id, name)}
      isFollowLoading={isFollowedLoading}
      followButtonText={followButtonText}
    />
  )
}
