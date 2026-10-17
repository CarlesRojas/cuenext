import { ClerkLoaded, ClerkLoading } from '@clerk/tanstack-react-start'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

interface NativeSignInStatusProps {
  error?: string
}

// Full screen transition page for the native sign in sheet, shown without the app shell: a quiet spinner, or the error
export function NativeSignInStatus({ error }: NativeSignInStatusProps) {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-neutral-950 px-6 text-center">
      {error ? (
        <p className="text-sm text-neutral-400">{error}</p>
      ) : (
        <FontAwesomeIcon icon={faSpinner} spin className="size-6 text-white/40" />
      )}
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
        <NativeSignInStatus />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </>
  )
}
