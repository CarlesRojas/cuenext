import type { UrlParams } from '#/type/url'
import { useLocation } from '@tanstack/react-router'

const useSearchParams = <T extends Record<string, any> = {}>() => {
  const location = useLocation()
  const query = location.search.query ? decodeURIComponent(location.search.query) : undefined

  return { ...location.search, query } as UrlParams & T
}

export default useSearchParams
