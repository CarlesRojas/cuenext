import { StarRating } from '#/component/StarRating'
import { combineRatings, useTitleReviews } from '#/hooks/useTitleReviews'
import type { MediaType } from '#/type/media'

interface CombinedRatingProps {
  type: MediaType
  tmdbId: number
  tmdbAverage?: number
  tmdbCount?: number
  className?: string
}

// One score for a title: the TMDB votes and the CueNext ratings pooled together, so rating
// something here moves the number shown on its page and adds to the vote count.
export function CombinedRating({ type, tmdbId, tmdbAverage, tmdbCount, className }: CombinedRatingProps) {
  const { ratingSum, ratingCount } = useTitleReviews(type, tmdbId)

  const { voteAverage, voteCount } = combineRatings(tmdbAverage, tmdbCount, ratingSum, ratingCount)

  return <StarRating voteAverage={Math.round(voteAverage * 10) / 10} voteCount={voteCount} className={className} />
}
