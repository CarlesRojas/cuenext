import { ClerkReady } from '#/component/NativeSignInStatus'
import { nativeSignInDoneUrl } from '#/lib/nativeSignIn'
import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

// Finishes a Google sign up in the iOS sign in sheet when Clerk needs more fields than Google provides
export const Route = createFileRoute('/native-sign-in/sign-up')({
  validateSearch: z.object({ state: z.string().min(1) }),
  component: NativeSignUp,
})

function NativeSignUp() {
  const { state } = Route.useSearch()

  return (
    <ClerkReady>
      <main className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-neutral-950 p-6">
        <SignUp routing="hash" forceRedirectUrl={nativeSignInDoneUrl(state)} />
      </main>
    </ClerkReady>
  )
}
