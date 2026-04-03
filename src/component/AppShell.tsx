import { LiquidGlass } from '#/component/LiquidGlass'
import { cn } from '#/lib/cn'
import { SignInButton, UserButton } from '@clerk/tanstack-react-start'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCalendarDays, faCirclePlay, faCompass, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { ClientOnly, Link, useRouterState } from '@tanstack/react-router'
import { Authenticated, Unauthenticated } from 'convex/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useWindowSize } from 'usehooks-ts'

type NavItem = {
  to: NonNullable<LinkProps['to']>
  label: string
  icon: IconDefinition
}

const NAV_ITEMS: NavItem[] = [
  { to: '/watchlist', label: 'Watchlist', icon: faCirclePlay },
  { to: '/upcoming', label: 'Upcoming', icon: faCalendarDays },
  { to: '/explore', label: 'Explore', icon: faCompass },
  { to: '/profile', label: 'Profile', icon: faUser },
]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const routerState = useRouterState()

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  return (
    <ClientOnly>
      {!isMobile && (
        <aside className="fixed top-0 bottom-0 left-0 z-50 hidden w-64 p-3 md:block">
          <LiquidGlass
            blur={3}
            className="relative h-full min-w-64 rounded-3xl bg-neutral-800/40"
            wrapperClassName="flex-col justify-between items-start p-4 "
          >
            <nav className="mt-10 flex w-full flex-col gap-2">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{ className: 'text-sky-500' }}
                  inactiveProps={{ className: 'text-white' }}
                  className="relative flex h-fit w-full items-center gap-3 p-2.5 transition-colors"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute inset-0 z-50 rounded-full bg-neutral-400/30"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      <FontAwesomeIcon icon={item.icon} size="xl" className="z-60 h-6 max-h-6 min-h-6" />
                      <span className="z-60 leading-2 font-semibold">{item.label}</span>
                    </>
                  )}
                </Link>
              ))}
            </nav>

            <div>
              <Authenticated>
                <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10' } }} />
              </Authenticated>

              <Unauthenticated>
                <SignInButton />
              </Unauthenticated>
            </div>
          </LiquidGlass>
        </aside>
      )}

      <main className="full-page relative flex overflow-y-auto">
        <div
          className={cn(
            'h-fit w-full',
            isMobile && 'pb-[calc(60px+2*max(env(safe-area-inset-bottom),0.75rem))]',
            !isMobile && 'pl-[calc(16rem+0.75rem+2rem)]',
          )}
        >
          {children}
        </div>
      </main>

      {isMobile && (
        <>
          <header className="fixed top-0 right-0 z-50 m-3 size-16">
            <Authenticated>
              <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10' } }} />
            </Authenticated>

            <Unauthenticated>
              <SignInButton />
            </Unauthenticated>
          </header>

          <div className="fixed right-0 bottom-0 left-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
            <LiquidGlass blur={3} className="relative w-full rounded-full bg-neutral-800/40">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{ className: 'text-sky-500' }}
                  inactiveProps={{ className: 'text-white' }}
                  className="relative m-1.5 flex h-fit w-1/4 flex-col items-center gap-1 p-1.5 transition-colors"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute inset-0 z-50 rounded-full bg-neutral-400/30"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      <FontAwesomeIcon icon={item.icon} size="xl" className="z-60 h-6 max-h-6 min-h-6" />
                      <span className="z-60 text-[9px] leading-2 font-bold">{item.label}</span>
                    </>
                  )}
                </Link>
              ))}
            </LiquidGlass>
          </div>
        </>
      )}
    </ClientOnly>
  )
}
