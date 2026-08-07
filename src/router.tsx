import { env } from '#/env'
import { idbStorage } from '#/lib/idbStorage'
import { QUERY_CACHE_BUSTER, QUERY_CACHE_MAX_AGE, QUERY_CACHE_STORAGE_KEY, QUERY_GC_TIME } from '#/lib/queryCache'
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
        // `refetchOnMount: 'always'` used to be the default here, and it ignores staleTime
        // by design: every mount re-ran the query. For a Convex subscription that is a
        // second, billed one-shot read of data the websocket is already pushing, and for a
        // Convex action it re-ran the whole TMDB fetch chain. `true` respects staleTime, so
        // a mount only refetches something actually stale.
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        // Queries that want to survive longer say so (TMDB reads, which are immutable for
        // hours); everything else is refetched when a component next needs it.
        staleTime: 0,
        // Must not be shorter than the persister's maxAge. The default is 5 minutes, which
        // evicted every query the moment its last observer unmounted, so the persisted cache
        // only ever held whatever had been on screen in the last 5 minutes.
        gcTime: QUERY_GC_TIME,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const persister = createAsyncStoragePersister({
    storage: typeof window !== 'undefined' ? idbStorage : undefined,
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
          maxAge: QUERY_CACHE_MAX_AGE,
          buster: QUERY_CACHE_BUSTER,
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
