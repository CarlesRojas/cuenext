import { PosterCard } from '#/component/PosterCard'
import { useFollowEpisode } from '#/hooks/useFollowEpisode'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TmdbTv } from '#/type/tmdb'

interface Props {
  episode: TmdbTv
  number?: number
}

export default function FollowEpisode({ episode, number }: Props) {
  const { isFollowed, isLoading, toggleFollow } = useFollowEpisode(episode)

  return (
    <PosterCard
      mediaType="tv"
      key={episode.id}
      id={episode.id}
      title={episode.name}
      imageUrl={getTmdbImageUrl(episode.poster_path, 'w342') || undefined}
      showFollow
      number={number}
      isFollowed={isFollowed}
      onToggleFollow={() => toggleFollow(episode.id, episode.name)}
      isFollowLoading={isLoading}
    />
  )
}
