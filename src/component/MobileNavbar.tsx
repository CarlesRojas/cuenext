import { NAV_ITEMS } from '#/component/AppShell'
import { LiquidGlass } from '#/component/LiquidGlass'
import { MediaTypeSelector } from '#/component/MediaTypeSelector'
import { Search } from '#/component/Search'
import { Button } from '#/component/ui/button'
import { User } from '#/component/User'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useDebounceCallback, useResizeObserver } from 'usehooks-ts'

interface Props {
  showHeader: boolean
  fullHeight: number
  visualHeight: number
}

type Size = {
  width?: number
  height?: number
}

const MobileNavbar = ({ showHeader, fullHeight, visualHeight }: Props) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const navigate = useNavigate()
  const location = useLocation()

  const hideMediaTypeSelector = location.pathname.startsWith('/media')

  const mobileTabsRef = useRef<HTMLDivElement>(null)
  const [{ width: mobileTabsWidth }, setSize] = useState<Size>({ width: undefined })

  const onResize = useDebounceCallback(setSize, 200)

  useResizeObserver({
    ref: mobileTabsRef as RefObject<HTMLElement>,
    box: 'content-box',
    onResize,
  })

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (location.pathname !== '/search') setIsExpanded(false)
  }, [location.pathname])

  return (
    <>
      <div
        className={cn(
          'fixed top-3 right-3 left-3 z-50 flex h-fit items-center justify-between gap-3 overflow-hidden opacity-100 transition-opacity',
          !showHeader && 'pointer-events-none! opacity-0',
          hideMediaTypeSelector && 'left-[unset] w-fit justify-end',
        )}
      >
        {!hideMediaTypeSelector && <MediaTypeSelector isMobile />}
        <User isMobile />
      </div>

      <div
        ref={mobileTabsRef}
        className="fixed right-0 bottom-0 left-0 z-50 flex gap-2 px-3 pb-3 md:hidden"
        style={{ bottom: fullHeight - visualHeight }}
      >
        <LiquidGlass
          className={cn('relative w-fit rounded-full bg-neutral-800/40', mobileTabsWidth === undefined && 'w-full')}
        >
          <div
            className={cn(
              'relative flex items-center justify-center transition-[width] duration-300 ease-in-out',
              isExpanded ? 'w-15' : '',
              mobileTabsWidth === undefined && 'grow',
            )}
            style={isExpanded ? undefined : { width: (mobileTabsWidth ?? 0) - 68 }}
          >
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                search={searchParams}
                activeProps={{ className: 'text-sky-500' }}
                inactiveProps={{ className: 'text-white hover:bg-neutral-400/10' }}
                className={cn(
                  'relative my-1.5 flex h-fit w-1/4 flex-col items-center gap-1 rounded-full p-1.5 transition-opacity duration-300 ease-in-out first:ml-1.5 last-of-type:mr-1.5',
                  isExpanded && 'pointer-events-none opacity-0',
                )}
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
                    <span className="z-60 line-clamp-1 text-[9px] leading-2 font-bold">{item.label}</span>
                  </>
                )}
              </Link>
            ))}

            <div className="pointer-events-none absolute inset-0 size-15 max-h-15 min-h-15 max-w-15 min-w-15">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsExpanded(false)

                  if (location.pathname === '/search') {
                    navigate({ to: '.', replace: true, search: { media: searchParams.media } })
                    router.history.back()
                  }
                }}
                className={cn(
                  'm-1.5 size-12 max-h-12 min-h-12 max-w-12 min-w-12 opacity-0 transition-opacity duration-300 ease-in-out',
                  isExpanded && 'pointer-events-auto opacity-100',
                )}
              >
                <FontAwesomeIcon icon={faArrowLeft} size="lg" />
              </Button>
            </div>
          </div>
        </LiquidGlass>

        <Search isMobile mobileTabsWidth={mobileTabsWidth} isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      </div>
    </>
  )
}

export default MobileNavbar
