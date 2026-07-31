import { cn } from '#/lib/cn'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StarRatingProps {
  voteAverage?: number
  voteCount?: number
  className?: string
  showOutOfTen?: boolean
}

export function StarRating({ voteAverage, voteCount, showOutOfTen, className = '' }: StarRatingProps) {
  if (!voteAverage) return null

  return (
    <div className={cn('mt-1.5 flex items-center gap-1.5', className)}>
      <FontAwesomeIcon className="size-4.5 max-h-4.5 min-h-4.5 max-w-4.5 min-w-4.5 text-sky-500" icon={faStar} />

      <div className="flex items-baseline gap-1">
        <span className="mt-0.5 items-baseline text-lg leading-4 font-extrabold tracking-wide text-nowrap text-sky-500">
          {voteAverage.toLocaleString(undefined, { notation: 'compact' })}
        </span>

        {showOutOfTen && <span className="text-xs leading-3 text-nowrap text-white opacity-40">/ 10</span>}

        {voteCount && (
          <span className="ml-1 text-sm leading-3 font-medium tracking-wide text-nowrap opacity-40">
            {voteCount.toLocaleString(undefined, { notation: 'compact' })}
          </span>
        )}
      </div>
    </div>
  )
}
