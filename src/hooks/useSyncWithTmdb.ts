import { useMutation } from '@tanstack/react-query'
import { useAction, useMutation as useDbMutation, useQuery as useDbQuery } from 'convex/react'
import { useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'
import { processBatched } from '../utils/processBatched'

const useSyncWithTmdb = () => {
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

      await processBatched(tvWatchlist, item => updateNextEpisode({ tmdbId: item.id }))
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
