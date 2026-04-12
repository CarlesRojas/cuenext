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
  const followMultiple = useDbMutation(api.library.followMultiple)
  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)

  const syncWithTmdb = useMutation({
    mutationFn: async () => {
      console.log('Sync')
      const tvWatchlist = await getTvWatchlist()
      const movieWatchlist = await getMovieWatchlist()

      await followMultiple({
        items: [
          ...tvWatchlist.map(item => ({
            type: 'tv' as const,
            tmdbId: item.id,
            name: item.name,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: 0,
          })),
          ...movieWatchlist.map(item => ({
            type: 'movie' as const,
            tmdbId: item.id,
            name: item.title,
            poster: item.poster_path ?? null,
            backdrop: item.backdrop_path ?? null,
            releaseDate: new Date(item.release_date).getTime(),
          })),
        ],
      })

      const currentFollowedTv = await getAllPages(args => convex.query(api.library.listFollowed, args), {
        type: 'tv' as const,
      })
      const currentFollowedMovie = await getAllPages(args => convex.query(api.library.listFollowed, args), {
        type: 'movie' as const,
      })

      // Only update next episode for shows that are actually followed
      const followedTvFromWatchlist = tvWatchlist.filter(item => currentFollowedTv.includes(item.id))

      await processBatched(followedTvFromWatchlist, item => updateNextEpisode({ tmdbId: item.id }))
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
