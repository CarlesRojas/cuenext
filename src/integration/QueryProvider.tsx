import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

let context: { queryClient: QueryClient } | undefined

export function getContext() {
  if (context) return context

  const queryClient = new QueryClient()
  context = { queryClient }

  return context
}

interface Props {
  children: ReactNode
}

export default function QueryProvider({ children }: Props) {
  const { queryClient } = getContext()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
