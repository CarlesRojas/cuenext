import { cn } from '#/lib/cn'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface StarRatingProps {
  voteAverage?: number
  voteCount?: number
  className?: string
}

export function StarRating({ voteAverage, voteCount, className = '' }: StarRatingProps) {
  const rating = Math.min(Math.max((voteAverage ?? 0) / 2, 0), 5)

  const stars = Array.from({ length: 5 }, (_, index) => {
    const starNumber = index + 1
    const fillPercentage = Math.min(Math.max((rating - index) * 100, 0), 100)
    return { starNumber, fillPercentage }
  })

  const StarIcon = ({ fillPercentage }: { fillPercentage: number }) => (
    <div className="relative h-fit max-h-5 w-fit">
      <FontAwesomeIcon icon={faStar} className="size-5 max-h-5 min-h-5 max-w-5 min-w-5 text-gray-500/30" />

      <FontAwesomeIcon
        className="absolute inset-0 size-5 max-h-5 min-h-5 max-w-5 min-w-5 overflow-hidden text-sky-500"
        icon={faStar}
        style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
      />
    </div>
  )

  if (!voteAverage || !voteCount) return null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1">
        {stars.map(({ starNumber, fillPercentage }) => (
          <StarIcon key={starNumber} fillPercentage={fillPercentage} />
        ))}
      </div>

      <span className="text-xs leading-tight font-semibold tracking-wide opacity-50">
        {voteCount.toLocaleString(undefined, { notation: 'compact' })}
      </span>
    </div>
  )
}
