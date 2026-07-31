import { api } from '#/../convex/_generated/api'
import { useUser } from '@clerk/tanstack-react-start'
import { useConvexAuth, useMutation as useDbMutation } from 'convex/react'
import { useEffect, useRef } from 'react'

// Author names and pictures are served from our own database so every reader sees them.
// Clerk only puts those claims in the Convex token when the JWT template asks for them, and
// an account can change its picture at any time, so the browser publishes the current
// profile once per signed-in session. The mutation writes only when something changed.
export function ProfileSync() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const syncProfile = useDbMutation(api.reviews.syncProfile)

  const lastSynced = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const name = user.fullName ?? user.username ?? undefined
    const image = user.imageUrl
    const signature = `${user.id}-${name ?? ''}-${image}`

    if (lastSynced.current === signature) return
    lastSynced.current = signature

    syncProfile({ name, image }).catch(() => {
      // A failed sync only means author cards keep the values stored on the reviews.
      lastSynced.current = null
    })
  }, [isAuthenticated, user, syncProfile])

  return null
}
