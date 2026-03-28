import { env } from '#/env'
import { ClerkProvider as AppClerkProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY)
  throw new Error('Add your Clerk Publishable Key to the .env.local file')

interface AppClerkProviderProps {
  children: ReactNode
}

export default function ClerkProvider({ children }: AppClerkProviderProps) {
  return (
    <AppClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </AppClerkProvider>
  )
}
