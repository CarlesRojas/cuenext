import { env } from '#/env'
import { QUERY_CACHE_STORAGE_KEY } from '#/lib/queryCache'
import { routeTree } from '#/routeTree.gen'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

export function getRouter() {
  const convexClient = new ConvexReactClient(env.VITE_CONVEX_URL, { unsavedChangesWarning: false })
  const convexQueryClient = new ConvexQueryClient(convexClient)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        refetchOnMount: 'always',
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const persister = createAsyncStoragePersister({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    key: QUERY_CACHE_STORAGE_KEY,
  })

  const router = createTanStackRouter({
    routeTree,

    context: { queryClient, convexClient, convexQueryClient, urlParams: {} },

    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,

    Wrap: ({ children }) => (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
        }}
      >
        <ConvexProvider client={convexQueryClient.convexClient}>{children}</ConvexProvider>
      </PersistQueryClientProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
