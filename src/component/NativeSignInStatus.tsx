import { ClerkLoaded, ClerkLoading } from '@clerk/tanstack-react-start'
import type { ReactNode } from 'react'

interface NativeSignInStatusProps {
  message: string
}

export function NativeSignInStatus({ message }: NativeSignInStatusProps) {
  return (
    <main className="screen-px screen-py flex size-full items-center justify-center text-center">
      <p className="text-neutral-400">{message}</p>
    </main>
  )
}

interface ClerkReadyProps {
  children: ReactNode
}

// useAuth reports loaded from the server's auth state before Clerk's client is ready in the browser, and the native
// sign in pages need clerk.client right away
export function ClerkReady({ children }: ClerkReadyProps) {
  return (
    <>
      <ClerkLoading>
        <NativeSignInStatus message="Loading..." />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </>
  )
}
