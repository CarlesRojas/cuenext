import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { faClapperboard, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'

interface MediaTypeSelectorProps {
  isMobile?: boolean
  isExpanded?: boolean
}

export function MediaTypeSelector({ isMobile = false, isExpanded = false }: MediaTypeSelectorProps) {
  const location = useLocation()
  const { media, ...params } = useSearchParams()
  const navigate = useNavigate()

  const hide = location.pathname.startsWith('/media')

  return (
    <LiquidGlass
      className={cn(
        'relative w-fit rounded-full bg-neutral-800/40 transition-opacity duration-300',
        !isMobile && 'w-full rounded-[22px]',
        hide && 'pointer-events-none opacity-0',
      )}
    >
      <div
        className={cn(
          'box-content flex h-11 max-h-11 min-h-11 w-fit flex-row items-center rounded-full border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-md',
          !isMobile && 'h-21 max-h-21 min-h-21 w-full flex-col rounded-[22px]',
        )}
      >
        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate({ to: '.', replace: true, search: { media: 'tv', ...params } })}
          className={cn(
            'justify-start gap-0 md:px-2.5',
            media === 'tv' && 'text-sky-500!',
            !isMobile && 'w-[calc(100%-0.5rem)]',
          )}
        >
          {media === 'tv' && (
            <motion.div
              layoutId="media-indicator"
              className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <FontAwesomeIcon icon={faTv} size="xl" className="z-60 h-4 max-h-4 min-h-4 w-4 max-w-4 min-w-4" />

          <span
            className={cn(
              'duration-slow z-60 max-w-full overflow-hidden pl-3 text-nowrap opacity-100 transition-[max-width,opacity]',
              !isExpanded && !isMobile && 'max-w-0 opacity-0',
            )}
          >
            Shows
          </span>
        </Button>

        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate({ to: '.', replace: true, search: { media: 'movie', ...params } })}
          className={cn(
            'justify-start gap-0 md:mt-0! md:px-2.5',
            media === 'movie' && 'text-sky-500!',
            !isMobile && 'w-[calc(100%-0.5rem)]',
          )}
        >
          {media === 'movie' && (
            <motion.div
              layoutId="media-indicator"
              className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <FontAwesomeIcon icon={faClapperboard} size="xl" className="z-60 h-4 max-h-4 min-h-4 w-4 max-w-4 min-w-4" />

          <span
            className={cn(
              'duration-slow z-60 max-w-full overflow-hidden pl-3 text-nowrap opacity-100 transition-[max-width,opacity]',
              !isExpanded && !isMobile && 'max-w-0 opacity-0',
            )}
          >
            Movies
          </span>
        </Button>
      </div>
    </LiquidGlass>
  )
}
