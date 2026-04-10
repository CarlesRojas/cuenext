import { LiquidGlass } from '#/component/LiquidGlass'
import { MediaTypeSelector } from '#/component/MediaTypeSelector'
import MobileNavbar from '#/component/MobileNavbar'
import { Search } from '#/component/Search'
import { Button } from '#/component/ui/button'
import { User } from '#/component/User'
import useSearchParams from '#/hooks/useSearchParams'
import { useViewportHeight } from '#/hooks/useViewportHeight'
import { cn } from '#/lib/cn'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCalendarDays, faCirclePlay, faCompass, faSquareCaretLeft, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { ClientOnly, Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useWindowSize } from 'usehooks-ts'

type NavItem = {
  to: NonNullable<LinkProps['to']>
  label: string
  icon: IconDefinition
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Watchlist', icon: faCirclePlay },
  { to: '/upcoming', label: 'Upcoming', icon: faCalendarDays },
  { to: '/discover', label: 'Discover', icon: faCompass },
  { to: '/profile', label: 'Profile', icon: faUser },
]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const searchParams = useSearchParams()
  const location = useLocation()

  const { visualHeight, fullHeight } = useViewportHeight()
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const scrollContainer = useRef<HTMLDivElement>(null)
  const [showHeader, setShowHeader] = useState(true)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const onScroll = () => {
    setShowHeader(!scrollContainer.current || scrollContainer.current.scrollTop < 20)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (sidebarExpanded) document.documentElement.removeAttribute('data-sidebar-collapsed')
    else document.documentElement.setAttribute('data-sidebar-collapsed', '')
  }, [sidebarExpanded])

  return (
    <ClientOnly>
      {!isMobile && (
        <aside
          className={cn(
            'duration-slow fixed top-0 left-0 z-50 hidden overflow-hidden p-3 transition-all ease-in-out md:block',
            sidebarExpanded ? 'w-72 max-w-72 min-w-72' : 'w-23 max-w-23 min-w-23',
          )}
          style={{ height: visualHeight }}
        >
          <LiquidGlass
            className={cn(
              'duration-slow relative h-full w-full bg-neutral-800/40 transition-[border-radius]',
              sidebarExpanded ? 'rounded-3xl' : 'rounded-4xl',
            )}
          >
            <div className="scroll-container flex h-full w-full flex-col items-start justify-between gap-8 p-3">
              <div className="relative flex w-full flex-col gap-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className="self-end"
                >
                  <FontAwesomeIcon
                    icon={faSquareCaretLeft}
                    size="xl"
                    className={cn(
                      'duration-slow size-4 opacity-70 transition-transform',
                      !sidebarExpanded && 'rotate-180',
                    )}
                  />
                </Button>

                <Search isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />

                <nav className="relative flex w-full flex-col gap-2">
                  {NAV_ITEMS.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      search={searchParams}
                      className={cn(
                        'duration-slow relative flex h-fit w-full rounded-[22px] p-2.5 transition-[color,width]',
                        location.pathname === item.to && 'text-sky-500!',
                        location.pathname !== item.to && 'text-white! hover:bg-neutral-400/10!',
                      )}
                    >
                      <FontAwesomeIcon
                        icon={item.icon}
                        size="xl"
                        className="z-60 h-6 max-h-6 min-h-6 w-6 max-w-6 min-w-6"
                      />

                      <span
                        className={cn(
                          'z-60 max-w-full overflow-hidden pl-3 font-semibold text-nowrap opacity-100',
                          !sidebarExpanded && 'duration-slow max-w-0 opacity-0 transition-[max-width,opacity]',
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  ))}

                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 top-0 z-50 h-11 w-full rounded-[22px] bg-neutral-400/30 transition-[top]',
                      location.pathname === '/' && 'top-0',
                      location.pathname === '/upcoming' && 'top-13',
                      location.pathname === '/discover' && 'top-26',
                      location.pathname === '/profile' && 'top-39',
                    )}
                  />
                </nav>

                <div className="h-px max-h-px min-h-px w-full bg-neutral-500/50" />

                <MediaTypeSelector isExpanded={sidebarExpanded} />
              </div>

              <User isExpanded={sidebarExpanded} />
            </div>
          </LiquidGlass>
        </aside>
      )}

      <main
        className="scroll-container relative flex size-full max-h-full min-h-full max-w-full min-w-full overflow-x-hidden"
        onScroll={onScroll}
        ref={scrollContainer}
        id="scroll-container"
      >
        <div className={cn('h-fit w-full', isMobile && 'pb-21')}>{children}</div>
      </main>

      {isMobile && <MobileNavbar showHeader={showHeader} visualHeight={visualHeight} fullHeight={fullHeight} />}
    </ClientOnly>
  )
}
