import { api } from '#/../convex/_generated/api'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import { Button } from '#/component/ui/button'
import { useMediaType } from '#/hooks/useMediaType'
import { UrlParams } from '#/type/url'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute, useNavigate, useRouter, useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/search')({
  component: RouteComponent,
  validateSearch: UrlParams,
})

function RouteComponent() {
  const router = useRouter()
  const navigate = useNavigate()
  const search = useSearch({ from: '/search' })

  const [mediaType] = useMediaType()

  return (
    <div className="screen-py screen-px relative flex w-full flex-col gap-8">
      <header className="page-width flex w-full items-center gap-4">
        <Button
          variant="frost"
          size="icon"
          onClick={() => {
            navigate({ to: '.', replace: true, search: { media: search.media } })
            router.history.back()
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} size="lg" />
        </Button>

        <h1 className="text-3xl leading-8 font-extrabold tracking-tight text-white md:text-4xl">
          {search.query ? `Results for '${decodeURIComponent(search.query)}'` : 'Search'}
        </h1>
      </header>

      <div className="page-width relative w-full">
        {search.query && (
          <InfiniteMediaList
            action={mediaType === 'tv' ? api.tmdb.searchTv : api.tmdb.searchMovies}
            actionKey={mediaType === 'tv' ? 'searchTv' : 'searchMovies'}
            params={{ query: search.query }}
            mediaType={mediaType}
          />
        )}

        {!search.query && (
          <div className="flex w-full flex-col items-center justify-center py-12 text-center">
            <p className="font-semibold tracking-wide text-neutral-500">
              Enter a search term to find movies and TV shows
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
