import type { MediaType } from '#/type/media'
import type { UrlParams } from '#/type/url'
import { useLocation } from '@tanstack/react-router'

const useSearchParams = <T extends Record<string, any> = {}>() => {
  const location = useLocation()

  const query =
    location.search.query && location.pathname.startsWith('/search')
      ? decodeURIComponent(location.search.query)
      : undefined

  const media = location.search.media || 'tv'

  return { ...location.search, query, media } as Omit<UrlParams, 'media'> & { media: MediaType } & T
}

export default useSearchParams
