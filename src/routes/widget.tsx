import { api } from '#/../convex/_generated/api'
import { Button } from '#/component/ui/button'
import { env } from '#/env'
import { UrlParamsSchema } from '#/type/url'
import { SignInButton, useUser } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faLinkSlash, faSignIn, faSpinner, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useMutation } from 'convex/react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/widget')({
  component: WidgetPage,
  validateSearch: UrlParamsSchema,
})

function WidgetPage() {
  const { isLoaded, isSignedIn } = useUser()
  const [isAndroid, setIsAndroid] = useState(false)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    setIsAndroid(navigator.userAgent.includes('Android'))
  }, [])

  const { data: status } = useQuery({
    ...convexQuery(api.widget.getWidgetTokenStatus, {}),
    enabled: !!isSignedIn && isAndroid,
  })

  const mintWidgetToken = useAction(api.widget.mintWidgetToken)
  const revokeWidgetTokens = useMutation(api.widget.revokeWidgetTokens)

  const onConnect = async () => {
    setIsConnecting(true)

    try {
      const { token } = await mintWidgetToken()

      // HTTP actions live on the deployment's .convex.site sibling domain. Sending it
      // along keeps the Android code free of any hardcoded deployment.
      const apiBase = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site')
      const link = `cuenext://widget-setup?token=${token}&api=${encodeURIComponent(apiBase)}`

      setDeepLink(link)
      window.location.href = link
    } finally {
      setIsConnecting(false)
    }
  }

  const onDisconnect = async () => {
    setDeepLink(null)
    await revokeWidgetTokens()
  }

  const isConnected = (status?.tokenCount ?? 0) > 0

  return (
    <div className="screen-py flex w-full flex-col gap-8">
      <header className="screen-px flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">Home screen widget</h1>

          <p className="mt-2 max-w-2xl text-neutral-400">
            Keep one of your lists on your Android home screen. Connect below, then add the CueNext widget the way you
            add any other one.
          </p>
        </div>

        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <Button>
              <FontAwesomeIcon icon={faSignIn} size="lg" />
              <span>Sign in</span>
            </Button>
          </SignInButton>
        )}
      </header>

      <section className="screen-px">
        <div className="flex w-full max-w-2xl flex-col gap-3 rounded-[22px] border border-neutral-500/40 bg-neutral-800 p-4 lg:p-5">
          {/* The widget is native Android code, so it can't reuse the session living in
              Chrome's cookie jar and there is no JS bridge inside a TWA. Pairing works by
              minting a long-lived widget token and handing it to the app through a
              cuenext:// deep link, which the app's WidgetTokenActivity catches and
              stores. Only Android can do any of that. */}
          {!isAndroid && (
            <p className="text-sm text-neutral-400">
              The widget is Android only. Open this page on your Android phone to connect it.
            </p>
          )}

          {isAndroid && !isSignedIn && (
            <p className="text-sm text-neutral-400">Sign in to connect the widget to your lists.</p>
          )}

          {isAndroid && isSignedIn && (
            <>
              <p className="text-sm text-neutral-400">
                {isConnected
                  ? 'The widget can show your lists. Having trouble? Connect again to give it a fresh start.'
                  : 'Connecting lets the widget show your lists on your home screen. You can disconnect whenever you want.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onConnect} disabled={isConnecting}>
                  <FontAwesomeIcon icon={isConnecting ? faSpinner : faTableCellsLarge} spin={isConnecting} />
                  <span>{isConnected ? 'Connect again' : 'Connect widget'}</span>
                </Button>

                {isConnected && (
                  <Button variant="secondary" onClick={onDisconnect}>
                    <FontAwesomeIcon icon={faLinkSlash} />
                    <span>Disconnect</span>
                  </Button>
                )}
              </div>

              {deepLink && (
                <p className="text-sm text-neutral-500">
                  Nothing happened?{' '}
                  <a href={deepLink} className="text-sky-500 underline">
                    Tap here to finish connecting
                  </a>
                  , then add the CueNext widget to your home screen.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
