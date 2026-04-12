import { TMDB_AUTH_ERROR, TMDB_AUTH_SUCCESS } from '#/constant'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import z from 'zod'

export const Route = createFileRoute('/tmdb-callback')({
  component: TmdbCallback,
  validateSearch: z.object({
    approved: z.boolean().optional(),
    denied: z.boolean().optional(),
    request_token: z.string().optional(),
  }),
})

function TmdbCallback() {
  const { approved, denied, request_token: requestToken } = useSearch({ from: Route.id })

  useEffect(() => {
    const isApproved = !!approved && !!requestToken

    if (window.opener) {
      window.opener.postMessage(
        {
          type: isApproved ? TMDB_AUTH_SUCCESS : TMDB_AUTH_ERROR,
          message: isApproved ? '' : 'Authentication was cancelled or failed',
        },
        window.location.origin,
      )
      window.close()
    } else window.location.href = `/${isApproved ? '' : '?tmdb_error=auth_failed'}`
  }, [approved, denied, requestToken])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <FontAwesomeIcon icon={faSpinner} spin size="2x" />
    </div>
  )
}
