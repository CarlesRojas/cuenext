import { LiquidGlass } from '#/component/LiquidGlass'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCalendarDays, faCirclePlay, faCompass, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LinkProps } from '@tanstack/react-router'
import { ClientOnly, Link, useRouterState } from '@tanstack/react-router'
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
        <aside className="z-50 hidden w-64 border-r border-neutral-200 md:block dark:border-neutral-800">
          <LiquidGlass blur={2} className="flex h-full w-full flex-col">
            <div className="p-6">
              <h1 className="text-xl font-bold tracking-tight">CueNext</h1>
            </div>

            <nav className="space-y-2 px-4">
              {NAV_ITEMS.map(item => {
                const isActive =
                  routerState.location.pathname === item.to ||
                  (item.to !== '/' && routerState.location.pathname.startsWith(item.to))

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isActive
                        ? 'bg-neutral-200/80 font-medium text-black dark:bg-neutral-800 dark:text-white'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </LiquidGlass>
        </aside>
      )}

      <main className="full-page relative flex overflow-y-auto">{children}</main>

      {isMobile && (
        <div className="fixed right-0 bottom-0 left-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:hidden">
          <LiquidGlass blur={2} className="flex w-full items-center justify-between rounded-full">
            {NAV_ITEMS.map(item => {
              const isActive =
                routerState.location.pathname === item.to ||
                (item.to !== '/' && routerState.location.pathname.startsWith(item.to))

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex w-16 flex-col items-center justify-center p-2 transition-colors ${
                    isActive ? 'text-sky-500' : 'text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className={`h-6 w-6 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                  <span className="text-[8px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </LiquidGlass>
        </div>
      )}
    </ClientOnly>
  )
}
