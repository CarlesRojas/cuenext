import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { MovieSectionItem } from '#/type/section'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  const { showUndoToast } = useUndoToast()

  const { data: isWatched } = useQuery(convexQuery(api.progress.checkMovieWatched, { tmdbId: movie.tmdbId }))

  const markMovieWatched = useDbMutation(api.progress.markMovieWatched)
  const unmarkMovieWatched = useDbMutation(api.progress.unmarkMovieWatched)

  const watch = useMutation({
    mutationFn: async () => {
      await markMovieWatched({ tmdbId: movie.tmdbId })
    },
  })

  const unwatch = useMutation({
    mutationFn: async () => {
      await unmarkMovieWatched({ tmdbId: movie.tmdbId })
    },
  })

  const handleToggleWatch = async () => {
    if (isWatched) {
      await unwatch.mutateAsync()
      showUndoToast(movie.name, 'unwatch', `unwatch-movie-${movie.tmdbId}`, () => watch.mutateAsync())
    } else {
      await watch.mutateAsync()
      showUndoToast(movie.name, 'watch', `watch-movie-${movie.tmdbId}`, () => unwatch.mutateAsync())
    }
  }

  return (
    <PosterCard
      id={movie.tmdbId}
      title={movie.name}
      mediaType="movie"
      imageUrl={getTmdbImageUrl(movie.poster, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      isWatchLoading={watch.isPending || unwatch.isPending}
    />
  )
}
