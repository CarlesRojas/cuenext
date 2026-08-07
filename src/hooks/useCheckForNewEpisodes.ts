import { useClerk } from '@clerk/tanstack-react-start'
import { useAction } from 'convex/react'
import { useEffect, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { api } from '../../convex/_generated/api'

// Shows the user has caught up on can gain a new episode at any time. This used to walk
// every one of them from the browser and force a full TMDB refresh of each - per device, per
// hour - so a show followed on a phone and a laptop was refetched twice as often as one
// followed on one device, and a show followed by many people once per person.
//
// A cron now refreshes each show's season layout once for everybody. All this does is ask
// the server whether any of the user's waiting shows were missed, which is a single action
// and a single query, and almost always finds nothing to do.
const useCheckForNewEpisodes = () => {
  const { isSignedIn } = useClerk()

  const isCheckingRef = useRef(false)

  const refreshWaitingShows = useAction(api.nextEpisode.refreshWaitingShows)
  const [lastCheckedAt, setLastCheckedAt] = useLocalStorage<string | null>(
    'CUENEXT_LAST_CHECK_FOR_NEW_EPISODES_AT',
    null,
  )

  useEffect(() => {
    if (isCheckingRef.current || !isSignedIn) return

    const anHourAgo = new Date()
    anHourAgo.setHours(anHourAgo.getHours() - 1)
    const lastCheckedDate = lastCheckedAt ? new Date(lastCheckedAt) : null
    if (lastCheckedDate && lastCheckedDate > anHourAgo) return

    isCheckingRef.current = true
    setLastCheckedAt(new Date().toISOString())

    refreshWaitingShows()
      .catch(() => null)
      .finally(() => {
        isCheckingRef.current = false
      })
  }, [isSignedIn, lastCheckedAt, refreshWaitingShows, setLastCheckedAt])
}

export default useCheckForNewEpisodes
