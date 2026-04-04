import { api } from '#/../convex/_generated/api'
import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { MovieSectionItem } from '#/type/section'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

interface Props {
  movie: MovieSectionItem
}

export default function WatchMovie({ movie }: Props) {
  const { showUndoToast } = useUndoToast()

  const { data: movieDetails, isPending } = useQuery(convexAction(api.tmdb.getMovieDetails, { tmdbId: movie.tmdbId }))
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

  if (isPending) return <PosterCard isLoading />
  if (!movieDetails) return null

  const handleToggleWatch = async () => {
    if (isWatched) {
      await unwatch.mutateAsync()
      showUndoToast(movieDetails.title, 'unwatch', `unwatch-movie-${movie.tmdbId}`, () => watch.mutateAsync())
    } else {
      await watch.mutateAsync()
      showUndoToast(movieDetails.title, 'watch', `watch-movie-${movie.tmdbId}`, () => unwatch.mutateAsync())
    }
  }

  return (
    <PosterCard
      id={movie.tmdbId}
      title={movieDetails.title}
      mediaType="movie"
      imageUrl={getTmdbImageUrl(movieDetails.poster_path, 'w342') || undefined}
      showWatch
      isWatched={isWatched}
      onToggleWatch={handleToggleWatch}
      isWatchLoading={watch.isPending || unwatch.isPending}
    />
  )
}
