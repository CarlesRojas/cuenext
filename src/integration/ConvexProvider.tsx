import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider as AppConvexProvider } from 'convex/react'
import type { ReactNode } from 'react'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
if (!CONVEX_URL) console.error('missing envar CONVEX_URL')

const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

interface Props {
  children: ReactNode
}

export default function ConvexProvider({ children }: Props) {
  return (
    <AppConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </AppConvexProvider>
  )
}
