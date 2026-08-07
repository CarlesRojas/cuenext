import { DETAIL_APPEND, fetchMovieExtras, fetchShowExtras } from '#/lib/tmdb'
import { TMDB_STALE_TIME, tmdbQuery } from '#/lib/tmdbQuery'
import type { MediaType } from '#/type/media'
import { useQuery } from '@tanstack/react-query'

// Same params the request itself sends, so the key and the response cannot drift apart.
const DETAIL_PARAMS = { append_to_response: DETAIL_APPEND }

export function movieExtrasQuery(tmdbId: number) {
  return tmdbQuery(`/movie/${tmdbId}`, DETAIL_PARAMS, () => fetchMovieExtras(tmdbId), TMDB_STALE_TIME.ONE_DAY)
}

export function showExtrasQuery(tmdbId: number) {
  return tmdbQuery(`/tv/${tmdbId}`, DETAIL_PARAMS, () => fetchShowExtras(tmdbId), TMDB_STALE_TIME.ONE_DAY)
}

// One bundled TMDB request (details + credits + videos + reviews + recommendations +
// watch providers) serves the whole detail page. Every component that calls this hook
// shares the same query key, so a single request is made per page view.
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
