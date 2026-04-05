import { PosterCard } from '#/component/PosterCard'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TvSectionItem } from '#/type/section'

interface Props {
  episode: TvSectionItem
}

export default function WatchEpisode({ episode }: Props) {
  const { isWatched, isLoading, handleToggleWatch } = useWatchEpisode(episode)

  return (
    <PosterCard
      id={episode.tmdbId}
      title={episode.name}
      mediaType="tv"
      imageUrl={getTmdbImageUrl(episode.poster, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      isWatchLoading={isLoading}
      watchButtonText={`S${episode.seasonNumber + 1}, E${episode.episodeNumber + 1}`}
      progressPercentage={episode.watchedPercentage}
    />
  )
}
