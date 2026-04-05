import { api } from '#/../convex/_generated/api'
import FollowEpisode from '#/component/FollowEpisode'
import FollowMovie from '#/component/FollowMovie'
import { InfiniteMediaList } from '#/component/InfiniteMediaList'
import RowCard from '#/component/RowCard'
import { Button } from '#/component/ui/button'
import { useMediaType } from '#/hooks/useMediaType'
import { cn } from '#/lib/cn'
import type { TmdbMovieMinimal, TmdbTvMinimal } from '#/type/tmdb'
import { UrlParams } from '#/type/url'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { createFileRoute, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useWindowSize } from 'usehooks-ts'

export const Route = createFileRoute('/search')({
  component: RouteComponent,
  validateSearch: UrlParams,
})

function EpisodeWrapper(props: TmdbTvMinimal) {
  return <FollowEpisode episode={props} variant="row" followButtonText="Follow" />
}

function MovieWrapper(props: TmdbMovieMinimal) {
  return <FollowMovie movie={props} variant="row" followButtonText="Follow" />
}

function RouteComponent() {
  const router = useRouter()
  const navigate = useNavigate()
  const search = useSearch({ from: '/search' })

  const { width = 0 } = useWindowSize()
  const isMobile = width < 768

  const [mediaType] = useMediaType()

  return (
    <div className="screen-py relative flex w-full flex-col pt-0!">
      <header
        className={cn('screen-px screen-py sticky top-0 z-20 w-full pb-8 backdrop-blur-md', isMobile && '-top-14')}
        style={{
          maskImage: isMobile
            ? 'linear-gradient(to bottom, black 80%, transparent)'
            : 'linear-gradient(to bottom, black 70%, transparent)',
        }}
      >
        <div className="page-width relative flex w-full items-baseline gap-4">
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

          <h1 className="line-clamp-2 text-3xl leading-8 font-extrabold tracking-tight text-white md:text-4xl">
            {search.query ? `Results for '${decodeURIComponent(search.query)}'` : 'Search'}
          </h1>
        </div>
      </header>

      <div className="screen-px relative w-full">
        <div className="page-width relative w-full">
          {search.query && mediaType === 'tv' && (
            <InfiniteMediaList
              action={api.tmdb.searchTv}
              actionKey={'searchTv'}
              params={{ query: search.query }}
              Component={EpisodeWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {search.query && mediaType === 'movie' && (
            <InfiniteMediaList
              action={api.tmdb.searchMovies}
              actionKey={'searchMovies'}
              params={{ query: search.query }}
              Component={MovieWrapper}
              LoadingComponent={<RowCard isLoading />}
            />
          )}

          {!search.query && (
            <p className="pointer-events-none mb-4 font-semibold tracking-wide text-neutral-500">
              Enter a search term to find movies and TV shows
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
