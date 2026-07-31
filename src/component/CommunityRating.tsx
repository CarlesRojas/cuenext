import { StarRating } from '#/component/StarRating'
import { useTitleReviews } from '#/hooks/useTitleReviews'
import type { MediaType } from '#/type/media'

interface CommunityRatingProps {
  type: MediaType
  tmdbId: number
  className?: string
}

// The average of the CueNext ratings for a title, shown next to the TMDB score. Hidden
// until somebody has rated, so an unrated title does not read as a zero.
export function CommunityRating({ type, tmdbId, className }: CommunityRatingProps) {
  const { average, ratingCount } = useTitleReviews(type, tmdbId)

  if (average === null || ratingCount === 0) return null

  return (
    <StarRating
      voteAverage={Math.round(average * 10) / 10}
      voteCount={ratingCount}
      showOutOfTen
      variant="community"
      label="CueNext"
      className={className}
    />
  )
}
