import { api } from '#/../convex/_generated/api'
import { Button } from '#/component/ui/button'
import { env } from '#/env'
import { useClerk } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { faLinkSlash, faSpinner, faTableCellsLarge } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery } from '@tanstack/react-query'
import { useAction, useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/cn'

// The home-screen widget is native Android code, so it can't reuse the session living in
// Chrome's cookie jar and there is no JS bridge inside a TWA. Pairing works by minting a
// long-lived widget token and handing it to the app through a cuenext:// deep link, which
// the app's WidgetTokenActivity catches and stores. Only shown on Android, where the
// widget can exist.
export function AndroidWidgetSetup() {
  const clerk = useClerk()
  const [isAndroid, setIsAndroid] = useState(false)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsAndroid(navigator.userAgent.includes('Android'))
  }, [])

  // The widget's "Grant access" button opens /profile#widget: scroll the card into view
  // and flash it so the user lands on the right control.
  useEffect(() => {
    if (!isAndroid || window.location.hash !== '#widget') return

    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setIsHighlighted(true)

    const timeout = setTimeout(() => setIsHighlighted(false), 2500)
    return () => clearTimeout(timeout)
  }, [isAndroid])

  const { data: status } = useQuery({
    ...convexQuery(api.widget.getWidgetTokenStatus, {}),
    enabled: !!clerk.isSignedIn && isAndroid,
  })

  const mintWidgetToken = useAction(api.widget.mintWidgetToken)
  const revokeWidgetTokens = useMutation(api.widget.revokeWidgetTokens)

  if (!isAndroid || !clerk.isSignedIn) return null

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
    // The screen-height bottom margin leaves room for the widget's "Grant access" deep
    // link to scroll this card fully into view at the end of the page.
    <section className="screen-px mb-[100dvh]" id="widget">
      <div
        ref={cardRef}
        className={cn(
          'duration-slow flex w-full max-w-2xl flex-col gap-3 rounded-[22px] border bg-neutral-800 p-4 transition-colors lg:p-5',
          isHighlighted ? 'border-sky-500' : 'border-neutral-500/40',
        )}
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faTableCellsLarge} className="text-sky-500" size="lg" />
          <h2 className="text-lg font-semibold text-white">Home screen widget</h2>
        </div>

        <p className="text-sm text-neutral-400">
          See your lists on your home screen. Connecting lets the widget read your watchlist and mark titles watched.
          {isConnected && ' Connected.'}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onConnect} disabled={isConnecting}>
            <FontAwesomeIcon icon={isConnecting ? faSpinner : faTableCellsLarge} spin={isConnecting} />
            <span>{isConnected ? 'Reconnect widget' : 'Connect widget'}</span>
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
      </div>
    </section>
  )
}
