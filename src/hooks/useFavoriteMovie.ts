import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbMovieMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation } from 'convex/react'

export function useFavoriteMovie(movie: TmdbMovieMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: isFavorited, isFetching: isFavoriteLoading } = useQuery({
    ...convexQuery(api.favorites.checkIsFavorite, { type: 'movie', tmdbId: movie.id }),
    enabled: clerk.isSignedIn,
  })

  const markAsFavorite = useDbMutation(api.favorites.favoriteItem)
  const unmarkAsFavorite = useDbMutation(api.favorites.unfavoriteItem)
  const tmdbFavorites = useAction(api.tmdbAccount.addToFavorites)

  const favorite = useMutation({
    mutationFn: async (args: Parameters<typeof markAsFavorite>[0]) => {
      const result = await markAsFavorite(args)
      await tmdbFavorites({ media: 'movie', tmdbId: args.tmdbId, add: true })
      return result
    },
  })

  const unfavorite = useMutation({
    mutationFn: async (args: { wasNotFollowed?: boolean } & Parameters<typeof unmarkAsFavorite>[0]) => {
      await unmarkAsFavorite(args)
      await tmdbFavorites({ media: 'movie', tmdbId: args.tmdbId, add: false })
    },
  })

  const toggleFavorite = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `movie-${id}`

    if (isFavorited) {
      await unfavorite.mutateAsync({ type: 'movie', tmdbId: id })
      showUndoToast(
        title,
        'unfavorite',
        mediaKey,
        async () =>
          await favorite.mutateAsync({
            type: 'movie',
            tmdbId: id,
            name: title,
            poster: movie.poster_path ?? null,
            backdrop: movie.backdrop_path ?? null,
            releaseDate: new Date(movie.release_date).getTime(),
          }),
      )
    } else {
      const result = await favorite.mutateAsync({
        type: 'movie',
        tmdbId: id,
        name: title,
        poster: movie.poster_path ?? null,
        backdrop: movie.backdrop_path ?? null,
        releaseDate: new Date(movie.release_date).getTime(),
      })
      showUndoToast(
        title,
        'favorite',
        mediaKey,
        async () => await unfavorite.mutateAsync({ ...result, type: 'movie', tmdbId: id }),
      )
    }
  }

  const isLoading = isFavoriteLoading || favorite.isPending || unfavorite.isPending

  return {
    isFavorited,
    isFavoritedLoading: isLoading,
    toggleFavorite,
  }
}
