import { cn } from '#/lib/cn'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StarRatingProps {
  voteAverage?: number
  voteCount?: number
  className?: string
}

export function StarRating({ voteAverage, voteCount, className = '' }: StarRatingProps) {
  if (!voteAverage || !voteCount) return null

  return (
    <div className={cn('mt-1.5 flex items-center gap-1.5', className)}>
      <FontAwesomeIcon className="size-4.5 max-h-4.5 min-h-4.5 max-w-4.5 min-w-4.5 text-sky-500" icon={faStar} />

      <div className="flex items-baseline gap-2">
        <span className="text-lg leading-4 font-extrabold tracking-wide text-sky-500">
          {voteAverage.toLocaleString(undefined, { notation: 'compact' })}
        </span>

        <span className="text-sm leading-3 font-medium tracking-wide opacity-40">
          {voteCount.toLocaleString(undefined, { notation: 'compact' })}
        </span>
      </div>
    </div>
  )
}
