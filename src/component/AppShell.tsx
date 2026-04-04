import { LiquidGlass } from '#/component/LiquidGlass'
import { MediaTypeSelector } from '#/component/MediaTypeSelector'
import MobileNavbar from '#/component/MobileNavbar'
import { Search } from '#/component/Search'
import { User } from '#/component/User'
import { useViewportHeight } from '#/hooks/useViewportHeight'
import { cn } from '#/lib/cn'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCalendarDays, faCirclePlay, faCompass, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { ClientOnly, Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { useEventListener, useWindowSize } from 'usehooks-ts'

type NavItem = {
  to: NonNullable<LinkProps['to']>
  label: string
  icon: IconDefinition
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Watchlist', icon: faCirclePlay },
  { to: '/upcoming', label: 'Upcoming', icon: faCalendarDays },
  { to: '/explore', label: 'Explore', icon: faCompass },
  { to: '/profile', label: 'Profile', icon: faUser },
]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { visualHeight, fullHeight } = useViewportHeight()
  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const scrollContainer = useRef<HTMLDivElement>(null)
  const [showHeader, setShowHeader] = useState(true)

  const onScroll = () => {
    setShowHeader(!scrollContainer.current || scrollContainer.current.scrollTop < 20)
  }

  useEventListener('scroll', onScroll)

  return (
    <ClientOnly>
      {!isMobile && (
        <aside
          className="fixed top-0 left-0 z-50 hidden w-72 max-w-72 min-w-72 overflow-hidden p-3 md:block"
          style={{ height: visualHeight }}
        >
          <LiquidGlass className="relative h-full w-full rounded-3xl bg-neutral-800/40">
            <div className="flex h-full w-full flex-col items-start justify-between gap-8 overflow-hidden overflow-y-auto p-4">
              <div className="relative mt-10 flex w-full flex-col gap-8">
                <Search />

                <nav className="flex w-full flex-col gap-2">
                  {NAV_ITEMS.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeProps={{ className: 'text-sky-500' }}
                      inactiveProps={{ className: 'text-white hover:bg-neutral-400/10' }}
                      className="relative flex h-fit w-full items-center gap-3 rounded-full p-2.5 transition-colors"
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div
                              layoutId="nav-indicator"
                              className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}

                          <FontAwesomeIcon icon={item.icon} size="xl" className="z-60 h-6 max-h-6 min-h-6" />
                          <span className="z-60 font-semibold">{item.label}</span>
                        </>
                      )}
                    </Link>
                  ))}
                </nav>

                <div className="h-px max-h-px min-h-px w-full bg-neutral-500/50" />
                <MediaTypeSelector />
              </div>

              <User />
            </div>
          </LiquidGlass>
        </aside>
      )}

      <main
        className="relative flex size-full max-h-full min-h-full max-w-full min-w-full overflow-y-auto"
        onScroll={onScroll}
        ref={scrollContainer}
      >
        <div className={cn('h-fit w-full', isMobile && 'pb-21')}>{children}</div>
      </main>

      {isMobile && <MobileNavbar showHeader={showHeader} visualHeight={visualHeight} fullHeight={fullHeight} />}
    </ClientOnly>
  )
}
