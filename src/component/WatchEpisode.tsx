import { PosterCard } from '#/component/PosterCard'
import useShowInfo from '#/hooks/useShowInfo'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'

import type { TvSectionItem } from '#/type/section'

interface Props {
  episode: TvSectionItem
}

export default function WatchEpisode({ episode }: Props) {
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode({ ...episode })

  const showInfo = useShowInfo({ showId: episode.showTmdbId })
  const continuousEpisodeNumbers = showInfo.data?.continuousEpisodeNumbers || episode.numberOfSeasons === 1

  return (
    <PosterCard
      id={episode.showTmdbId}
      title={episode.name}
      media="tv"
      imagePaths={[episode.poster, episode.backdrop]}
      showWatch
      isWatched={isWatched}
      onToggleWatch={onToggleWatch}
      isWatchLoading={isWatchedLoading}
      watchButtonText={
        continuousEpisodeNumbers
          ? `E${episode.episodeNumber + 1}`
          : `S${episode.seasonNumber + 1}, E${episode.episodeNumber + 1}`
      }
      progressPercentage={episode.watchedPercentage}
    />
  )
}
