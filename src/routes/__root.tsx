import Header from '#/component/Header'
import { env } from '#/env'
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

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

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
      { name: 'theme-color', content: '#0a0a0a' },
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

  return (
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/watchlist">
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <html lang="en" suppressHydrationWarning>
          <head>
            <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            <HeadContent />
          </head>

          <body className="font-sans wrap-anywhere antialiased selection:bg-[rgba(79,184,178,0.24)]">
            <Header />
            {children}

            <Scripts />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
