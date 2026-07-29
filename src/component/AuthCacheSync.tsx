import { LAST_USER_ID_STORAGE_KEY, QUERY_CACHE_STORAGE_KEY } from '#/lib/queryCache'
import { useAuth } from '@clerk/tanstack-react-start'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function AuthCacheSync() {
  const { isLoaded, userId } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isLoaded) return

    const previousUserId = window.localStorage.getItem(LAST_USER_ID_STORAGE_KEY)

    if (previousUserId && previousUserId !== userId) {
      window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY)
      queryClient.clear()
    }

    if (userId) window.localStorage.setItem(LAST_USER_ID_STORAGE_KEY, userId)
    else window.localStorage.removeItem(LAST_USER_ID_STORAGE_KEY)
  }, [isLoaded, userId, queryClient])

  return null
}
