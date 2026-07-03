import { api } from '#/../convex/_generated/api'
import { TMDB_STALE_TIME, tmdbStale } from '#/lib/tmdbQuery'
import type { MediaType } from '#/type/media'
import { convexAction } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'

export function movieExtrasQuery(tmdbId: number) {
  return {
    ...convexAction(api.tmdb.getMovieExtras, { tmdbId }),
    ...tmdbStale(TMDB_STALE_TIME.ONE_DAY),
  }
}

export function showExtrasQuery(tmdbId: number) {
  return {
    ...convexAction(api.tmdb.getShowExtras, { tmdbId }),
    ...tmdbStale(TMDB_STALE_TIME.ONE_DAY),
  }
}

// One bundled TMDB request (details + credits + videos + reviews + recommendations +
// watch providers) serves the whole detail page. Every component that calls this hook
// shares the same query key, so a single action call is made per page view.
export function useMediaExtras(media: MediaType, tmdbId: number) {
  const movie = useQuery({
    ...movieExtrasQuery(tmdbId),
    enabled: media === 'movie' && !!tmdbId,
  })

  const show = useQuery({
    ...showExtrasQuery(tmdbId),
    enabled: media === 'tv' && !!tmdbId,
  })

  return { movie, show }
}
