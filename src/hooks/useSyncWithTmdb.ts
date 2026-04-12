import { useMutation } from '@tanstack/react-query'
import { useQuery as useDbQuery } from 'convex/react'
import { useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'

const useSyncWithTmdb = () => {
  const tmdbLink = useDbQuery(api.tmdbAuth.getTmdbAccountLink)
  const [lastSyncAt, setLastSyncAt] = useLocalStorage<string | null>('CUENEXT_LAST_SYNC_WITH_TMDB_AT', null)

  const syncWithTmdb = useMutation({
    mutationFn: async () => {
      console.log('Sync')
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
