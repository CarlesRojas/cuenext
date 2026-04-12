import type { TvSectionItem } from '#/type/section'
import { processBatched } from '#/utils/processBatched'
import { useClerk } from '@clerk/tanstack-react-start'
import { useAction } from 'convex/react'
import { useEffect } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'

interface Props {
  waitingForEpisodes?: TvSectionItem[]
}
const useCheckForNewEpisodes = ({ waitingForEpisodes }: Props) => {
  const { isSignedIn } = useClerk()

  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const [lastCheckedAt, setLastCheckedAt] = useLocalStorage<string | null>(
    'CUENEXT_LAST_CHECK_FOR_NEW_EPISODES_AT',
    null,
  )

  useEffect(() => {
    if (!isSignedIn || !waitingForEpisodes || waitingForEpisodes.length === 0) return

    const anHourAgo = new Date()
    anHourAgo.setHours(anHourAgo.getHours() - 1)
    const lastCheckedDate = lastCheckedAt ? new Date(lastCheckedAt) : null
    if (lastCheckedDate && lastCheckedDate > anHourAgo) return
    setLastCheckedAt(new Date().toISOString())

    const processItems = async () => {
      await processBatched(waitingForEpisodes, item => updateNextEpisode({ tmdbId: item.showTmdbId, forceFetch: true }))
    }

    processItems()
  }, [waitingForEpisodes, lastCheckedAt, isSignedIn])
}

export default useCheckForNewEpisodes
