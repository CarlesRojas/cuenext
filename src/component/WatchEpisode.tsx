import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { TvSectionItem } from '#/type/section'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

interface Props {
  episode: TvSectionItem
}

export default function WatchEpisode({ episode }: Props) {
  const { showUndoToast } = useUndoToast()

  const { data: show, isPending } = useQuery(convexAction(api.tmdb.getShowDetails, { tmdbId: episode.tmdbId }))
  const { data: isWatched } = useQuery({
    ...convexQuery(api.progress.checkEpisodeWatched, {
      showTmdbId: episode.tmdbId,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
    }),
  })

  const markEpisodeWatched = useDbMutation(api.progress.markEpisodeWatched)
  const unmarkEpisodeWatched = useDbMutation(api.progress.unmarkEpisodeWatched)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const watch = useMutation({
    mutationFn: async () => {
      await markEpisodeWatched({
        showTmdbId: episode.tmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      })
      await updateNextEpisode({ tmdbId: episode.tmdbId })
    },
  })

  const unwatch = useMutation({
    mutationFn: async () => {
      await unmarkEpisodeWatched({
        showTmdbId: episode.tmdbId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      })
      await updateNextEpisode({ tmdbId: episode.tmdbId })
    },
  })

  if (isPending) return <PosterCard isLoading />
  if (!show) return null

  const handleToggleWatch = async () => {
    const title = `S${episode.seasonNumber} E${episode.episodeNumber} of ${show.name}`

    if (isWatched) {
      await unwatch.mutateAsync()
      showUndoToast(title, 'unwatch', `unwatch-tv-${episode.tmdbId}`, () => watch.mutateAsync())
    } else {
      await watch.mutateAsync()
      showUndoToast(title, 'watch', `watch-tv-${episode.tmdbId}`, () => unwatch.mutateAsync())
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
      isWatchLoading={watch.isPending || unwatch.isPending}
      watchButtonText={`S${episode.seasonNumber}, E${episode.episodeNumber}`}
      progressPercentage={episode.watchedPercentage}
    />
  )
}
