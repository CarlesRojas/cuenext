import { ClerkReady, NativeSignInStatus } from '#/component/NativeSignInStatus'
import { nativeSignInDoneUrl } from '#/lib/nativeSignIn'
import { AuthenticateWithRedirectCallback } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

export const Route = createFileRoute('/native-sign-in/sso-callback')({
  validateSearch: z.object({ state: z.string().min(1) }),
  component: SsoCallback,
})

function SsoCallback() {
  const { state } = Route.useSearch()
  const doneUrl = nativeSignInDoneUrl(state)

  // A new Google user is moved from sign in to sign up, which ignores the sign in's redirectUrlComplete, so both end
  // at /done explicitly. Sign ups missing required fields continue in /native-sign-in/sign-up.
  return (
    <ClerkReady>
      <NativeSignInStatus />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={doneUrl}
        signUpForceRedirectUrl={doneUrl}
        continueSignUpUrl={`/native-sign-in/sign-up?state=${encodeURIComponent(state)}#/continue`}
      />
    </ClerkReady>
  )
}
