import { LiquidGlass } from '#/component/LiquidGlass'
import { Button } from '#/component/ui/button'
import { useMediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import { faClapperboard, faTv } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion } from 'motion/react'

interface MediaTypeSelectorProps {
  isMobile?: boolean
}

export function MediaTypeSelector({ isMobile = false }: MediaTypeSelectorProps) {
  const [mediaType, setMediaType] = useMediaType()

  return (
    <LiquidGlass blur={3} className={cn('relative w-fit rounded-full bg-neutral-800/40', !isMobile && 'w-full')}>
      <div
        className={cn(
          'flex h-11 max-h-11 min-h-11 w-fit flex-row items-center rounded-full border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-md',
          !isMobile && 'w-full',
        )}
      >
        <Button
          variant="ghost"
          size="small"
          onClick={() => setMediaType('tv')}
          className={cn(mediaType === 'tv' && 'text-sky-500!', !isMobile && 'w-[calc(50%-0.5rem)]')}
        >
          <motion.div
            layoutId="media-indicator"
            className="pointer-events-none absolute inset-0 z-50 rounded-full bg-neutral-400/30"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          <FontAwesomeIcon icon={faTv} size="xl" className="z-60 -mx-1 h-4 max-h-4 min-h-4" />
          <span className="z-60">Shows</span>
        </Button>

        <Button
          variant="ghost"
          size="small"
          onClick={() => setMediaType('movie')}
          className={cn(mediaType === 'movie' && 'text-sky-500!', !isMobile && 'w-[calc(50%-0.5rem)]')}
        >
          {mediaType === 'movie' && (
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
