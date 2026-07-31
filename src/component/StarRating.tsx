import { cn } from '#/lib/cn'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StarRatingProps {
  voteAverage?: number
  voteCount?: number
  className?: string
  showOutOfTen?: boolean
  // Detail pages show the TMDB score and the CueNext community score next to each other, so
  // each one carries its own accent colour and source label.
  variant?: 'default' | 'community'
  label?: string
}

export function StarRating({
  voteAverage,
  voteCount,
  showOutOfTen,
  variant = 'default',
  label,
  className = '',
}: StarRatingProps) {
  if (!voteAverage) return null

  const accent = variant === 'community' ? 'text-amber-400' : 'text-sky-500'

  return (
    <div className={cn('mt-1.5 flex items-center gap-1.5', className)}>
      <FontAwesomeIcon className={cn('size-4.5 max-h-4.5 min-h-4.5 max-w-4.5 min-w-4.5', accent)} icon={faStar} />

      <div className="flex items-baseline gap-1">
        <span
          className={cn('mt-0.5 items-baseline text-lg leading-4 font-extrabold tracking-wide text-nowrap', accent)}
        >
          {voteAverage.toLocaleString(undefined, { notation: 'compact' })}
        </span>

        {showOutOfTen && <span className="text-xs leading-3 text-nowrap text-white opacity-40">/ 10</span>}

        {voteCount && (
          <span className="ml-1 text-sm leading-3 font-medium tracking-wide text-nowrap opacity-40">
            {voteCount.toLocaleString(undefined, { notation: 'compact' })}
          </span>
        )}

        {label && (
          <span className="ml-1 text-xs leading-3 font-medium tracking-wide text-nowrap uppercase opacity-30">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
