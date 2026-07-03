import { api } from '#/../convex/_generated/api'
import { useMediaUserState } from '#/hooks/useMediaUserState'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useFavoriteEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { userState, isUserStateLoading } = useMediaUserState('tv', episode.id)
  const isFavorited = userState?.isFavorite
  const isFavoriteLoading = isUserStateLoading

  const markAsFavorite = useDbMutation(api.favorites.favoriteItem)
  const unmarkAsFavorite = useDbMutation(api.favorites.unfavoriteItem)

  const favorite = useMutation({
    mutationFn: async (args: Parameters<typeof markAsFavorite>[0]) => {
      return await markAsFavorite(args)
    },
  })

  const unfavorite = useMutation({
    mutationFn: async (args: { wasNotFollowed?: boolean } & Parameters<typeof unmarkAsFavorite>[0]) => {
      await unmarkAsFavorite(args)
    },
  })

  const toggleFavorite = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const mediaKey = `tv-${id}`

    if (isFavorited) {
      await unfavorite.mutateAsync({ type: 'tv', tmdbId: id })
      showUndoToast(
        title,
        'unfavorite',
        mediaKey,
        async () =>
          await favorite.mutateAsync({
            type: 'tv',
            tmdbId: id,
            name: title,
            poster: episode.poster_path ?? null,
            backdrop: episode.backdrop_path ?? null,
            releaseDate: 0,
          }),
      )
    } else {
      const result = await favorite.mutateAsync({
        type: 'tv',
        tmdbId: id,
        name: title,
        poster: episode.poster_path ?? null,
        backdrop: episode.backdrop_path ?? null,
        releaseDate: 0,
      })
      showUndoToast(
        title,
        'favorite',
        mediaKey,
        async () => await unfavorite.mutateAsync({ ...result, type: 'tv', tmdbId: id }),
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
