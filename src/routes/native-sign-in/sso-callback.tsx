import { NativeSignInStatus } from '#/component/NativeSignInStatus'
import { AuthenticateWithRedirectCallback } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/native-sign-in/sso-callback')({ component: SsoCallback })

function SsoCallback() {
  return (
    <>
      <NativeSignInStatus />
      <AuthenticateWithRedirectCallback />
    </>
  )
}
