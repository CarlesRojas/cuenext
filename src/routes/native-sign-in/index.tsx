import { ClerkReady, NativeSignInStatus } from '#/component/NativeSignInStatus'
import { useAuth, useClerk } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

// Google sign in breaks inside the iOS app's web view, so the app opens this page in a system sign in sheet
// (ASWebAuthenticationSession). Once signed in, /native-sign-in/done hands the session back to the app.
export const Route = createFileRoute('/native-sign-in/')({
  validateSearch: z.object({ state: z.string().min(1) }),
  component: NativeSignIn,
})

function NativeSignIn() {
  return (
    <ClerkReady>
      <NativeSignInFlow />
    </ClerkReady>
  )
}

function NativeSignInFlow() {
  const { state } = Route.useSearch()
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const navigate = Route.useNavigate()

  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn) {
      void navigate({ to: '/native-sign-in/done', search: { state } })
      return
    }

    void clerk.client.signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: `${window.location.origin}/native-sign-in/sso-callback`,
      redirectUrlComplete: `${window.location.origin}/native-sign-in/done?state=${encodeURIComponent(state)}`,
    })
  }, [isLoaded, isSignedIn, clerk, navigate, state])

  return <NativeSignInStatus message="Opening Google..." />
}
