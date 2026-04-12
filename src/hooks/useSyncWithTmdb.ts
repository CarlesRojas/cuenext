import { getAllPages } from '#/utils/getAllPages'
import { processBatched } from '#/utils/processBatched'
import { useMutation } from '@tanstack/react-query'
import { useAction, useConvex, useMutation as useDbMutation, useQuery as useDbQuery } from 'convex/react'
import { useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'

const useSyncWithTmdb = () => {
  const convex = useConvex()

  const [lastSyncAt, setLastSyncAt] = useLocalStorage<string | null>('CUENEXT_LAST_SYNC_WITH_TMDB_AT', null)

  const tmdbLink = useDbQuery(api.tmdbAuth.getTmdbAccountLink)

  const getTvWatchlist = useAction(api.tmdbAccount.getTvWatchlist)
  const getMovieWatchlist = useAction(api.tmdbAccount.getMovieWatchlist)
  const addToWatchlist = useAction(api.tmdbAccount.addToWatchlist)
  const followMultiple = useDbMutation(api.library.followMultiple)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const getTvFavorites = useAction(api.tmdbAccount.getTvFavorites)
  const getMovieFavorites = useAction(api.tmdbAccount.getMovieFavorites)
  const addToFavorites = useAction(api.tmdbAccount.addToFavorites)
  const favoriteMultiple = useDbMutation(api.favorites.favoriteMultiple)

  const syncWithTmdb = useMutation({
    mutationFn: async () => {
      // #############################################
      //   FOLLOWS
      // #############################################

      const tmdbShowFollows = await getTvWatchlist()
      const tmdbMovieFollows = await getMovieWatchlist()

      const cuenextShowFollows = await getAllPages(args => convex.query(api.library.listFollowed, args), {
        type: 'tv' as const,
      })
      const cuenextMovieFollows = await getAllPages(args => convex.query(api.library.listFollowed, args), {
        type: 'movie' as const,
      })

      const showFollowsMissingInCuenext = tmdbShowFollows.filter(item => !cuenextShowFollows.includes(item.id))
      const movieFollowsMissingInCuenext = tmdbMovieFollows.filter(item => !cuenextMovieFollows.includes(item.id))

      const showFollowsMissingInTmdb = cuenextShowFollows.filter(
        item => !tmdbShowFollows.find(tmdbItem => tmdbItem.id === item),
      )
      const movieFollowsMissingInTmdb = cuenextMovieFollows.filter(
        item => !tmdbMovieFollows.find(tmdbItem => tmdbItem.id === item),
      )

      await followMultiple({
        items: [
          ...showFollowsMissingInCuenext.map(item => ({
            type: 'tv' as const,
            tmdbId: item.id,
            name: item.name,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: 0,
          })),
          ...movieFollowsMissingInCuenext.map(item => ({
            type: 'movie' as const,
            tmdbId: item.id,
            name: item.title,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: new Date(item.release_date).getTime(),
          })),
        ],
      })

      await processBatched(showFollowsMissingInCuenext, item => updateNextEpisode({ tmdbId: item.id }))
      await processBatched(showFollowsMissingInTmdb, tmdbId => addToWatchlist({ media: 'tv', tmdbId }))
      await processBatched(movieFollowsMissingInTmdb, tmdbId => addToWatchlist({ media: 'movie', tmdbId }))

      // #############################################
      //   FAVORITES
      // #############################################

      const tmdbShowFavorites = await getTvFavorites()
      const tmdbMovieFavorites = await getMovieFavorites()

      const cuenextShowFavorites = await getAllPages(args => convex.query(api.favorites.listFavorited, args), {
        type: 'tv' as const,
      })
      const cuenextMovieFavorites = await getAllPages(args => convex.query(api.favorites.listFavorited, args), {
        type: 'movie' as const,
      })

      const showFavoritesMissingInCuenext = tmdbShowFavorites.filter(item => !cuenextShowFavorites.includes(item.id))
      const movieFavoritesMissingInCuenext = tmdbMovieFavorites.filter(item => !cuenextMovieFavorites.includes(item.id))

      const showFavoritesMissingInTmdb = cuenextShowFavorites.filter(
        item => !tmdbShowFavorites.find(tmdbItem => tmdbItem.id === item),
      )
      const movieFavoritesMissingInTmdb = cuenextMovieFavorites.filter(
        item => !tmdbMovieFavorites.find(tmdbItem => tmdbItem.id === item),
      )

      await favoriteMultiple({
        items: [
          ...showFavoritesMissingInCuenext.map(item => ({
            type: 'tv' as const,
            tmdbId: item.id,
            name: item.name,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: 0,
          })),
          ...movieFavoritesMissingInCuenext.map(item => ({
            type: 'movie' as const,
            tmdbId: item.id,
            name: item.title,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: new Date(item.release_date).getTime(),
          })),
        ],
      })

      await processBatched(showFavoritesMissingInTmdb, tmdbId => addToFavorites({ media: 'tv', tmdbId }))
      await processBatched(movieFavoritesMissingInTmdb, tmdbId => addToFavorites({ media: 'movie', tmdbId }))
    },
    onSuccess: () => {
      setLastSyncAt(new Date().toISOString())
    },
  })

  useEffect(() => {
    const aDayAgo = new Date()
    aDayAgo.setHours(aDayAgo.getHours() - 24)
    const lastSyncDate = lastSyncAt ? new Date(lastSyncAt) : null

    if (!tmdbLink || (lastSyncDate && lastSyncDate > aDayAgo)) return

    syncWithTmdb.mutate()
  }, [tmdbLink, lastSyncAt])

  return syncWithTmdb
}

export default useSyncWithTmdb
