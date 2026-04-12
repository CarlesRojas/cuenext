import type { TvSectionItem } from '#/type/section'
import { processBatched } from '#/utils/processBatched'
import { useClerk } from '@clerk/tanstack-react-start'
import { useAction } from 'convex/react'
import { useEffect, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'

interface Props {
  waitingForEpisodes?: TvSectionItem[]
}
const useCheckForNewEpisodes = ({ waitingForEpisodes }: Props) => {
  const { isSignedIn } = useClerk()

  const isCheckingRef = useRef(false)

  const updateNextEpisode = useAction(api.nextEpisode.updateNextEpisode)
  const [lastCheckedAt, setLastCheckedAt] = useLocalStorage<string | null>(
    'CUENEXT_LAST_CHECK_FOR_NEW_EPISODES_AT',
    null,
  )

  useEffect(() => {
    if (isCheckingRef.current || !isSignedIn || !waitingForEpisodes || waitingForEpisodes.length === 0) return

    const anHourAgo = new Date()
    anHourAgo.setHours(anHourAgo.getHours() - 1)
    const lastCheckedDate = lastCheckedAt ? new Date(lastCheckedAt) : null
    if (lastCheckedDate && lastCheckedDate > anHourAgo) return
    isCheckingRef.current = true

    setLastCheckedAt(new Date().toISOString())

    const process = async () => {
      await processBatched(waitingForEpisodes, item => updateNextEpisode({ tmdbId: item.showTmdbId, forceFetch: true }))
      isCheckingRef.current = false
    }

    process()
  }, [waitingForEpisodes, lastCheckedAt, isSignedIn])
}

export default useCheckForNewEpisodes
