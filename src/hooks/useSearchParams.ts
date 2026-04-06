import type { UrlParams } from '#/type/url'
import { useLocation } from '@tanstack/react-router'

const useSearchParams = <T extends Record<string, any> = {}>() => {
  const location = useLocation()

  const query = location.search.query ? decodeURIComponent(location.search.query) : undefined
  const media = location.search.media || 'tv'

  return { ...location.search, query, media } as UrlParams & T
}

export default useSearchParams
