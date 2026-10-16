import { NativeSignInStatus } from '#/component/NativeSignInStatus'
import { useAuth, useClerk } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import z from 'zod'

// Opened by the iOS app in its system sign in sheet when a signed in user connects a Google account from Manage
// account. The ticket signs the user in here, then Google is connected and /native-sign-in/connected returns to the app.
export const Route = createFileRoute('/native-sign-in/connect')({
  validateSearch: z.object({ state: z.string().min(1), ticket: z.string().min(1) }),
  component: Connect,
})

function Connect() {
  const { state, ticket } = Route.useSearch()
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!isLoaded || started.current) return
    started.current = true

    const connect = async () => {
      if (!isSignedIn) {
        const signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket })
        if (signIn.status !== 'complete' || !signIn.createdSessionId) throw new Error('Sign in incomplete')
        await clerk.setActive({ session: signIn.createdSessionId })
      }

      const user = clerk.user
      if (!user) throw new Error('Not signed in')

      const redirectUrl = `${window.location.origin}/native-sign-in/connected?state=${encodeURIComponent(state)}`
      // The app's web view already started a connection before handing it over here, so reuse it when it exists
      const pending = user.externalAccounts.find(
        account => account.provider === 'google' && account.verification?.status !== 'verified',
      )
      const account = pending
        ? await pending.reauthorize({ redirectUrl })
        : await user.createExternalAccount({ strategy: 'oauth_google', redirectUrl })

      const googleUrl = account.verification?.externalVerificationRedirectURL
      if (!googleUrl) throw new Error('Missing Google URL')
      window.location.href = googleUrl.href
    }
    connect().catch(() => setFailed(true))
  }, [isLoaded, isSignedIn, clerk, state, ticket])

  return (
    <NativeSignInStatus
      message={failed ? 'Could not connect Google. Close this window and try again.' : 'Opening Google...'}
    />
  )
}
