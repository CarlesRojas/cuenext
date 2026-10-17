import { ClerkLoaded, ClerkLoading } from '@clerk/tanstack-react-start'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

interface NativeSignInStatusProps {
  message: string
  failed?: boolean
}

// Full screen transition page for the native sign in flow, shown without the app shell
export function NativeSignInStatus({ message, failed }: NativeSignInStatusProps) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center">
      {!failed && <FontAwesomeIcon icon={faSpinner} className="size-6 animate-spin text-sky-500" />}
      <p className="text-sm text-neutral-400">{message}</p>
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
