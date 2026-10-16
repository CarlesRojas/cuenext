import { NativeSignInStatus } from '#/component/NativeSignInStatus'
import { useAuth } from '@clerk/tanstack-react-start'
import { NATIVE_CALLBACK_URL } from '#/lib/nativeSignIn'
import { createSignInTicket } from '#/lib/signInTicket'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'
import z from 'zod'

// Only sessions created by the sign in that just happened get a ticket, so a link to this page can't be used to
// hand an existing web session to another app.
const MAX_SESSION_AGE_MS = 5 * 60 * 1000

const createFreshSignInTicket = createServerFn({ method: 'POST' }).handler(async () => {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) throw new Error('Not signed in')

  const session = await clerkClient().sessions.getSession(sessionId)
  if (Date.now() - session.createdAt > MAX_SESSION_AGE_MS) throw new Error('Session is not fresh')

  return createSignInTicket(userId)
})

export const Route = createFileRoute('/native-sign-in/done')({
  validateSearch: z.object({ state: z.string().min(1) }),
  component: Done,
})

function Done() {
  const { state } = Route.useSearch()
  const { isLoaded, isSignedIn } = useAuth()
  const [failed, setFailed] = useState(false)
  const requested = useRef(false)

  useEffect(() => {
    if (!isLoaded || requested.current) return
    requested.current = true
    if (!isSignedIn) return setFailed(true)

    createFreshSignInTicket()
      .then(ticket => {
        window.location.href = `${NATIVE_CALLBACK_URL}?${new URLSearchParams({ ticket, state })}`
      })
      .catch(() => setFailed(true))
  }, [isLoaded, isSignedIn, state])

  return <NativeSignInStatus message={failed ? 'Sign in failed. Close this window and try again.' : 'Signing in...'} />
}
