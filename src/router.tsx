import { getContext } from '#/integration/QueryProvider'
import { deLocalizeUrl, localizeUrl } from '#/locale/runtime'
import { routeTree } from '#/routeTree.gen'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    context: getContext(),

    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,

    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
