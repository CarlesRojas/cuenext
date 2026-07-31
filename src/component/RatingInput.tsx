import { cn } from '#/lib/cn'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

interface RatingInputProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  className?: string
}

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Ratings are whole numbers from 1 to 10, the same scale the TMDB score is shown on.
// Picking the star that is already selected clears the rating again.
export function RatingInput({ value, onChange, disabled = false, className }: RatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? value

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-0.5" onPointerLeave={() => setHovered(null)}>
        {RATINGS.map(rating => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            aria-label={`${rating} out of 10`}
            aria-pressed={value === rating}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-30"
            onPointerEnter={() => setHovered(rating)}
            onFocus={() => setHovered(rating)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(value === rating ? null : rating)}
          >
            <FontAwesomeIcon
              icon={faStar}
              className={cn(
                'size-5 max-h-5 min-h-5 w-5 max-w-5 min-w-5 transition-colors',
                shown !== null && rating <= shown ? 'text-sky-500' : 'text-white/20',
              )}
            />
          </button>
        ))}
      </div>

      <p className="text-sm font-medium tracking-wide text-white/50">
        {shown !== null ? `${shown} / 10` : 'Tap a star to rate'}
      </p>
    </div>
  )
}
