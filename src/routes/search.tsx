import { Button } from '#/component/ui/button'
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

  return (
    <div className="screen-py flex w-full flex-col gap-2">
      <header className="screen-px mb-8 flex gap-4">
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

        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {search.query ? `Search for '${decodeURIComponent(search.query)}'` : 'Search'}
        </h1>
      </header>
    </div>
  )
}
