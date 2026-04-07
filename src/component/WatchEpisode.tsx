import { PosterCard } from '#/component/PosterCard'
import { useShowInfo } from '#/hooks/useShowInfo'
import { useWatchEpisode } from '#/hooks/useWatchEpisode'

import type { TvSectionItem } from '#/type/section'

interface Props {
  episode: TvSectionItem
}

export default function WatchEpisode({ episode }: Props) {
  const { isWatched, isWatchedLoading, onToggleWatch } = useWatchEpisode({ ...episode })

  const showInfo = useShowInfo(episode.showTmdbId)
  // TODO if it only has one season this calculation is wrong
  const episodeNumbersResetWithSeason = showInfo?.episodeNumbersResetWithSeason ?? false

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
        episodeNumbersResetWithSeason
          ? `S${episode.seasonNumber + 1}, E${episode.episodeNumber + 1}`
          : `E${episode.episodeNumber + 1}`
      }
      progressPercentage={episode.watchedPercentage}
    />
  )
}
