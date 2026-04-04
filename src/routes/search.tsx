import { UrlParams } from '#/type/url'
import { createFileRoute, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/search')({
  component: RouteComponent,
  validateSearch: UrlParams,
})

function RouteComponent() {
  const { query } = useSearch({ from: '/search' })

  return (
    <div className="screen-py flex w-full flex-col items-center justify-center gap-2 text-white">
      {query && <p>{decodeURIComponent(query)}</p>}
    </div>
  )
}
