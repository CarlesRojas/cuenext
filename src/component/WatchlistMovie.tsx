import { PosterCard } from '#/component/PosterCard'
import { useUndoToast } from '#/hooks/useUndoToast'
import { getTmdbImageUrl } from '#/lib/tmdbImage'
import type { MovieSectionItem } from '#/type/section'
import { convexAction, convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'

interface Props {
  movie: MovieSectionItem
}

export default function WatchlistMovie({ movie }: Props) {
  const { showUndoToast } = useUndoToast()

  const { data: movieDetails, isPending } = useQuery(convexAction(api.tmdb.getMovieDetails, { tmdbId: movie.tmdbId }))
  const { data: isWatched } = useQuery(convexQuery(api.progress.checkMovieWatched, { tmdbId: movie.tmdbId }))

  const markMovieWatched = useMutation(api.progress.markMovieWatched)
  const unmarkMovieWatched = useMutation(api.progress.unmarkMovieWatched)

  if (isPending) return <PosterCard isLoading />
  if (!movieDetails) return null

  const handleToggleWatch = () => {
    if (isWatched) {
      unmarkMovieWatched({ tmdbId: movie.tmdbId })
      showUndoToast(movieDetails.title, 'unwatch', `unwatch-movie-${movie.tmdbId}`, () => {
        markMovieWatched({ tmdbId: movie.tmdbId })
      })
    } else {
      markMovieWatched({ tmdbId: movie.tmdbId })
      showUndoToast(movieDetails.title, 'watch', `watch-movie-${movie.tmdbId}`, () => {
        unmarkMovieWatched({ tmdbId: movie.tmdbId })
      })
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
    />
  )
}
