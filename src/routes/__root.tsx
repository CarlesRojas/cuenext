import AppShell from '#/component/AppShell'
import { Toaster } from '#/component/ui/sonner'
import { env } from '#/env'
import { ToastProvider } from '#/hooks/useUndoToast'
import { useViewportHeight } from '#/hooks/useViewportHeight'
import { seo } from '#/lib/seo'
import appCss from '#/styles.css?url'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import '@fontsource/montserrat/100.css'
import '@fontsource/montserrat/200.css'
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Scripts, createRootRouteWithContext, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, getToken, isAuthenticated } = await auth()
  const token = await getToken({ template: 'convex' })
  return { userId, token, isAuthenticated }
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      { name: 'theme-color', content: '#171717' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      ...seo({
        title: 'CueNext',
        description: `Keep tabs on your movies and TV shows. Track what you watch, discover new favorites, and never miss an episode.`,
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/appleIcon180.png' },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),

  beforeLoad: async context => {
    const { userId, token, isAuthenticated } = await fetchClerkAuth()

    if (token) context.context.convexQueryClient.serverHttpClient?.setAuth(token)
    return { userId, token, isAuthenticated }
  },

  notFoundComponent: () => <div>Not Found</div>,
  shellComponent: RootDocument,
})

interface Props {
  children: ReactNode
}

function RootDocument({ children }: Props) {
  const context = useRouteContext({ from: Route.id })
  const { visualHeight } = useViewportHeight()

  return (
    <ClerkProvider
      publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{ elements: { modalBackdrop: '!bg-black/70 !backdrop-blur-sm' } }}
    >
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <html
          lang="en"
          className="dark relative w-dvw max-w-dvw min-w-dvw overflow-hidden transition-all"
          data-theme="dark"
          style={{ colorScheme: 'dark', height: `${visualHeight}px` }}
          suppressHydrationWarning
        >
          <head>
            <HeadContent />
          </head>

          <body className="size-full max-h-full min-h-full max-w-full min-w-full bg-neutral-900 font-sans wrap-anywhere antialiased selection:bg-sky-500/5">
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
            <Toaster />

            <Scripts />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
