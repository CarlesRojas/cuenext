import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import useSearchParams from '#/hooks/useSearchParams'
import { cn } from '#/lib/cn'
import { faClapperboard, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'

interface MediaTypeSelectorProps {
  isMobile?: boolean
}

export function MediaTypeSelector({ isMobile = false }: MediaTypeSelectorProps) {
  const { media, ...params } = useSearchParams()
  const navigate = useNavigate()

  return (
    <LiquidGlass
      className={cn(
        'relative w-fit rounded-full bg-neutral-800/40 transition-opacity duration-300',
        !isMobile && 'w-full',
      )}
    >
      <div
        className={cn(
          'flex h-11 max-h-11 min-h-11 w-fit flex-row items-center rounded-full border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-md',
          !isMobile && 'w-full',
        )}
      >
        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate({ to: '.', replace: true, search: { media: 'tv', ...params } })}
          className={cn(media === 'tv' && 'text-sky-500!', !isMobile && 'w-[calc(50%-0.5rem)]')}
        >
          {media === 'tv' && (
            <motion.div
              layoutId="media-indicator"
              className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <FontAwesomeIcon icon={faTv} size="xl" className="z-60 -mx-1 h-4 max-h-4 min-h-4" />
          <span className="z-60">Shows</span>
        </Button>

        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate({ to: '.', replace: true, search: { media: 'movie', ...params } })}
          className={cn(media === 'movie' && 'text-sky-500!', !isMobile && 'w-[calc(50%-0.5rem)]')}
        >
          {media === 'movie' && (
            <motion.div
              layoutId="media-indicator"
              className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <FontAwesomeIcon icon={faClapperboard} size="xl" className="z-60 -mx-1 h-4 max-h-4 min-h-4" />
          <span className="z-60">Movies</span>
        </Button>
      </div>
    </LiquidGlass>
  )
}
