import { ClerkReady, NativeSignInStatus } from '#/component/NativeSignInStatus'
import { useAuth, useClerk } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import z from 'zod'

// Loaded by the iOS app's web view with the ticket returned by /native-sign-in/done.
export const Route = createFileRoute('/native-sign-in/complete')({
  validateSearch: z.object({ ticket: z.string().min(1), redirect: z.string().optional() }),
  component: Complete,
})

const isSafeRedirect = (path?: string): path is string => !!path && path.startsWith('/') && !path.startsWith('//')

function Complete() {
  return (
    <ClerkReady>
      <CompleteFlow />
    </ClerkReady>
  )
}

function CompleteFlow() {
  const { ticket, redirect } = Route.useSearch()
  const { isLoaded, isSignedIn } = useAuth()
  const clerk = useClerk()
  const [failed, setFailed] = useState(false)
  const redeemed = useRef(false)

  useEffect(() => {
    if (!isLoaded || redeemed.current) return
    redeemed.current = true
    const destination = isSafeRedirect(redirect) ? redirect : '/'
    if (isSignedIn) return window.location.replace(destination)

    const redeem = async () => {
      const signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket })
      if (signIn.status !== 'complete' || !signIn.createdSessionId) throw new Error('Sign in incomplete')
      await clerk.setActive({ session: signIn.createdSessionId })
      window.location.replace(destination)
    }
    redeem().catch(() => setFailed(true))
  }, [isLoaded, isSignedIn, clerk, ticket, redirect])

  return (
    <NativeSignInStatus
      failed={failed}
      message={failed ? 'Sign in failed. Please try again.' : 'Finishing sign in...'}
    />
  )
}
