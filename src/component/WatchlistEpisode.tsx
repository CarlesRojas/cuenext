import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TvSectionItem } from '#/type/section'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'

interface Props {
  episode: TvSectionItem
}

export default function WatchlistEpisode({ episode }: Props) {
  const { showUndoToast } = useUndoToast()

  const { data: show, isPending } = useQuery(convexAction(api.tmdb.getShowDetails, { tmdbId: episode.tmdbId }))
  const { data: isWatched } = useQuery({
    ...convexQuery(api.progress.checkEpisodeWatched, { showTmdbId: episode.tmdbId, ...episode }),
  })

  const markEpisodeWatched = useMutation(api.progress.markEpisodeWatched)
  const unmarkEpisodeWatched = useMutation(api.progress.unmarkEpisodeWatched)

  if (isPending) return <PosterCard isLoading />
  if (!show) return null

  const handleToggleWatch = () => {
    const title = `S${episode.seasonNumber} E${episode.episodeNumber} of ${show.name}`

    if (isWatched) {
      unmarkEpisodeWatched({ showTmdbId: episode.tmdbId, ...episode })
      showUndoToast(title, 'unwatch', `unwatch-tv-${episode.tmdbId}`, () =>
        markEpisodeWatched({ showTmdbId: episode.tmdbId, ...episode }),
      )
    } else {
      markEpisodeWatched({ showTmdbId: episode.tmdbId, ...episode })
      showUndoToast(title, 'watch', `watch-tv-${episode.tmdbId}`, () =>
        unmarkEpisodeWatched({ showTmdbId: episode.tmdbId, ...episode }),
      )
    }
  }

  return (
    <PosterCard
      id={episode.tmdbId}
      title={show.name}
      mediaType="tv"
      imageUrl={getTmdbImageUrl(show.poster_path, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      watchButtonText={`S${episode.seasonNumber}, E${episode.episodeNumber}`}
      progressPercentage={episode.watchedPercentage}
    />
  )
}
