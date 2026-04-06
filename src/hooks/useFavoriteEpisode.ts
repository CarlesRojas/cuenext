import { api } from '#/../convex/_generated/api'
import { useUndoToast } from '#/hooks/useUndoToast'
import type { TmdbTvMinimal } from '#/type/tmdb'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMutation as useDbMutation } from 'convex/react'

export function useFavoriteEpisode(episode: TmdbTvMinimal) {
  const clerk = useClerk()
  const { showUndoToast } = useUndoToast()

  const { data: favoriteMedia, isFetching: isFavoriteLoading } = useQuery({
    ...convexQuery(api.favorites.listFavorites, { type: 'tv' }),
    enabled: clerk.isSignedIn,
  })

  const markAsFavorite = useDbMutation(api.favorites.favoriteItem)
  const unmarkAsFavorite = useDbMutation(api.favorites.unfavoriteItem)

  const favorite = useMutation({
    mutationFn: async ({ id }: { id: number }) => await markAsFavorite({ type: 'tv', tmdbId: id }),
  })

  const unfavorite = useMutation({
    mutationFn: async ({ id }: { id: number }) => await unmarkAsFavorite({ type: 'tv', tmdbId: id }),
  })

  const toggleFavorite = async (id: number, title: string) => {
    if (!clerk.isSignedIn) return clerk.openSignIn({ forceRedirectUrl: window.location.href })

    const isFavorited = Array.isArray(favoriteMedia) && favoriteMedia.includes(id)
    const mediaKey = `tv-${id}`

    if (isFavorited) {
      await unfavorite.mutateAsync({ id })
      showUndoToast(title, 'unfavorite', mediaKey, async () => await favorite.mutateAsync({ id }))
    } else {
      await favorite.mutateAsync({ id })
      showUndoToast(title, 'favorite', mediaKey, async () => await unfavorite.mutateAsync({ id }))
    }
  }

  const isFavorited = Array.isArray(favoriteMedia) && favoriteMedia.includes(episode.id)
  const isLoading = isFavoriteLoading || favorite.isPending || unfavorite.isPending

  return {
    isFavorited,
    isFavoritedLoading: isLoading,
    toggleFavorite,
  }
}
